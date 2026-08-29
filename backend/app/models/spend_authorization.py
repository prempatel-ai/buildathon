import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class SpendAuthorization(Base):
    __tablename__ = "spend_authorizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    razorpay_customer_id = Column(String(255), nullable=False)
    razorpay_token_id = Column(String(255), nullable=True)
    card_brand = Column(String(50), nullable=True, default="Visa")
    card_last4 = Column(String(4), nullable=True, default="4242")
    cardholder_name = Column(String(255), nullable=True)
    vpa = Column(String(255), nullable=True)
    spend_limit = Column(Numeric(10, 2), nullable=False)
    remaining_limit = Column(Numeric(10, 2), nullable=False)
    period = Column(String(50), nullable=False, default="per_transaction")
    status = Column(String(20), nullable=False, default="active")  # 'active', 'revoked'
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="authorizations")
