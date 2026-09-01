from uuid import UUID
from typing import Optional, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict

class CatalogItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Item name")
    price: Decimal = Field(..., ge=0, decimal_places=2, description="Price in INR")
    stock: int = Field(..., ge=0, description="Stock quantity available")
    category: str = Field(..., min_length=1, max_length=100, description="Product category")
    description: Optional[str] = Field(None, description="Detailed product description and overview")
    specifications: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Structured specifications and key product attributes (e.g. battery, connectivity, warranty, dimensions)")

class CatalogItemCreate(CatalogItemBase):
    merchant_id: UUID = Field(..., description="ID of the owning merchant")

class CatalogItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    stock: Optional[int] = Field(None, ge=0)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None)
    specifications: Optional[Dict[str, Any]] = Field(None)

class CatalogItemRead(CatalogItemBase):
    id: UUID
    merchant_id: UUID

    model_config = ConfigDict(from_attributes=True)
