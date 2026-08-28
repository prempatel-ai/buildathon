import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_type = Column(String(50), nullable=False)
    actor_id = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False)
    input = Column(JSONB, nullable=False, server_default='{}')
    decision = Column(String(50), nullable=False)
    reasoning = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
