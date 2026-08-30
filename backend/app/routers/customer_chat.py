import uuid
from decimal import Decimal
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.customer_auth import get_current_customer
from app.models.customer import Customer
from app.models.merchant import Merchant
from app.models.catalog import CatalogItem
from app.agents.graph import run_agent_workflow

router = APIRouter(prefix="/customer", tags=["Customer Chat AI"])

class CustomerChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Natural language prompt from consumer")
    thread_id: Optional[str] = Field(None, description="Optional thread/session ID for multi-turn context")

class ProductOptionCard(BaseModel):
    option_index: int
    item_id: str
    item_name: str
    merchant_id: str
    merchant_name: str
    price: float
    stock: int
    category: str

class CustomerChatResponse(BaseModel):
    thread_id: str
    prompt: str
    proposed_tool: Optional[str] = None
    status: str
    response_message: str
    search_results: Optional[List[ProductOptionCard]] = None
    customer_auth_decision: Optional[str] = None
    policy_decision: Optional[str] = None
    transaction_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    payment_link_url: Optional[str] = None

# In-memory session store for cross-turn search options per thread
session_search_memory: Dict[str, List[Dict[str, Any]]] = {}

@router.post("/chat", response_model=CustomerChatResponse)
def customer_chat(
    req: CustomerChatRequest,
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """
    Consumer Chat AI Endpoint (Phase 14):
    Orchestrates cross-merchant discovery, multi-turn options resolution, and explicit purchase confirmation.
    """
    thread_id = req.thread_id or f"thread_cust_{uuid.uuid4().hex[:10]}"
    prompt_lower = req.prompt.lower().strip()

    cached_options = session_search_memory.get(thread_id, [])

    # Check if prompt is an explicit purchase confirmation ("buy option 1", "buy boAt", "buy the cheaper one", etc.)
    is_buy_confirm = any(k in prompt_lower for k in ["buy", "purchase", "confirm", "order"]) and not any(k in prompt_lower for k in ["find", "search", "compare", "recommend", "show options"])

    if is_buy_confirm and cached_options:
        # Resolve target option from memory
        target_opt = None
        if "option 1" in prompt_lower or "cheaper" in prompt_lower or "boat" in prompt_lower or "1st" in prompt_lower or "first" in prompt_lower:
            target_opt = cached_options[0]
        elif "option 2" in prompt_lower or "jbl" in prompt_lower or "2nd" in prompt_lower or "second" in prompt_lower:
            target_opt = cached_options[min(1, len(cached_options) - 1)]
        elif "option 3" in prompt_lower or "sony" in prompt_lower or "3rd" in prompt_lower or "third" in prompt_lower:
            target_opt = cached_options[min(2, len(cached_options) - 1)]
        else:
            target_opt = cached_options[0]

        # Execute purchase proposal through full dual-gate chain
        merchant_id = target_opt["merchant_id"]
        order_prompt = f"Please order {target_opt['item_name']} for price {target_opt['price']} INR"

        final_state = run_agent_workflow(
            merchant_id=merchant_id,
            agent_id="consumer_shopping_agent",
            prompt=order_prompt,
            customer_id=str(customer.id),
            thread_id=thread_id
        )

        return CustomerChatResponse(
            thread_id=thread_id,
            prompt=req.prompt,
            proposed_tool="propose_order",
            status=final_state.get("status", "COMPLETED"),
            response_message=final_state.get("response_message") or f"Order processed for {target_opt['item_name']}.",
            search_results=None,
            customer_auth_decision=final_state.get("customer_auth_decision"),
            policy_decision=final_state.get("policy_decision"),
            transaction_id=final_state.get("transaction_id"),
            razorpay_order_id=final_state.get("razorpay_order_id"),
            razorpay_payment_id=final_state.get("razorpay_payment_id"),
            payment_link_url=final_state.get("payment_link_url")
        )

    # Discovery / Search Flow
    # Fetch first active demo merchant to ground initial state
    demo_m = db.query(Merchant).first()
    default_merchant_id = str(demo_m.id) if demo_m else str(uuid.uuid4())

    final_state = run_agent_workflow(
        merchant_id=default_merchant_id,
        agent_id="consumer_shopping_agent",
        prompt=req.prompt,
        customer_id=str(customer.id),
        thread_id=thread_id
    )

    search_res = final_state.get("search_results") or []
    if search_res:
        session_search_memory[thread_id] = search_res

    card_results = [
        ProductOptionCard(
            option_index=opt.get("option_index", idx + 1),
            item_id=opt["item_id"],
            item_name=opt["item_name"],
            merchant_id=opt["merchant_id"],
            merchant_name=opt["merchant_name"],
            price=float(opt["price"]),
            stock=opt["stock"],
            category=opt["category"]
        )
        for idx, opt in enumerate(search_res)
    ] if search_res else None

    return CustomerChatResponse(
        thread_id=thread_id,
        prompt=req.prompt,
        proposed_tool=final_state.get("proposed_tool"),
        status=final_state.get("status", "COMPLETED"),
        response_message=final_state.get("response_message") or "Executed search.",
        search_results=card_results,
        customer_auth_decision=final_state.get("customer_auth_decision"),
        policy_decision=final_state.get("policy_decision"),
        transaction_id=None,
        razorpay_order_id=None
    )
