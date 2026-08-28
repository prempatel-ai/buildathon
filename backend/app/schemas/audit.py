from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class AuditEventCreate(BaseModel):
    merchant_id: Optional[UUID] = None
    actor_type: str = Field(..., description="e.g. merchant, system, agent")
    actor_id: str = Field(..., description="ID or identifier of the actor")
    action: str = Field(..., description="e.g. catalog_item_created, policy_evaluated, payment_settled")
    input: Dict[str, Any] = Field(default_factory=dict, description="Detailed input payload")
    decision: str = Field(..., description="e.g. ALLOW, DENY, NEEDS_APPROVAL, N/A")
    reasoning: str = Field(..., description="Human-readable rationale or explanation")

class AuditEventRead(BaseModel):
    id: UUID
    merchant_id: Optional[UUID] = None
    actor_type: str
    actor_id: str
    action: str
    input: Dict[str, Any]
    decision: str
    reasoning: str
    created_at: datetime

    class Config:
        from_attributes = True

class AuditPaginatedResponse(BaseModel):
    total: int
    items: List[AuditEventRead]
    skip: int
    limit: int
