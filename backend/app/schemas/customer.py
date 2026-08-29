from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class CustomerRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Customer full name")
    email: EmailStr = Field(..., description="Customer email address")
    password: str = Field(..., min_length=6, description="Customer account password")

class CustomerLogin(BaseModel):
    email: EmailStr = Field(..., description="Customer email address")
    password: str = Field(..., description="Customer password")

class CustomerRead(BaseModel):
    id: UUID
    name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class CustomerAuthToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    customer_id: UUID
    email: str
    name: str
