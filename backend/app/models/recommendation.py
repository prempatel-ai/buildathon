import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    source_transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    recommended_item_id = Column(UUID(as_uuid=True), ForeignKey("catalog_items.id", ondelete="CASCADE"), nullable=False, index=True)
    recommended_merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="shown", nullable=False)  # shown, clicked, converted
    shown_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    customer = relationship("Customer", backref="recommendations")
    source_transaction = relationship("Transaction", foreign_keys=[source_transaction_id], backref="generated_recommendations")
    recommended_item = relationship("CatalogItem", backref="recommendations")
    recommended_merchant = relationship("Merchant", backref="attributed_recommendations")
