import uuid
import re
import time
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID
import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.catalog import CatalogItem
from app.models.policy import Policy
from app.models.transaction import Transaction
from app.models.audit import AuditEvent
from app.models.customer import Customer
from app.services.audit_service import AuditService

router = APIRouter(prefix="/admin", tags=["Platform Admin Governance"])

# ─── Master Admin Credentials & Auth ──────────────────────────────────────────

ADMIN_USERNAME = "admin"
ADMIN_PASSWORDS = ["Admin@Agentpay2026", "Admin@1234", "Razorpay@Admin2026"]
JWT_ALGORITHM = "HS256"

def create_admin_token(username: str) -> str:
    payload = {
        "sub": username,
        "role": "super_admin",
        "iss": "agentpay_platform_admin",
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)

def get_current_admin(
    authorization: Optional[str] = Header(None),
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key")
) -> Dict[str, Any]:
    """
    Verifies super admin bearer JWT token or master admin secret key.
    Enforces strict access control over all admin endpoints.
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1].strip()
    elif x_admin_key:
        if x_admin_key in ADMIN_PASSWORDS or x_admin_key == settings.SECRET_KEY:
            return {"sub": "admin", "role": "super_admin"}
        token = x_admin_key

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required. Missing Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient administrative privileges."
            )
        return payload
    except jwt.PyJWTError:
        # Fallback check if token itself is raw admin master key
        if token in ADMIN_PASSWORDS:
            return {"sub": "admin", "role": "super_admin"}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired admin authorization token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

# ─── Privacy Masking Helper ───────────────────────────────────────────────────

def mask_sensitive_pii(data: Any) -> Any:
    """
    Recursively masks sensitive personally identifiable information (PII),
    including customer phone numbers, full street addresses, card token secrets,
    and API key hashes.
    """
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            key_lower = k.lower()
            if key_lower in ["password", "password_hash", "token_secret", "secret"]:
                sanitized[k] = "[REDACTED]"
            elif key_lower in ["phone", "contact", "mobile"]:
                val_str = str(v)
                sanitized[k] = f"{val_str[:3]}******{val_str[-4:]}" if len(val_str) >= 7 else "******"
            elif key_lower in ["email"]:
                val_str = str(v)
                if "@" in val_str:
                    parts = val_str.split("@")
                    sanitized[k] = f"{parts[0][:1]}***@{parts[1]}"
                else:
                    sanitized[k] = "******"
            elif key_lower in ["line1", "line2", "street"]:
                sanitized[k] = "[MASKED_RESIDENTIAL_LINE]"
            elif key_lower in ["card_number", "card_token"]:
                val_str = str(v)
                sanitized[k] = f"•••• •••• •••• {val_str[-4:]}" if len(val_str) >= 4 else "••••"
            elif key_lower in ["delivery_address", "delivery_address_summary"]:
                val_str = str(v)
                match = re.search(r'([A-Za-z\s]+,\s*[A-Za-z\s]+\s*\(\d+\))', val_str)
                if match:
                    sanitized[k] = f"Masked Destination, {match.group(1)}"
                else:
                    sanitized[k] = "Verified Customer Destination (Masked)"
            else:
                sanitized[k] = mask_sensitive_pii(v)
        return sanitized
    elif isinstance(data, list):
        return [mask_sensitive_pii(item) for item in data]
    return data

# ─── Admin Schemas ────────────────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    username: str = Field(..., description="Admin login username")
    password: str = Field(..., description="Admin master password")

class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str = "super_admin"
    username: str

class PlatformOverviewResponse(BaseModel):
    total_merchants: int
    verified_merchants: int
    total_customers: int
    total_catalog_items: int
    total_policies_enforced: int
    total_audit_events: int
    total_settled_volume_inr: float
    total_settled_transactions: int

class AdminMerchantItem(BaseModel):
    id: str
    name: str
    email: str
    kyc_status: str
    environment: str
    catalog_count: int
    policy_count: int
    created_at: Optional[str] = None

class AdminAuditItem(BaseModel):
    id: str
    merchant_id: Optional[str] = None
    merchant_name: Optional[str] = None
    actor_type: str
    actor_id: str
    action: str
    decision: str
    reasoning: str
    input: Dict[str, Any]
    created_at: Optional[str] = None

class AdminAuditResponse(BaseModel):
    total: int
    items: List[AdminAuditItem]
    skip: int
    limit: int

class UpdateKYCPayload(BaseModel):
    kyc_status: str  # "verified", "pending", "suspended"

# ─── Auth Endpoint ────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=AdminLoginResponse)
def admin_login(req: AdminLoginRequest):
    """
    Super Admin Authentication:
    Authenticates platform administrator and issues a signed JWT.
    """
    user_clean = req.username.strip().lower()
    if user_clean not in ["admin", "superadmin", "agentpay_admin"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials."
        )

    if req.password not in ADMIN_PASSWORDS and req.password != settings.SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials."
        )

    token = create_admin_token(username=user_clean)
    return AdminLoginResponse(
        access_token=token,
        token_type="bearer",
        role="super_admin",
        username=user_clean
    )

# ─── Protected Governance Endpoints ───────────────────────────────────────────

@router.get("/overview", response_model=PlatformOverviewResponse)
def get_platform_overview(
    admin: Dict[str, Any] = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Returns platform-wide metrics with zero PII exposure."""
    total_merchants = db.query(Merchant).count()
    verified_merchants = db.query(Merchant).filter(Merchant.kyc_status == "verified").count()
    total_customers = db.query(Customer).count()
    total_catalog_items = db.query(CatalogItem).count()
    total_policies_enforced = db.query(Policy).count()
    total_audit_events = db.query(AuditEvent).count()

    settled_txs = db.query(Transaction).filter(Transaction.status == "SETTLED").all()
    total_settled_volume = sum(float(tx.amount) for tx in settled_txs)
    total_settled_count = len(settled_txs)

    return PlatformOverviewResponse(
        total_merchants=total_merchants,
        verified_merchants=verified_merchants,
        total_customers=total_customers,
        total_catalog_items=total_catalog_items,
        total_policies_enforced=total_policies_enforced,
        total_audit_events=total_audit_events,
        total_settled_volume_inr=total_settled_volume,
        total_settled_transactions=total_settled_count
    )

