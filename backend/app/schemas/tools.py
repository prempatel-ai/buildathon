from uuid import UUID
from decimal import Decimal
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class GetCatalogTool(BaseModel):
    """
    Query the merchant's agent-readable catalog for available products, prices, and stock levels.
    WHEN TO CALL: Call this when a user or buyer agent wants to inspect available items to buy.
    WHAT IT DOES NOT DO: Does NOT propose orders, reserve stock, or charge money.
    """
    merchant_id: UUID = Field(..., description="ID of the merchant store to query catalog for")
    category: Optional[str] = Field(None, description="Optional category filter (e.g. Electronics, Books)")

class ProposeOrderTool(BaseModel):
    """
    Propose a purchase order for policy evaluation and authorization before payment execution.
    WHEN TO CALL: Call this when an agent selects an item to purchase and needs policy engine approval.
    WHAT IT DOES NOT DO: Does NOT execute payments or charge money. All proposals are gated by the merchant policy engine.
    """
    merchant_id: UUID = Field(..., description="ID of the merchant store selling the product")
    agent_id: str = Field(..., description="API key or UUID of the buyer agent initiating the proposal")
    amount: Decimal = Field(..., ge=0, decimal_places=2, description="Total purchase amount in INR")
    category: str = Field(..., min_length=1, description="Category of the product being purchased")
    item_id: Optional[UUID] = Field(None, description="Optional catalog product ID")
    item_name: Optional[str] = Field(None, description="Name of product being purchased")

class RequestPaymentTool(BaseModel):
    """
    Request payment creation for a policy-approved order via Razorpay test mode.
    WHEN TO CALL: Call this only after an order proposal has been evaluated and approved by policy gate or human merchant.
    WHAT IT DOES NOT DO: Does NOT bypass merchant policy limits or signature/capture verification.
    """
    merchant_id: UUID = Field(..., description="ID of the merchant store receiving payment")
    agent_id: str = Field(..., description="ID of buyer agent")
    amount: Decimal = Field(..., ge=0, decimal_places=2, description="Payment amount in INR")
    idempotency_key: str = Field(..., description="Unique idempotency key to prevent double charging")
