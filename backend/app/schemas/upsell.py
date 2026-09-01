from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field

class ProductSpecDifference(BaseModel):
    feature_name: str = Field(..., description="Name of the evaluated feature/spec (e.g. Battery Life, Active Noise Cancellation, Display Type)")
    original_value: str = Field(..., description="Specification value of the original proposed item")
    suggested_value: str = Field(..., description="Specification value of the suggested item")
    advantage: Optional[str] = Field(None, description="Clear differentiator or advantage highlight")

class ProductComparison(BaseModel):
    price_delta: float = Field(..., description="Price difference in INR (suggested price minus original price)")
    price_delta_percentage: float = Field(..., description="Percentage price delta vs original item")
    spec_differences: List[ProductSpecDifference] = Field(default_factory=list, description="Granular spec-by-spec comparison differences")
    summary_reason: str = Field(..., description="Explainable rationale comparing trade-offs between products")

class UpsellCrossSellSuggestion(BaseModel):
    item_id: str = Field(..., description="Catalog item UUID")
    item_name: str = Field(..., description="Product title")
    merchant_id: str = Field(..., description="Merchant UUID")
    merchant_name: str = Field(..., description="Merchant store name")
    price: float = Field(..., description="Item price in INR")
    category: str = Field(..., description="Product category")
    stock: int = Field(..., description="Available inventory stock")
    description: Optional[str] = Field(None, description="Detailed product description")
    specifications: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Product specifications map")
    suggestion_type: Literal["upsell", "cross_sell"] = Field(..., description="'upsell' for higher-tier same category or 'cross_sell' for complementary category")
    reason: str = Field(..., description="Human-readable reason for suggestion")
    comparison: ProductComparison = Field(..., description="Real comparison object containing price delta and spec differences")

class SuggestionResponse(BaseModel):
    suggestions: List[UpsellCrossSellSuggestion] = Field(default_factory=list)
