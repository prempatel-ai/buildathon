from datetime import datetime
from decimal import Decimal
from uuid import UUID
from typing import Optional, Literal
from pydantic import BaseModel, Field

class SpendAuthorizationCreate(BaseModel):
    spend_limit: Decimal = Field(..., gt=0, description="Spend authorization maximum limit in INR")
    period: Literal["per_transaction", "monthly"] = Field("per_transaction", description="Authorization reset period")

class SpendAuthorizationRead(BaseModel):
    id: UUID
    customer_id: UUID
    razorpay_customer_id: str
    razorpay_token_id: Optional[str]
    spend_limit: Decimal
    remaining_limit: Decimal
    period: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class CustomerDashboardResponse(BaseModel):
    customer: dict
    active_authorization: Optional[SpendAuthorizationRead]
    recent_transactions: list
