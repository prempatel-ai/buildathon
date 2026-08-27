from uuid import UUID
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.merchant import Merchant
from app.schemas.merchant import MerchantCreate, MerchantUpdate

class MerchantService:
    @staticmethod
    def create_merchant(db: Session, merchant_in: MerchantCreate) -> Merchant:
        merchant = Merchant(
            name=merchant_in.name,
            razorpay_key_id=merchant_in.razorpay_key_id,
            limits_config=merchant_in.limits_config
        )
        db.add(merchant)
        db.commit()
        db.refresh(merchant)
        return merchant

    @staticmethod
    def get_merchant(db: Session, merchant_id: UUID) -> Optional[Merchant]:
        return db.query(Merchant).filter(Merchant.id == merchant_id).first()

    @staticmethod
    def list_merchants(db: Session, skip: int = 0, limit: int = 100) -> List[Merchant]:
        return db.query(Merchant).offset(skip).limit(limit).all()

    @staticmethod
    def update_merchant(db: Session, merchant_id: UUID, merchant_in: MerchantUpdate) -> Optional[Merchant]:
        merchant = MerchantService.get_merchant(db, merchant_id)
        if not merchant:
            return None
        update_data = merchant_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(merchant, field, value)
        db.commit()
        db.refresh(merchant)
        return merchant