@router.get("/merchants", response_model=List[AdminMerchantItem])
def list_admin_merchants(
    admin: Dict[str, Any] = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Returns all registered merchants for moderation."""
    merchants = db.query(Merchant).order_by(Merchant.name.asc()).all()
    results = []
    for m in merchants:
        cat_count = db.query(CatalogItem).filter(CatalogItem.merchant_id == m.id).count()
        pol_count = db.query(Policy).filter(Policy.merchant_id == m.id).count()
        results.append(AdminMerchantItem(
            id=str(m.id),
            name=m.name,
            email=m.email,
            kyc_status=m.kyc_status or "pending",
            environment=m.environment or "live",
            catalog_count=cat_count,
            policy_count=pol_count,
            created_at=m.created_at.isoformat() if hasattr(m, 'created_at') and m.created_at else None
        ))
    return results

@router.patch("/merchants/{merchant_id}/kyc")
def update_merchant_kyc(
    merchant_id: UUID,
    payload: UpdateKYCPayload,
    admin: Dict[str, Any] = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin moderation endpoint to verify or suspend merchant accounts."""
    m = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")

    valid_statuses = ["verified", "pending", "suspended"]
    if payload.kyc_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")

    old_status = m.kyc_status
    m.kyc_status = payload.kyc_status
    db.commit()

    # Log admin moderation audit event
    AuditService.log_event(
        db=db,
        actor_type="system",
        actor_id="admin_moderator",
        action="merchant_kyc_moderated",
        input={"merchant_id": str(m.id), "old_status": old_status, "new_status": payload.kyc_status},
        decision="ALLOW",
        reasoning=f"Admin moderator updated KYC status of '{m.name}' to '{payload.kyc_status}'.",
        merchant_id=m.id
    )

    return {"message": f"Merchant KYC status updated to {payload.kyc_status}", "merchant_id": str(m.id)}

@router.get("/audit", response_model=AdminAuditResponse)
def get_admin_audit_stream(
    merchant_id: Optional[UUID] = Query(None),
    actor_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    sort_order: str = Query("desc"),
    admin: Dict[str, Any] = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Global platform audit stream for super admin with automated privacy masking.
    All sensitive consumer PII (phones, full addresses, card token secrets) are masked.
    """
    items, total = AuditService.list_audit_events(
        db=db,
        merchant_id=merchant_id,
        actor_type=actor_type,
        action=action,
        skip=skip,
        limit=limit,
        sort_order=sort_order
    )

    admin_items = []
    for ev in items:
        m_name = None
        if ev.merchant_id:
            m = db.query(Merchant).filter(Merchant.id == ev.merchant_id).first()
            if m:
                m_name = m.name

        # Sanitize input payload to protect consumer privacy
        masked_input = mask_sensitive_pii(ev.input or {})

        admin_items.append(AdminAuditItem(
            id=str(ev.id),
            merchant_id=str(ev.merchant_id) if ev.merchant_id else None,
            merchant_name=m_name,
            actor_type=ev.actor_type,
            actor_id=str(ev.actor_id),
            action=ev.action,
            decision=ev.decision,
            reasoning=ev.reasoning,
            input=masked_input,
            created_at=ev.created_at.isoformat() if ev.created_at else None
        ))

    return AdminAuditResponse(
        total=total,
        items=admin_items,
        skip=skip,
        limit=limit
    )
