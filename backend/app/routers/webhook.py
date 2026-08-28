import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, HttpUrl, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_merchant
from app.models.merchant import Merchant
from app.models.webhook import WebhookEndpoint, WebhookDeliveryLog
from app.services.webhook_service import WebhookService

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

class WebhookEndpointCreate(BaseModel):
    url: str = Field(..., description="HTTPS Webhook receiver URL")
    secret: Optional[str] = Field(None, description="Optional custom signing secret key")

class WebhookEndpointRead(BaseModel):
    id: str
    merchant_id: str
    url: str
    secret: str
    is_active: bool
    created_at: str

class WebhookLogRead(BaseModel):
    id: str
    event_type: str
    payload: dict
    response_status: Optional[int]
    attempts: int
    status: str
    error_message: Optional[str]
    created_at: str

@router.get("", response_model=dict)
def get_merchant_webhooks(
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Fetches merchant's configured webhook endpoint and delivery logs.
    Scoped to JWT Bearer token.
    """
    ep = db.query(WebhookEndpoint).filter(WebhookEndpoint.merchant_id == current_merchant.id).first()
    logs = db.query(WebhookDeliveryLog).filter(
        WebhookDeliveryLog.merchant_id == current_merchant.id
    ).order_by(WebhookDeliveryLog.created_at.desc()).limit(50).all()

    log_items = []
    for l in logs:
        log_items.append({
            "id": str(l.id),
            "event_type": l.event_type,
            "payload": l.payload,
            "response_status": l.response_status,
            "attempts": l.attempts,
            "status": l.status,
            "error_message": l.error_message,
            "created_at": l.created_at.isoformat() if l.created_at else None
        })

    return {
        "endpoint": {
            "id": str(ep.id),
            "merchant_id": str(ep.merchant_id),
            "url": ep.url,
            "secret": ep.secret,
            "is_active": ep.is_active,
            "created_at": ep.created_at.isoformat() if ep.created_at else None
        } if ep else None,
        "logs": log_items
    }

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def register_webhook_endpoint(
    req: WebhookEndpointCreate,
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Registers or updates merchant webhook receiving endpoint and HMAC signing secret.
    """
    secret = req.secret or f"whsec_{secrets.token_hex(16)}"
    ep = db.query(WebhookEndpoint).filter(WebhookEndpoint.merchant_id == current_merchant.id).first()

    if ep:
        ep.url = req.url
        ep.secret = secret
        ep.is_active = True
    else:
        ep = WebhookEndpoint(
            merchant_id=current_merchant.id,
            url=req.url,
            secret=secret,
            is_active=True
        )
        db.add(ep)

    db.commit()
    db.refresh(ep)

    return {
        "id": str(ep.id),
        "merchant_id": str(ep.merchant_id),
        "url": ep.url,
        "secret": ep.secret,
        "is_active": ep.is_active,
        "created_at": ep.created_at.isoformat() if ep.created_at else None
    }

@router.post("/test")
def fire_test_webhook(
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Fires a test event webhook to merchant's registered webhook URL.
    """
    test_payload = {
        "event": "test.ping",
        "merchant_id": str(current_merchant.id),
        "merchant_name": current_merchant.name,
        "message": "This is a test webhook payload from Agentpay Platform.",
        "timestamp": int(get_db.__hash__())
    }

    log = WebhookService.dispatch_event(db, current_merchant.id, "test.ping", test_payload)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active webhook endpoint configured for this merchant store."
        )

    return {
        "status": log.status,
        "delivery_id": str(log.id),
        "response_status": log.response_status,
        "attempts": log.attempts,
        "error_message": log.error_message
    }
