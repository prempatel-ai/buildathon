from uuid import UUID
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.policy import Policy
from app.models.merchant import Merchant
from app.schemas.policy import PolicyCreate, PolicyUpdate

class PolicyService:
    @staticmethod
    def create_policy(db: Session, policy_in: PolicyCreate) -> Policy:
        merchant = db.query(Merchant).filter(Merchant.id == policy_in.merchant_id).first()
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Merchant with ID {policy_in.merchant_id} does not exist"
            )

        policy = Policy(
            merchant_id=policy_in.merchant_id,
            rule_type=policy_in.rule_type,
            config=policy_in.config
        )
        db.add(policy)
        db.commit()
        db.refresh(policy)
        return policy

    @staticmethod
    def get_policy(db: Session, policy_id: UUID) -> Optional[Policy]:
        return db.query(Policy).filter(Policy.id == policy_id).first()

    @staticmethod
    def list_policies(db: Session, merchant_id: UUID) -> List[Policy]:
        merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Merchant with ID {merchant_id} does not exist"
            )
        return db.query(Policy).filter(Policy.merchant_id == merchant_id).all()

    @staticmethod
    def delete_policy(db: Session, policy_id: UUID) -> bool:
        policy = PolicyService.get_policy(db, policy_id)
        if not policy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Policy with ID {policy_id} does not exist"
            )
        db.delete(policy)
        db.commit()
        return True
