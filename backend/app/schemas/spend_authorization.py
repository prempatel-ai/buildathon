from datetime import datetime
from decimal import Decimal
from uuid import UUID
from typing import Optional, Literal, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict

class SpendAuthorizationCreate(BaseModel):
    spend_limit: Decimal = Field(..., gt=0, description="Spend authorization maximum limit in INR")
    period: Literal["per_transaction", "monthly"] = Field(default="per_transaction", description="Authorization reset period")
    card_brand: Optional[str] = Field(default="Visa", description="Card brand or payment type")
    card_last4: Optional[str] = Field(default="4242", description="Last 4 digits of tokenized card")
    cardholder_name: Optional[str] = Field(default=None, description="Cardholder name")
    vpa: Optional[str] = Field(default=None, description="UPI Virtual Payment Address / VPA")
    reset_balance: Optional[bool] = Field(default=False, description="If true, resets available quota to full spend_limit; otherwise preserves spent amount")

class SpendAuthorizationRead(BaseModel):
    id: UUID
    customer_id: UUID
    razorpay_customer_id: str
    razorpay_token_id: Optional[str]
    card_brand: Optional[str] = "Visa"
    card_last4: Optional[str] = "4242"
    cardholder_name: Optional[str] = None
    vpa: Optional[str] = None
    spend_limit: Decimal
    remaining_limit: Decimal
    period: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CustomerDashboardResponse(BaseModel):
    customer: Dict[str, Any]
    active_authorization: Optional[SpendAuthorizationRead] = None
    recent_transactions: List[Dict[str, Any]] = Field(default_factory=list)
    recent_purchases: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    recent_searches: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
