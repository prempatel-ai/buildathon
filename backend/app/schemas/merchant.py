from uuid import UUID
from typing import Optional, Dict, Any
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

    model_config = ConfigDict(from_attributes=True)
