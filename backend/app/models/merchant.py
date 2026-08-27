import uuid
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    razorpay_key_id = Column(String(255), nullable=True)
    limits_config = Column(JSONB, nullable=False, server_default='{}')

    # Relationships
    agents = relationship("Agent", back_populates="merchant", cascade="all, delete-orphan")
    catalog_items = relationship("CatalogItem", back_populates="merchant", cascade="all, delete-orphan")
    policies = relationship("Policy", back_populates="merchant", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="merchant", cascade="all, delete-orphan")
