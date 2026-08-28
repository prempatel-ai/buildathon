from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
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

@router.post("/seed", response_model=MerchantRead, status_code=status.HTTP_201_CREATED)
def seed_demo_merchant(db: Session = Depends(get_db)):
    """Seed a sample demo merchant with 4 catalog items for rapid under-2-minute testing/demo."""
    merchant = MerchantService.create_merchant(
        db,
        MerchantCreate(
            name="Apex Electronics & Gear",
            razorpay_key_id="rzp_test_demo12345",
            limits_config={
                "max_transaction_amount": 50000,
                "daily_spend_limit": 200000,
                "allowed_categories": ["Electronics", "Accessories", "Gadgets"]
            }
        )
    )

    sample_items = [
        {"name": "UltraComfort Wireless Headphones", "price": 3499.00, "stock": 25, "category": "Electronics"},
        {"name": "Ergonomic Mechanical Keyboard", "price": 5999.00, "stock": 12, "category": "Electronics"},
        {"name": "USB-C Multi-Port Adapter Hub", "price": 1299.00, "stock": 40, "category": "Accessories"},
        {"name": "Smart Fitness Tracker Band", "price": 2499.00, "stock": 18, "category": "Gadgets"}
    ]

    for item in sample_items:
        CatalogService.create_catalog_item(
            db,
            CatalogItemCreate(
                merchant_id=merchant.id,
                name=item["name"],
                price=item["price"],
                stock=item["stock"],
                category=item["category"]
            )
        )

    return merchant
