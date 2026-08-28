from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.policy import PolicyCreate, PolicyRead, ProposedAction, PolicyDecision, DecisionEnum
from app.services.policy_service import PolicyService
from app.policy.engine import evaluate
from app.policy.velocity import get_redis_client, record_velocity_event

router = APIRouter(prefix="/policies", tags=["policies"])

@router.post("", response_model=PolicyRead, status_code=status.HTTP_201_CREATED)
def create_policy(policy_in: PolicyCreate, db: Session = Depends(get_db)):
    return PolicyService.create_policy(db, policy_in)

@router.get("", response_model=List[PolicyRead])
def list_policies(merchant_id: UUID, db: Session = Depends(get_db)):
    return PolicyService.list_policies(db, merchant_id)

@router.get("/{policy_id}", response_model=PolicyRead)
def get_policy(policy_id: UUID, db: Session = Depends(get_db)):
    policy = PolicyService.get_policy(db, policy_id)
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy with ID {policy_id} does not exist"
        )
    return policy

@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_policy(policy_id: UUID, db: Session = Depends(get_db)):
    PolicyService.delete_policy(db, policy_id)
    return None

@router.post("/evaluate", response_model=PolicyDecision)
def evaluate_action_endpoint(action: ProposedAction, db: Session = Depends(get_db)):
    """
    Evaluates a proposed transaction action against all active policies for the merchant.
    """
    policies = PolicyService.list_policies(db, action.merchant_id)
    redis_client = None
    try:
        redis_client = get_redis_client()
    except Exception as e:
        print(f"[DEBUG] Redis client error: {e}")

    decision = evaluate(action=action, policies=policies, redis_client=redis_client)

    is_allow = (
        decision.decision == DecisionEnum.ALLOW or 
        getattr(decision.decision, "value", None) == "ALLOW" or 
        str(decision.decision) == "ALLOW" or 
        str(decision.decision) == "DecisionEnum.ALLOW"
    )

    if is_allow and redis_client:
        for p in policies:
            r_type = getattr(p, "rule_type", None) if not isinstance(p, dict) else p.get("rule_type")
            if r_type == "velocity_limit":
                cfg = getattr(p, "config", {}) if not isinstance(p, dict) else p.get("config", {})
                window_seconds = int(cfg.get("window_seconds", 3600))
                rec_ok = record_velocity_event(redis_client, str(action.merchant_id), str(action.agent_id), window_seconds)
                print(f"[DEBUG] Recorded velocity event for {action.agent_id} in {window_seconds}s window: {rec_ok}")

    return decision
