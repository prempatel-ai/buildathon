from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from app.core.database import get_db
from app.schemas.merchant import MerchantCreate, MerchantRead, MerchantUpdate
from app.schemas.catalog import CatalogItemCreate
from app.services.merchant_service import MerchantService
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/merchants", tags=["merchants"])

@router.post("", response_model=MerchantRead, status_code=status.HTTP_201_CREATED)
def create_merchant(merchant_in: MerchantCreate, db: Session = Depends(get_db)):
    return MerchantService.create_merchant(db, merchant_in)

@router.get("", response_model=List[MerchantRead])
def list_merchants(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return MerchantService.list_merchants(db, skip=skip, limit=limit)

from app.core.security import get_current_merchant, verify_merchant_access
from app.models.merchant import Merchant

from sqlalchemy import func
from app.models.policy import Policy
from app.models.agent import Agent
from app.models.transaction import Transaction
from app.models.catalog import CatalogItem
from app.schemas.merchant import (
    MerchantSettingsUpdate,
    MerchantUsageRead,
    MerchantAgentRead,
    MerchantAgentCreate,
    MerchantEnvironmentSwitch
)
from app.services.audit_service import AuditService
import hashlib
import secrets

@router.get("/me", response_model=MerchantRead)
def get_current_merchant_profile(
    current_merchant: Merchant = Depends(get_current_merchant)
):
    """
    Returns profile and policy settings for the currently authenticated merchant.
    Strictly scoped to the JWT Bearer token.
    """
    return current_merchant

@router.put("/settings", response_model=MerchantRead)
def update_merchant_settings(
    settings_in: MerchantSettingsUpdate,
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Updates merchant limits, category rules, and velocity settings for the authenticated merchant.
    Validates max_amount safety net against merchant's cheapest catalog item.
    """
    # Validation Safety Net: Check if max_amount is lower than cheapest catalog item
    if settings_in.max_amount is not None:
        min_price = db.query(func.min(CatalogItem.price)).filter(
            CatalogItem.merchant_id == current_merchant.id
        ).scalar()
        if min_price is not None and float(settings_in.max_amount) < float(min_price):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Validation Warning: max_amount (₹{settings_in.max_amount:.2f}) is lower than your cheapest catalog item (₹{float(min_price):.2f}). Every catalog item would be unpurchaseable."
            )

    limits_config = dict(current_merchant.limits_config or {})

    if settings_in.name:
        current_merchant.name = settings_in.name
    if settings_in.razorpay_key_id is not None:
        current_merchant.razorpay_key_id = settings_in.razorpay_key_id

    if settings_in.max_amount is not None:
        limits_config["max_transaction_amount"] = settings_in.max_amount
        # Upsert Policy rule: max_amount
        pol = db.query(Policy).filter(
            Policy.merchant_id == current_merchant.id,
            Policy.rule_type == "max_amount"
        ).first()
        if pol:
            cfg = dict(pol.config or {})
            cfg["max_amount"] = settings_in.max_amount
            pol.config = cfg
            flag_modified(pol, "config")
        else:
            pol = Policy(merchant_id=current_merchant.id, rule_type="max_amount", config={"max_amount": settings_in.max_amount})
            db.add(pol)

    if settings_in.daily_limit is not None:
        limits_config["daily_spend_limit"] = settings_in.daily_limit

    if settings_in.allowed_categories is not None or settings_in.blocked_categories is not None:
        allowed = settings_in.allowed_categories if settings_in.allowed_categories is not None else limits_config.get("allowed_categories", [])
        blocked = settings_in.blocked_categories if settings_in.blocked_categories is not None else limits_config.get("blocked_categories", [])
        limits_config["allowed_categories"] = allowed
        limits_config["blocked_categories"] = blocked

        pol = db.query(Policy).filter(
            Policy.merchant_id == current_merchant.id,
            Policy.rule_type == "category_restriction"
        ).first()
        if pol:
            pol.config = {"allowed_categories": allowed, "blocked_categories": blocked}
            flag_modified(pol, "config")
        else:
            pol = Policy(merchant_id=current_merchant.id, rule_type="category_restriction", config={"allowed_categories": allowed, "blocked_categories": blocked})
            db.add(pol)

    if settings_in.velocity_limit is not None:
        limits_config["velocity_limit"] = settings_in.velocity_limit
        pol = db.query(Policy).filter(
            Policy.merchant_id == current_merchant.id,
            Policy.rule_type == "velocity_limit"
        ).first()
        if pol:
            pol.config = {"max_requests": settings_in.velocity_limit, "window_seconds": 60}
            flag_modified(pol, "config")
        else:
            pol = Policy(merchant_id=current_merchant.id, rule_type="velocity_limit", config={"max_requests": settings_in.velocity_limit, "window_seconds": 60})
            db.add(pol)

    current_merchant.limits_config = limits_config
    flag_modified(current_merchant, "limits_config")
    db.commit()
    db.refresh(current_merchant)

    AuditService.log_event(
        db=db,
        actor_type="merchant",
        actor_id=str(current_merchant.id),
        action="merchant_settings_updated",
        input=limits_config,
        decision="UPDATED",
        reasoning="Merchant updated self-serve spend limits and policy configurations.",
        merchant_id=current_merchant.id
    )

    return current_merchant

@router.put("/environment", response_model=MerchantRead)
def switch_merchant_environment(
    env_in: MerchantEnvironmentSwitch,
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Switches merchant environment between sandbox and live.
    KYC Gate: Cannot switch to 'live' unless kyc_status = 'verified'.
    Sandbox switch is always allowed.
    """
    target_env = env_in.environment
    current_env = current_merchant.environment

    if target_env == current_env:
        return current_merchant

    # KYC Gate: live requires verified KYC
    if target_env == "live" and current_merchant.kyc_status != "verified":
        AuditService.log_event(
            db=db,
            actor_type="merchant",
            actor_id=str(current_merchant.id),
            action="environment_switch_denied",
            input={"target_environment": target_env, "current_kyc_status": current_merchant.kyc_status},
            decision="DENIED",
            reasoning=f"Environment switch to 'live' denied: KYC status is '{current_merchant.kyc_status}', must be 'verified'.",
            merchant_id=current_merchant.id
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot switch to live environment: KYC status must be 'verified' (current: '{current_merchant.kyc_status}'). Complete KYC verification first."
        )

    # Allow switch
    current_merchant.environment = target_env
    db.commit()
    db.refresh(current_merchant)

    AuditService.log_event(
        db=db,
        actor_type="merchant",
        actor_id=str(current_merchant.id),
        action="environment_switched",
        input={"from_environment": current_env, "to_environment": target_env, "kyc_status": current_merchant.kyc_status},
        decision="SWITCHED",
        reasoning=f"Merchant environment switched from '{current_env}' to '{target_env}'.",
        merchant_id=current_merchant.id
    )

    return current_merchant

@router.get("/agents", response_model=List[MerchantAgentRead])
def list_merchant_agents(
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Lists all AI agents belonging to the authenticated merchant.
    Strictly scoped via JWT Bearer token.
    """
    agents = db.query(Agent).filter(Agent.merchant_id == current_merchant.id).all()
    res = []
    for ag in agents:
        res.append(MerchantAgentRead(
            id=ag.id,
            name=ag.name,
            scopes=ag.scopes or ["read_catalog", "propose_order"],
            status="active",
            created_at=ag.created_at.isoformat() if hasattr(ag, 'created_at') and ag.created_at else None,
            last_used_at=ag.last_used_at.isoformat() if hasattr(ag, 'last_used_at') and ag.last_used_at else None
        ))
    return res

@router.post("/agents", status_code=status.HTTP_201_CREATED)
def create_merchant_agent(
    agent_in: MerchantAgentCreate,
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Creates a new AI agent with user-configured scopes for the authenticated merchant.
    """
    raw_api_key = f"agent_key_{secrets.token_hex(12)}"
    key_hash = hashlib.sha256(raw_api_key.encode()).hexdigest()

    agent = Agent(
        merchant_id=current_merchant.id,
        name=agent_in.name,
        api_key_hash=key_hash,
        scopes=agent_in.scopes
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)

    AuditService.log_event(
        db=db,
        actor_type="merchant",
        actor_id=str(current_merchant.id),
        action="agent_key_created",
        input={"agent_id": str(agent.id), "name": agent.name, "scopes": agent.scopes},
        decision="CREATED",
        reasoning=f"Created new agent key '{agent.name}' with scopes {agent.scopes}.",
        merchant_id=current_merchant.id
    )

    return {
        "agent_id": str(agent.id),
        "name": agent.name,
        "api_key": raw_api_key,
        "scopes": agent.scopes,
        "status": "active",
        "created_at": agent.created_at.isoformat() if hasattr(agent, 'created_at') and agent.created_at else None
    }

@router.get("/usage", response_model=MerchantUsageRead)
def get_merchant_usage_metrics(
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Returns live transaction count and settled volume accounting for the authenticated merchant.
    Strictly scoped via JWT Bearer token.
    """
    txs = db.query(Transaction).filter(Transaction.merchant_id == current_merchant.id).all()
    total_count = len(txs)
    settled_count = sum(1 for t in txs if t.status == "settled")
    failed_count = sum(1 for t in txs if t.status == "failed")
    settled_vol = sum(float(t.amount) for t in txs if t.status == "settled")

    return MerchantUsageRead(
        merchant_id=current_merchant.id,
        merchant_name=current_merchant.name,
        total_transactions=total_count,
        settled_transactions=settled_count,
        failed_transactions=failed_count,
        total_settled_volume=float(settled_vol),
        period="this_month"
    )

@router.get("/{merchant_id}", response_model=MerchantRead)
def get_merchant(
    merchant_id: UUID,
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    verify_merchant_access(current_merchant, merchant_id)
    merchant = MerchantService.get_merchant(db, merchant_id)
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Merchant with ID {merchant_id} does not exist"
        )
    return merchant
