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
from app.agents.graph import run_agent_workflow, run_direct_purchase_workflow

router = APIRouter(prefix="/customer", tags=["Customer Chat AI"])

class CustomerChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Natural language prompt from consumer")
    thread_id: Optional[str] = Field(None, description="Optional thread/session ID for multi-turn context")
    address_id: Optional[str] = Field(None, description="Optional selected delivery address ID")

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
    estimated_delivery_date: Optional[str] = None
    delivery_address: Optional[str] = None

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
    import re
    thread_id = req.thread_id or f"thread_cust_{uuid.uuid4().hex[:10]}"
    prompt_raw = req.prompt.strip()
    prompt_lower = prompt_raw.lower()

    cached_options = session_search_memory.get(thread_id, [])

    # Check if prompt is an explicit purchase confirmation ("buy option 1", "buy boAt", "order headphones", etc.)
    buy_keywords = ["buy", "purchase", "confirm", "order", "checkout", "pay for"]
    search_keywords = ["find", "search", "compare", "recommend", "show options", "what items", "show catalog", "list products"]
    
    is_buy_confirm = any(k in prompt_lower for k in buy_keywords) and not any(k in prompt_lower for k in search_keywords)

    if is_buy_confirm:
        target_opt = None

        # 1. Try resolving by explicit option index (e.g., "option 1", "opt 2", "#1", "1st option")
        opt_match = (
            re.search(r'(?:option|opt|#)\s*(\d+)', prompt_lower) or
            re.search(r'\b(\d+)(?:st|nd|rd|th)?\s+option\b', prompt_lower) or
            re.search(r'\bbuy\s+(\d+)\b', prompt_lower)
        )
        if opt_match and cached_options:
            idx = int(opt_match.group(1)) - 1
            if 0 <= idx < len(cached_options):
                target_opt = cached_options[idx]

        # 2. Try matching keywords against cached search results (e.g., "buy boAt", "buy sony", "buy the cheaper one")
        if not target_opt and cached_options:
            if "cheaper" in prompt_lower or "cheapest" in prompt_lower or "first" in prompt_lower or "1st" in prompt_lower:
                target_opt = cached_options[0]
            else:
                # Match against words in item_name or merchant_name
                prompt_words = [w for w in re.findall(r'\w+', prompt_lower) if w not in buy_keywords and len(w) > 1]
                best_score = 0
                for opt in cached_options:
                    opt_text = f"{opt['item_name']} {opt['merchant_name']} {opt.get('category', '')}".lower()
                    score = sum(1 for pw in prompt_words if pw in opt_text)
                    if score > best_score:
                        best_score = score
                        target_opt = opt
                
                # If still unresolved, default to option 1 from cache
                if not target_opt:
                    target_opt = cached_options[0]

        # 3. If no search cache exists (e.g. user directly asks "buy boAt Rockerz" as first message),
        # query the Database Catalog directly to find the exact item and price
        if not target_opt:
            clean_search = re.sub(r'^(?:buy|order|purchase|confirm|checkout|pay\s+for)\s*', '', prompt_raw, flags=re.IGNORECASE).strip()
            if clean_search:
                # Try exact/fuzzy lookup on catalog items
                db_item = db.query(CatalogItem).filter(CatalogItem.name.ilike(f"%{clean_search}%")).first()
                if not db_item:
                    # Match on individual words
                    words = [w for w in clean_search.split() if len(w) > 2]
                    for w in words:
                        db_item = db.query(CatalogItem).filter(CatalogItem.name.ilike(f"%{w}%")).first()
                        if db_item:
                            break
                
                if db_item:
                    m = db.query(Merchant).filter(Merchant.id == db_item.merchant_id).first()
                    target_opt = {
                        "item_id": str(db_item.id),
                        "item_name": db_item.name,
                        "merchant_id": str(db_item.merchant_id),
                        "merchant_name": m.name if m else "Merchant",
                        "price": float(db_item.price),
                        "stock": db_item.stock,
                        "category": db_item.category
                    }

        # 4. If target option was successfully resolved, execute direct purchase workflow
        # This bypasses LLM re-lookup and guarantees the EXACT catalog price is charged
        if target_opt:
            final_state = run_direct_purchase_workflow(
                merchant_id=target_opt["merchant_id"],
                item_name=target_opt["item_name"],
                amount=float(target_opt["price"]),          # <-- EXACT price from DB
                category=target_opt.get("category", "General"),
                customer_id=str(customer.id),
                thread_id=thread_id,
                address_id=req.address_id,
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
                payment_link_url=final_state.get("payment_link_url"),
                estimated_delivery_date=final_state.get("estimated_delivery_date"),
                delivery_address=final_state.get("delivery_address_summary")
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
        thread_id=thread_id,
        address_id=req.address_id
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
        transaction_id=final_state.get("transaction_id"),
        razorpay_order_id=final_state.get("razorpay_order_id"),
        razorpay_payment_id=final_state.get("razorpay_payment_id"),
        payment_link_url=final_state.get("payment_link_url"),
        estimated_delivery_date=final_state.get("estimated_delivery_date"),
        delivery_address=final_state.get("delivery_address_summary")
    )
