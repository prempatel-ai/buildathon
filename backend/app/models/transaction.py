import uuid
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(50), nullable=False)
    razorpay_order_id = Column(String(255), nullable=True)
    razorpay_payment_id = Column(String(255), nullable=True)
    razorpay_signature = Column(String(255), nullable=True)
    address_id = Column(UUID(as_uuid=True), ForeignKey("addresses.id", ondelete="SET NULL"), nullable=True)
    estimated_delivery_date = Column(DateTime(timezone=True), nullable=True)
    idempotency_key = Column(String(255), nullable=True, unique=True, index=True)
    error_details = Column(JSONB, server_default='{}', nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True, index=True)

    # Relationships
    merchant = relationship("Merchant", back_populates="transactions")
    agent = relationship("Agent", back_populates="transactions")
    address = relationship("Address", back_populates="transactions")
