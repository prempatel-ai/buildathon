from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class RecommendationItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Unique recommendation ID for attribution tracking")
    customer_id: str
    source_transaction_id: str
    recommended_item_id: str
    recommended_merchant_id: str
    item_name: str
    merchant_name: str
    price: float
    category: str
    stock: int
    reason: str = Field(..., description="Human-readable explainable rationale")
    status: str = Field("shown", description="Recommendation status: shown, clicked, converted")
    shown_at: str

class AttributedTransactionItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transaction_id: str
    recommendation_id: str
    amount: float
    item_name: Optional[str] = None
    status: str
    created_at: str

class MerchantRevenueAttributionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    merchant_id: str
    merchant_name: str
    total_attributed_revenue: float = Field(0.0, description="Sum of real settled transactions linked to recommendations")
    converted_recommendations_count: int = Field(0, description="Count of successfully converted recommendations")
    shown_recommendations_count: int = Field(0, description="Total recommendations shown for this merchant")
    conversion_rate: float = Field(0.0, description="Percentage conversion rate")
    attributed_transactions: List[AttributedTransactionItem] = Field(default_factory=list)
