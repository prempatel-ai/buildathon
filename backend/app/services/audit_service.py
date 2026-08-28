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

    # Note: Application-layer append-only protection.
    # AuditService explicitly exposes NO update or delete methods.
