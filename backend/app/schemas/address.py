import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class AddressBase(BaseModel):
    label: str = Field("Home", example="Home")
    recipient_name: str = Field(..., example="Prem Patel")
    phone: str = Field(..., example="+919876543210")
    line1: str = Field(..., example="Flat 402, Skyline Residency")
    line2: Optional[str] = Field(None, example="MG Road, Indiranagar")
    city: str = Field(..., example="Bengaluru")
    state: str = Field(..., example="Karnataka")
    postal_code: str = Field(..., example="560038")
    country: str = Field("IN", example="IN")
    is_default: bool = Field(False)

class AddressCreate(AddressBase):
    pass

class AddressUpdate(BaseModel):
    label: Optional[str] = None
    recipient_name: Optional[str] = None
    phone: Optional[str] = None
    line1: Optional[str] = None
    line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    is_default: Optional[bool] = None

class AddressResponse(AddressBase):
    id: uuid.UUID
    customer_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
