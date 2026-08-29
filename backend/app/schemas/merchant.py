from uuid import UUID
from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict

class MerchantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Merchant store name")
    razorpay_key_id: Optional[str] = Field(None, max_length=255, description="Razorpay Key ID")
    limits_config: Dict[str, Any] = Field(default_factory=dict, description="Merchant limit configurations")

class MerchantCreate(MerchantBase):
    pass

class MerchantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    razorpay_key_id: Optional[str] = None
    limits_config: Optional[Dict[str, Any]] = None

class MerchantRead(MerchantBase):
    id: UUID
    environment: str
    kyc_status: str

    model_config = ConfigDict(from_attributes=True)

class MerchantEnvironmentSwitch(BaseModel):
    environment: Literal["sandbox", "live"] = Field(..., description="Target environment")

class MerchantSettingsUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    razorpay_key_id: Optional[str] = None
    max_amount: Optional[float] = Field(None, ge=0)
    daily_limit: Optional[float] = Field(None, ge=0)
    allowed_categories: Optional[list[str]] = None
    blocked_categories: Optional[list[str]] = None
    velocity_limit: Optional[int] = Field(None, ge=1)

class MerchantUsageRead(BaseModel):
    merchant_id: UUID
    merchant_name: str
    total_transactions: int
    settled_transactions: int
    failed_transactions: int
    total_settled_volume: float
    period: str = "this_month"

class MerchantAgentRead(BaseModel):
    id: UUID
    name: str
    scopes: list[str]
    status: str = "active"
    created_at: Optional[str] = None
    last_used_at: Optional[str] = None

class MerchantAgentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    scopes: list[str] = Field(default_factory=lambda: ["read_catalog", "propose_order"])

