from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.audit import AuditPaginatedResponse, AuditEventRead
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("/events", response_model=AuditPaginatedResponse)
def get_audit_events(
    merchant_id: Optional[UUID] = Query(None, description="Filter by merchant ID"),
    actor_type: Optional[str] = Query(None, description="Filter by actor type (e.g. merchant, system, agent)"),
    action: Optional[str] = Query(None, description="Filter by action (e.g. catalog_item_created, policy_evaluated, payment_settled)"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max items to return per page"),
    sort_order: str = Query("asc", description="Sort order by timestamp: asc (oldest first) or desc (newest first)"),
    db: Session = Depends(get_db)
):
    """
    Fetches paginated, filterable audit events in chronological order.
    Auto-seeds demo audit events if database has < 3 events.
    """
    AuditService.seed_demo_audit_events(db)
    items, total = AuditService.list_audit_events(
        db=db,
        merchant_id=merchant_id,
        actor_type=actor_type,
        action=action,
        skip=skip,
        limit=limit,
        sort_order=sort_order
    )
    return AuditPaginatedResponse(
        total=total,
        items=[AuditEventRead.model_validate(item) for item in items],
        skip=skip,
        limit=limit
    )
