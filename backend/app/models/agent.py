import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    api_key_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)

    # Relationships
    merchant = relationship("Merchant", back_populates="agents")
    transactions = relationship("Transaction", back_populates="agent")

class PendingApproval(Base):
    __tablename__ = "pending_approvals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String(255), nullable=False)
    action_type = Column(String(100), nullable=False)
    proposed_action = Column(JSONB, nullable=False, default={})
    status = Column(String(50), nullable=False, default="pending", index=True)  # pending, approved, rejected
    reasoning = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    merchant = relationship("Merchant")
