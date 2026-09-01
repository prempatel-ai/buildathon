from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

class CampaignOfferItemResponse(BaseModel):
    id: str = Field(..., description="Unique campaign offer UUID")
    customer_id: str = Field(..., description="Target customer UUID")
    merchant_id: str = Field(..., description="Offering merchant UUID")
    merchant_name: str = Field(..., description="Offering merchant business name")
    source_item_id: str = Field(..., description="Target product SKU UUID")
    item_name: str = Field(..., description="Target product name")
    category: str = Field(..., description="Product category")
    discount_type: str = Field(default="percentage", description="'percentage' or 'fixed'")
    discount_value: float = Field(..., description="Discount amount or percentage (e.g. 10.0 for 10% or 150.0 for ₹150)")
    original_price: float = Field(..., description="Original catalog retail price in INR")
    discounted_price: float = Field(..., description="Effective price after applying bounded discount")
    reason: str = Field(..., description="Explainable rationale for re-engagement offer")
    status: str = Field(..., description="'pending', 'shown', 'converted', or 'expired'")
    created_at: str = Field(..., description="ISO creation timestamp")
    expires_at: str = Field(..., description="ISO expiration timestamp")

    model_config = ConfigDict(from_attributes=True)

class MerchantCampaignPerformanceResponse(BaseModel):
    merchant_id: str
    merchant_name: str
    offers_generated: int = Field(default=0, description="Total abandonment re-engagement offers generated")
    offers_shown: int = Field(default=0, description="Offers delivered to shoppers in chat")
    offers_converted: int = Field(default=0, description="Offers successfully converted to settled purchases")
    conversion_rate: float = Field(default=0.0, description="Percentage of shown offers converted (e.g. 25.0%)")
    total_discount_given: float = Field(default=0.0, description="Total discount value subsidized in INR")
    total_attributed_revenue: float = Field(default=0.0, description="Total settled GMV attributed to campaign offers in INR")
    offers: List[CampaignOfferItemResponse] = Field(default_factory=list, description="Detailed list of campaign offers")

    model_config = ConfigDict(from_attributes=True)
