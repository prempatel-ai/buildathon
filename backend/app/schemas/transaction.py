from enum import Enum
from uuid import UUID
from typing import Optional, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict

class TransactionStatus(str, Enum):
    PROPOSED = "proposed"
    APPROVED = "approved"
    EXECUTING = "executing"
    SETTLED = "settled"
    FAILED = "failed"

class PaymentOrderCreate(BaseModel):
    merchant_id: UUID = Field(..., description="ID of owning merchant")
    amount: Decimal = Field(..., gt=0, decimal_places=2, description="Transaction amount in INR")
    idempotency_key: str = Field(..., min_length=1, max_length=255, description="Unique client idempotency key")
    agent_id: Optional[UUID] = Field(None, description="Optional agent UUID")
    receipt: Optional[str] = Field(None, description="Optional merchant receipt reference")
    notes: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional custom notes")

class PaymentVerifyRequest(BaseModel):
    transaction_id: UUID = Field(..., description="ID of transaction to verify")
    razorpay_order_id: str = Field(..., min_length=1, description="Razorpay Order ID")
    razorpay_payment_id: str = Field(..., min_length=1, description="Razorpay Payment ID")
    razorpay_signature: str = Field(..., min_length=1, description="Razorpay HMAC SHA256 signature")
    idempotency_key: Optional[str] = Field(None, description="Optional idempotency key for verification call")

class TransactionRead(BaseModel):
    id: UUID
    merchant_id: UUID
    agent_id: Optional[UUID] = None
    amount: Decimal
    status: TransactionStatus
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    idempotency_key: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)
