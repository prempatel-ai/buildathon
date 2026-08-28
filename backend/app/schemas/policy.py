from enum import Enum
from uuid import UUID
from typing import Optional, List, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict

class DecisionEnum(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"
    NEEDS_APPROVAL = "NEEDS_APPROVAL"

class ProposedAction(BaseModel):
    merchant_id: UUID = Field(..., description="ID of the merchant")
    agent_id: str = Field(..., description="API key hash or UUID of the buyer agent")
    amount: Decimal = Field(..., ge=0, decimal_places=2, description="Proposed spend amount in INR")
    category: str = Field(..., min_length=1, description="Category of item being purchased")
    item_id: Optional[UUID] = Field(None, description="Optional catalog item ID")

class PolicyDecision(BaseModel):
    decision: DecisionEnum = Field(..., description="ALLOW, DENY, or NEEDS_APPROVAL")
    reasoning: str = Field(..., description="Human-readable explanation of decision")
    triggered_rule: Optional[str] = Field(None, description="Name or type of rule that triggered decision")

# Config Schemas for JSONB Documentation & Validation
class MaxAmountConfig(BaseModel):
    max_amount: Decimal = Field(..., gt=0, description="Hard maximum amount allowed per transaction")
    approval_threshold: Optional[Decimal] = Field(None, description="Lower threshold above which human approval is required")

class CategoryFilterConfig(BaseModel):
    allowed_categories: List[str] = Field(default_factory=list, description="Allowlist of approved categories")
    blocked_categories: List[str] = Field(default_factory=list, description="Blocklist of denied categories")

class VelocityLimitConfig(BaseModel):
    max_count: int = Field(..., gt=0, description="Max allowed transactions within time window")
    window_seconds: int = Field(..., gt=0, description="Sliding window duration in seconds")

# Policy Database CRUD Schemas
class PolicyBase(BaseModel):
    rule_type: str = Field(..., description="Rule type identifier (e.g., max_amount, category_filter, velocity_limit)")
    config: Dict[str, Any] = Field(default_factory=dict, description="JSONB rule configuration parameters")

class PolicyCreate(PolicyBase):
    merchant_id: UUID = Field(..., description="Owning merchant ID")

class PolicyUpdate(BaseModel):
    rule_type: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

class PolicyRead(PolicyBase):
    id: UUID
    merchant_id: UUID

    model_config = ConfigDict(from_attributes=True)
