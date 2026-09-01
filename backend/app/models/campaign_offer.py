import uuid
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class CampaignOffer(Base):
    __tablename__ = "campaign_offers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, index=True)
    source_item_id = Column(UUID(as_uuid=True), ForeignKey("catalog_items.id", ondelete="CASCADE"), nullable=False)
    source_event_id = Column(UUID(as_uuid=True), ForeignKey("audit_events.id", ondelete="SET NULL"), nullable=True)
    discount_type = Column(String(20), nullable=False, default="percentage") # "percentage" or "fixed"
    discount_value = Column(Numeric(10, 2), nullable=False) # e.g. 10.00% or ₹150.00
    original_price = Column(Numeric(10, 2), nullable=False)
    discounted_price = Column(Numeric(10, 2), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pending", index=True) # "pending", "shown", "converted", "expired"
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # Relationships
    customer = relationship("Customer", backref="campaign_offers")
    merchant = relationship("Merchant", backref="campaign_offers")
    source_item = relationship("CatalogItem", backref="campaign_offers")
    source_event = relationship("AuditEvent", backref="campaign_offers")
