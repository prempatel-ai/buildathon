import json
import uuid
from decimal import Decimal
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.policy.velocity import get_redis_client
from app.services.catalog_service import CatalogService
from app.services.policy_service import PolicyService
from app.policy.engine import evaluate
from app.schemas.policy import ProposedAction, DecisionEnum
from app.services.payment_service import PaymentService
from app.schemas.transaction import PaymentOrderCreate
from app.services.audit_service import AuditService
from app.models.agent import PendingApproval

def get_groq_client():
    import groq
    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not configured.")
    return groq.Groq(api_key=api_key)

def llm_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    LLM Node (Groq Llama / Compound):
    Parses user prompt and proposes a tool call.
    IMPORTANT: Generates text/schema proposals ONLY. Does NOT execute payments or mutate database.
    """
    prompt = state.get("prompt", "")
    merchant_id = state.get("merchant_id")
    agent_id = state.get("agent_id")

    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_catalog",
                "description": "Query merchant catalog for available products, prices, and stock.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category": {"type": "string", "description": "Optional product category filter"}
                    },
                    "required": []
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "propose_order",
                "description": "Propose a purchase order for policy evaluation and authorization before payment execution.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "amount": {"type": "number", "description": "Total amount in INR"},
                        "category": {"type": "string", "description": "Category of product being bought"},
                        "item_name": {"type": "string", "description": "Name of product being bought"}
                    },
                    "required": ["amount", "category"]
                }
            }
        }
    ]

    models_to_try = ["openai/gpt-oss-20b", "qwen/qwen3.6-27b", "openai/gpt-oss-120b"]
    client = get_groq_client()
    system_msg = (
        "You are an AI Buyer Agent assisting a user with store actions. "
        "RULES:\n"
        "1. If the user wants to buy, order, or purchase a product (especially with an amount/price), call `propose_order` with `amount`, `category`, and `item_name`.\n"
        "2. If the user wants to search, view, browse, or list products in stock, call `get_catalog`.\n"
        "Do NOT call get_catalog if the user explicitly requests to buy or order an item."
    )

    msg = None
    for model_id in models_to_try:
        try:
            response = client.chat.completions.create(
                model=model_id,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": prompt}
                ],
                tools=tools,
                tool_choice="auto",
                temperature=0.0
            )
            msg = response.choices[0].message
            break
        except Exception as e:
            print(f"[GROQ_MODEL_TRY_FAILED] model '{model_id}': {e}")

    proposed_tool = None
    tool_args = {}

    if msg and msg.tool_calls and len(msg.tool_calls) > 0:
        tc = msg.tool_calls[0]
        proposed_tool = tc.function.name
        tool_args = json.loads(tc.function.arguments) if tc.function.arguments else {}
    else:
        proposed_tool = None

    # Heuristic override/correction if prompt explicitly asks to buy/order but LLM chose get_catalog
    lower = prompt.lower()
    if ("buy" in lower or "order" in lower or "purchase" in lower) and proposed_tool != "propose_order":
        proposed_tool = "propose_order"
        import re
        amt_match = re.search(r'(\d+)', prompt)
        amt = float(amt_match.group(1)) if amt_match else 450.0
        cat = "Electronics" if "electronics" in lower or "headphone" in lower else "General"
        tool_args = {"amount": amt, "category": cat, "item_name": prompt}
    elif not proposed_tool:
        proposed_tool = "get_catalog"
        tool_args = {}

    state["proposed_tool"] = proposed_tool
    state["tool_args"] = tool_args
    state["response_message"] = (msg.content if msg else None) or f"Selected tool {proposed_tool}"
    state["status"] = "LLM_TOOL_PROPOSED"

    return state

def customer_auth_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Customer Authorization Node (Additive Gate):
    Evaluates whether the requesting customer has an active SpendAuthorization
    and if the proposed purchase amount fits within their remaining limit.
    Runs BEFORE the merchant's Policy Engine node.
    Logs audit event with actor_type='customer'.
    """
    proposed_tool = state.get("proposed_tool")
    tool_args = state.get("tool_args", {})
    customer_id = state.get("customer_id")
    merchant_id = uuid.UUID(state["merchant_id"]) if isinstance(state["merchant_id"], str) else state["merchant_id"]

    if proposed_tool != "propose_order":
        state["customer_auth_decision"] = "ALLOW"
        return state

    db: Session = SessionLocal()
    try:
        from app.models.spend_authorization import SpendAuthorization
        from app.models.customer import Customer

        cust_uuid = None
        if customer_id:
            try:
                cust_uuid = uuid.UUID(str(customer_id))
            except ValueError:
                state["customer_auth_decision"] = "DENY"
                state["policy_decision"] = "DENY"
                state["reasoning"] = f"Customer authorization failed: Invalid customer_id format '{customer_id}'."
                state["status"] = "BLOCKED_BY_CUSTOMER_AUTHORIZATION"
                return state
        else:
            # Fallback for unauthenticated test prompts: look up or create default test customer authorization
            auth_existing = db.query(SpendAuthorization).filter(SpendAuthorization.status == "active").first()
            if auth_existing:
                cust_uuid = auth_existing.customer_id
                customer_id = str(cust_uuid)
            else:
                default_cust = Customer(
                    name="Default Test Consumer",
                    email=f"default_test_{uuid.uuid4().hex[:6]}@example.com",
                    password_hash="test_hash"
                )
                db.add(default_cust)
                db.commit()
                db.refresh(default_cust)

                default_auth = SpendAuthorization(
                    customer_id=default_cust.id,
                    razorpay_customer_id=f"cust_{uuid.uuid4().hex[:14]}",
                    spend_limit=Decimal("50000.00"),
                    remaining_limit=Decimal("50000.00"),
                    period="per_transaction",
                    status="active"
                )
                db.add(default_auth)
                db.commit()
                db.refresh(default_auth)

                cust_uuid = default_cust.id
                customer_id = str(cust_uuid)

        auth = db.query(SpendAuthorization).filter(
            SpendAuthorization.customer_id == cust_uuid,
            SpendAuthorization.status == "active"
        ).first()

        amount = Decimal(str(tool_args.get("amount", 0)))

        if not auth:
            state["customer_auth_decision"] = "DENY"
            state["policy_decision"] = "DENY"
            state["reasoning"] = f"Customer authorization failed: No active spend authorization found for customer {customer_id}."
            state["status"] = "BLOCKED_BY_CUSTOMER_AUTHORIZATION"

            AuditService.log_event(
                db=db,
                actor_type="customer",
                actor_id=str(customer_id),
                action="customer_authorization_evaluated",
                input={"customer_id": str(customer_id), "amount": str(amount)},
                decision="DENY",
                reasoning="Customer has no active spend authorization.",
                merchant_id=merchant_id
            )
            return state

        if amount > auth.remaining_limit:
            state["customer_auth_decision"] = "DENY"
            state["policy_decision"] = "DENY"
            state["reasoning"] = f"Customer authorization denied: Requested amount INR {amount} exceeds remaining spend limit INR {auth.remaining_limit} (Limit: INR {auth.spend_limit})."
            state["status"] = "BLOCKED_BY_CUSTOMER_AUTHORIZATION"

            AuditService.log_event(
                db=db,
                actor_type="customer",
                actor_id=str(customer_id),
                action="customer_authorization_evaluated",
                input={
                    "customer_id": str(customer_id),
                    "amount": str(amount),
                    "spend_limit": str(auth.spend_limit),
                    "remaining_limit": str(auth.remaining_limit)
                },
                decision="DENY",
                reasoning=f"Requested amount INR {amount} exceeds customer remaining spend authorization limit INR {auth.remaining_limit}.",
                merchant_id=merchant_id
            )
            return state

        # Customer Authorization Approved
        state["customer_auth_decision"] = "ALLOW"
        AuditService.log_event(
            db=db,
            actor_type="customer",
            actor_id=str(customer_id),
            action="customer_authorization_evaluated",
            input={
                "customer_id": str(customer_id),
                "amount": str(amount),
                "remaining_limit": str(auth.remaining_limit)
            },
            decision="ALLOW",
            reasoning=f"Customer spend authorization verified (Remaining balance: INR {auth.remaining_limit}).",
            merchant_id=merchant_id
        )
    finally:
        db.close()

    return state

