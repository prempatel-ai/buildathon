import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_merchant
from app.models.merchant import Merchant
from app.schemas.campaign_offer import MerchantCampaignPerformanceResponse
from app.services.campaign_service import CampaignService

router = APIRouter(prefix="/merchants/campaigns", tags=["Merchant Abandonment Campaigns"])

@router.get("/performance", response_model=MerchantCampaignPerformanceResponse)
def get_campaign_performance(
    merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Returns exact abandonment campaign performance metrics for the authenticated merchant:
    offers generated, shown, converted, conversion rate, total discount given, and attributed GMV.
    """
    return CampaignService.get_merchant_campaign_performance(db=db, merchant_id=merchant.id)

@router.post("/trigger-scan")
def trigger_abandonment_campaign_scan(
    days_stale: int = 0,
    merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Triggers an offline/scheduled scan over historical audit logs to generate bounded
    re-engagement discount offers for unconverted shoppers.
    """
    offers = CampaignService.scan_and_generate_abandonment_offers(db=db, days_stale=days_stale)
    return {
        "status": "success",
        "days_stale_evaluated": days_stale,
        "offers_generated_count": len(offers),
        "message": f"Scan completed. Generated {len(offers)} new bounded abandonment offers."
    }
