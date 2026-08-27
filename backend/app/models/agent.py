import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
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