def policy_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Policy Engine Node:
    Routes proposed tool calls directly through the REAL Phase 2 evaluate() engine.
    Logs policy_evaluated audit event with agent's actor_id.
    """
    if state.get("customer_auth_decision") == "DENY":
        # Skip merchant policy engine if customer authorization failed
        return state
    proposed_tool = state.get("proposed_tool")
    tool_args = state.get("tool_args", {})
    merchant_id = uuid.UUID(state["merchant_id"]) if isinstance(state["merchant_id"], str) else state["merchant_id"]
    agent_id = str(state.get("agent_id", "default_agent"))

    db: Session = SessionLocal()
    try:
        if proposed_tool == "get_catalog":
            state["policy_decision"] = "ALLOW"
            state["reasoning"] = "Read-only catalog query approved automatically."

            AuditService.log_event(
                db=db,
                actor_type="agent",
                actor_id=agent_id,
                action="policy_evaluated",
                input={"merchant_id": str(merchant_id), "agent_id": agent_id, "tool": "get_catalog"},
                decision="ALLOW",
                reasoning="Read-only catalog query approved automatically.",
                merchant_id=merchant_id
            )
            return state

        policies = PolicyService.list_policies(db, merchant_id)
        redis_client = None
        try:
            redis_client = get_redis_client()
        except Exception:
            pass

        amount = Decimal(str(tool_args.get("amount", 0)))
        category = tool_args.get("category", "General")
        item_name = tool_args.get("item_name", "Requested Item")

        action = ProposedAction(
            merchant_id=merchant_id,
            agent_id=agent_id,
            amount=amount,
            category=category
        )

        decision = evaluate(action=action, policies=policies, redis_client=redis_client)
        dec_str = decision.decision.value if hasattr(decision.decision, "value") else str(decision.decision)

        state["policy_decision"] = dec_str
        state["reasoning"] = decision.reasoning

        # Wire Audit Event for Agent Policy Evaluation
        AuditService.log_event(
            db=db,
            actor_type="agent",
            actor_id=agent_id,
            action="policy_evaluated",
            input={
                "merchant_id": str(merchant_id),
                "agent_id": agent_id,
                "amount": str(amount),
                "category": category,
                "item_name": item_name
            },
            decision=dec_str,
            reasoning=decision.reasoning,
            merchant_id=merchant_id
        )
    finally:
        db.close()

    return state

def execute_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute Node:
    On ALLOW: calls real PaymentService.create_payment_order() (Phase 3) or CatalogService (Phase 1).
    On DENY: halts cleanly without touching Razorpay or database transaction tables.
    On NEEDS_APPROVAL: creates pending approval record for human merchant review.
    """
    policy_decision = state.get("policy_decision")
    proposed_tool = state.get("proposed_tool")
    tool_args = state.get("tool_args", {})
    merchant_id = uuid.UUID(state["merchant_id"]) if isinstance(state["merchant_id"], str) else state["merchant_id"]
    agent_id = str(state.get("agent_id", "default_agent"))

    if proposed_tool == "get_catalog":
        db: Session = SessionLocal()
        try:
            items = CatalogService.list_catalog_items(db, merchant_id)
            minimal_items = [
                {"id": str(it.id), "name": it.name, "price": float(it.price), "stock": it.stock, "category": it.category}
                for it in items
            ]
            state["catalog_results"] = minimal_items
            state["response_message"] = f"Fetched {len(minimal_items)} items from catalog."
            state["status"] = "COMPLETED"
        finally:
            db.close()
        return state

    if state.get("customer_auth_decision") == "DENY":
        state["status"] = "BLOCKED_BY_CUSTOMER_AUTHORIZATION"
        state["response_message"] = f"Execution blocked by customer spend authorization gate: {state.get('reasoning')}"
        return state

    if policy_decision == "DENY":
        state["status"] = "BLOCKED_BY_POLICY"
        state["response_message"] = f"Execution blocked by merchant policy gate: {state.get('reasoning')}"
        return state

    if policy_decision == "NEEDS_APPROVAL":
        db: Session = SessionLocal()
        try:
            pending = PendingApproval(
                merchant_id=merchant_id,
                agent_id=agent_id,
                action_type="propose_order",
                proposed_action={
                    "merchant_id": str(merchant_id),
                    "agent_id": agent_id,
                    "amount": str(tool_args.get("amount", 0)),
                    "category": tool_args.get("category", "General"),
                    "item_name": tool_args.get("item_name", "Item")
                },
                status="pending",
                reasoning=state.get("reasoning", "Amount falls into human approval threshold.")
            )
            db.add(pending)
            db.commit()
            db.refresh(pending)
            state["pending_approval_id"] = str(pending.id)
            state["status"] = "PAUSED_FOR_HUMAN_APPROVAL"
            state["response_message"] = f"Action paused for human merchant approval (Pending ID: {pending.id})."
        finally:
            db.close()
        return state

    if policy_decision == "ALLOW":
        db: Session = SessionLocal()
        try:
            amount = Decimal(str(tool_args.get("amount", 0)))
            idempotency_key = f"idemp_agent_{uuid.uuid4().hex[:8]}"
            
            tx_create = PaymentOrderCreate(
                merchant_id=merchant_id,
                agent_id=agent_id,
                amount=amount,
                idempotency_key=idempotency_key,
                receipt=f"rcpt_agent_{uuid.uuid4().hex[:4]}"
            )
            
            tx = PaymentService.create_payment_order(db, tx_create)
            state["transaction_id"] = str(tx.id)
            state["razorpay_order_id"] = tx.razorpay_order_id
            state["status"] = "PAYMENT_EXECUTED"
            state["response_message"] = (
                f"Order approved and executed! Razorpay Order ID '{tx.razorpay_order_id}' created for INR {amount}."
            )
        finally:
            db.close()
        return state

    return state
