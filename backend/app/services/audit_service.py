from uuid import UUID
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc
from app.models.audit import AuditEvent

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        actor_type: str,
        actor_id: str,
        action: str,
        input: Dict[str, Any],
        decision: str,
        reasoning: str,
        merchant_id: Optional[UUID] = None
    ) -> AuditEvent:
        """
        Appends a single immutable audit event to audit_events table.
        This is the ONLY allowed code path for creating audit events.
        """
        # Ensure merchant_id is captured from input if not passed explicitly
        if not merchant_id and isinstance(input, dict):
            m_id = input.get("merchant_id")
            if m_id:
                try:
                    merchant_id = UUID(str(m_id))
                except Exception:
                    pass

        event = AuditEvent(
            merchant_id=merchant_id,
            actor_type=actor_type,
            actor_id=str(actor_id),
            action=action,
            input=input or {},
            decision=decision,
            reasoning=reasoning
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def list_audit_events(
        db: Session,
        merchant_id: Optional[UUID] = None,
        actor_type: Optional[str] = None,
        action: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
        sort_order: str = "asc"
    ) -> Tuple[List[AuditEvent], int]:
        """
        Lists audit events with pagination and filtering by merchant_id, actor_type, and action.
        Default sort_order="asc" enforces strict chronological order (oldest to newest).
        """
        query = db.query(AuditEvent)

        if merchant_id:
            query = query.filter(AuditEvent.merchant_id == merchant_id)
        if actor_type:
            query = query.filter(AuditEvent.actor_type == actor_type)
        if action:
            query = query.filter(AuditEvent.action == action)

        total = query.count()

        if sort_order.lower() == "desc":
            query = query.order_by(desc(AuditEvent.created_at), desc(AuditEvent.id))
        else:
            query = query.order_by(asc(AuditEvent.created_at), asc(AuditEvent.id))

        items = query.offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def seed_demo_audit_events(db: Session) -> None:
        """
        Seeds 3 canonical audit events (SETTLED success, DENIED policy gate, FAILED payment decline)
        so the /audit page has real, inspectable examples out-of-the-box.
        """
        count = db.query(AuditEvent).count()
        if count >= 3:
            return

        from app.models.merchant import Merchant
        m = db.query(Merchant).first()
        m_id = m.id if m else None

        # Row 1: SETTLED (Successful Transaction)
        db.add(AuditEvent(
            merchant_id=m_id,
            actor_type="customer",
            actor_id="cust_99a80b7c",
            action="payment_settled",
            input={
                "transaction_id": "tx_fe9038dc_001",
                "amount": "2499.00",
                "item_name": "boAt Rockerz 450",
                "razorpay_order_id": "order_P8x9kL2mA0z",
                "razorpay_payment_id": "pay_Q9y0nM3nB1x"
            },
            decision="SETTLED",
            reasoning="AI Agent auto-settled payment of INR 2499.00 using tokenized customer payment method."
        ))

        # Row 2: DENIED (Gate 2 Policy Over-Limit Denied)
        db.add(AuditEvent(
            merchant_id=m_id,
            actor_type="agent",
            actor_id="buyer_agent_01",
            action="policy_evaluated",
            input={
                "amount": "15000.00",
                "category": "Electronics",
                "merchant_max": "10000.00",
                "razorpay_order_id": None,
                "razorpay_payment_id": None
            },
            decision="DENIED",
            reasoning="denied: amount 15000.00 > merchant_max 10000.00"
        ))

        # Row 3: FAILED (Razorpay Payment Capture Failure)
        db.add(AuditEvent(
            merchant_id=m_id,
            actor_type="customer",
            actor_id="cust_99a80b7c",
            action="payment_failed",
            input={
                "transaction_id": "tx_fe9038dc_003",
                "amount": "4500.00",
                "razorpay_order_id": "order_F7m2nB9kL1x",
                "razorpay_payment_id": None,
                "failure_reason": "BAD_REQUEST_ERROR (Card declined by issuing bank)"
            },
            decision="FAILED",
            reasoning="Razorpay payment capture failed: Payment declined by issuing bank (BAD_REQUEST_ERROR)."
        ))

        db.commit()


    # Note: Application-layer append-only protection.
    # AuditService explicitly exposes NO update or delete methods.
