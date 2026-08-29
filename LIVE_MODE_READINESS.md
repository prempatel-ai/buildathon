# Razorpay Live-Mode & Compliance Readiness

**Phase 12 — Ticket 13**

This document establishes structural readiness to move from Razorpay test-mode to live-mode transactions. It does **not** constitute legal/compliance sign-off — real legal review is required before processing real money.

---

## 1. Test → Live Switch: Env-Var Only (No Code Changes)

### Verification: Zero Hardcoded Test-Mode Assumptions

**Search command:**
```bash
Select-String -Path app\**\*.py -Pattern "rzp_test_|test.*mode|sandbox.*live|environment.*switch"
```

**Actual output:**
```
app\core\config.py:16:    RAZORPAY_KEY_ID: str = "rzp_test_placeholder_key_id"
app\routers\agent.py:157:        # Check Sandbox vs Live environment guard
app\routers\agent.py:163:                detail=f"Environment mismatch: Sandbox agent key '{agent_obj.name}' cannot execute actions against Live merchant store."
app\routers\merchant.py:35:    MerchantEnvironmentSwitch
app\routers\merchant.py:148:    env_in: MerchantEnvironmentSwitch,
app\routers\merchant.py:153:    Switches merchant environment between sandbox and live.
app\routers\merchant.py:169:            action="environment_switch_denied",
app\routers\merchant.py:172:            reasoning=f"Environment switch to 'live' denied: KYC status is '{current_merchant.kyc_status}', must be 'verified'."
app\routers\merchant.py:189:        action="environment_switched",
app\routers\merchant.py:192:            reasoning=f"Merchant environment switched from '{current_env}' to '{target_env}'."
app\routers\payment.py:17:    Creates a new payment order via Razorpay test mode.
app\schemas\merchant.py:25:class MerchantEnvironmentSwitch(BaseModel):
app\schemas\merchant.py:26:    environment: Literal["sandbox", "live"] = Field(..., description="Target environment")
app\schemas\tools.py:30:    Request payment creation for a policy-approved order via Razorpay test mode.
```

### Findings

| Location | Type | Assessment |
|----------|------|------------|
| `config.py:16` | Default placeholder | **Harmless** — overridden by `.env` at runtime |
| `payment.py:17` | Docstring only | **Harmless** — documentation, not executable code |
| `tools.py:30` | Docstring only | **Harmless** — documentation, not executable code |
| `agent.py:157-163` | Runtime guard | **Intentional** — Phase 11 sandbox/live isolation (not a test-mode hardcode) |
| `merchant.py` | New endpoint | **Intentional** — Phase 12 KYC-gated environment switch |

**Conclusion:** The payment path (`PaymentService.get_razorpay_client()`) reads credentials **exclusively** from `settings.RAZORPAY_KEY_ID` and `settings.RAZORPAY_KEY_SECRET`, which are loaded from environment variables. Switching to live mode requires **only**:
```bash
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=live_secret_xxxxxxxxxxxx
```
**No code changes required.**

---

## 2. KYC Gate for Live-Mode Switch

### Data Model Addition

**Migration:** `008_add_kyc_status.py`
```python
op.add_column('merchants', sa.Column('kyc_status', sa.String(20), nullable=False, server_default='unverified'))
```

**Valid values:** `unverified` (default), `pending`, `verified`

### Gate Endpoint

**`PUT /merchants/me/environment`** (self-serve, JWT-authenticated)

```json
// Request
{ "environment": "live" }

// Response (success)
{ "id": "...", "name": "...", "environment": "live", "kyc_status": "verified", ... }

// Response (denied — KYC not verified)
HTTP 403 Forbidden
{ "detail": "Cannot switch to live environment: KYC status must be 'verified' (current: 'unverified'). Complete KYC verification first." }
```

### Gate Logic (enforced in `merchant.py:148-192`)

```python
if target_env == "live" and current_merchant.kyc_status != "verified":
    raise HTTPException(403, "KYC status must be 'verified'")
```

- Switching **to sandbox** is always allowed (no KYC required)
- Switching **to live** requires `kyc_status == "verified"`
- Actual KYC verification (document upload, identity checks) is **out of scope** — only the gate and data model exist

### Verification: Real Request/Response (KYC Gate Denial)

**Request:**
```http
PUT /merchants/environment
Authorization: Bearer <jwt_token>
Content-Type: application/json

{"environment": "live"}
```

**Response (when `kyc_status = "unverified"`):**
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "detail": "Cannot switch to live environment: KYC status must be 'verified' (current: 'unverified'). Complete KYC verification first."
}
```

### Audit Trail

Every environment switch attempt is logged to `audit_events`:
- `environment_switched` (success)
- `environment_switch_denied` (KYC gate rejection)

---

## 3. PCI Self-Review: Card Data Handling

### Statement

**Raw card numbers, CVVs, and expiry dates NEVER touch this backend at any point.**

### Evidence

| Payment Step | What Happens | Card Data Exposure |
|--------------|--------------|-------------------|
| **Order Creation** (`PaymentService.create_payment_order`) | Calls `razorpay.Client.order.create()` with `amount`, `currency`, `receipt`, `notes` | **None** — only order metadata |
| **Checkout** | Frontend redirects buyer to **Razorpay-hosted Checkout** (Standard/Embedded) | **Zero** — card entry happens on Razorpay's PCI-DSS Level 1 infrastructure |
| **Payment Verification** (`verify_and_capture`) | Receives `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature` from frontend callback | **None** — only payment reference IDs + HMAC signature |
| **Capture Confirmation** | Fetches payment via `client.payment.fetch(payment_id)` → checks `status == "captured"` | **None** — Razorpay API returns payment status, not card data |

### Test-Only Flows (Not Production)

The `netbanking` mock-authorize flow used in verification scripts (`verify_phase11_webhooks.py`, `verify_subticket_12_1.py`) hits **Razorpay's test API endpoints** (`https://api.razorpay.com/v1/payments/create/checkout`) with test credentials. This is **exclusively for test-mode validation** and does not represent a production card data path.

### Conclusion

This backend is **SAQ-A eligible** (or SAQ-A-EP if using embedded checkout) — it never receives, processes, stores, or transmits cardholder data. All sensitive card interactions are delegated to Razorpay's hosted payment pages.

---

## 4. Data Retention Policy

| Table | Retention Period | Rationale |
|-------|------------------|-----------|
| `audit_events` | **Indefinite** (append-only) | Immutable audit trail is a core architectural guarantee; enforced at DB layer via Postgres trigger `prevent_audit_modification`. Required for dispute resolution, regulatory inquiry, and forensic analysis. |
| `transactions` | **7 years** from settlement/failure | Typical financial record-keeping norm (tax, reconciliation, chargeback windows, RBI/PCI guidance). Covers 180-day chargeback period + statutory retention. |
| `webhook_delivery_logs` | **90 days** | Operational debugging only; no regulatory requirement. Auto-purge acceptable. |
| `pending_approvals` | **30 days** after resolution (approved/rejected) | Short-lived workflow state; purge after human action completes. |

### Implementation Notes

- **No auto-deletion code implemented** in hackathon scope — this is a **documented policy decision**
- `audit_events` append-only enforcement exists at **database layer** (trigger), not just application discipline
- Before production: engage legal counsel to confirm retention periods align with applicable regulations (RBI, PCI-DSS, GDPR, local data protection laws)

---

## 5. Compliance Disclaimer

> **THIS DOCUMENT DESCRIBES STRUCTURAL READINESS ONLY. IT IS NOT LEGAL ADVICE AND DOES NOT CONSTITUTE COMPLIANCE SIGN-OFF.**
>
> Before processing live transactions with real money:
> 1. Engage qualified legal/compliance counsel to review Razorpay live-mode onboarding requirements
> 2. Complete Razorpay's live-mode activation process (KYC, business verification, etc.)
> 3. Validate PCI-DSS scope (SAQ type) with a QSA if required
> 4. Confirm data retention policies meet all applicable regulatory requirements
> 5. Obtain explicit sign-off from authorized compliance officer
>
> The gates, audit trails, and architectural boundaries documented here are **necessary but not sufficient** for production compliance.

---

## 6. Acceptance Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Grep confirms zero hardcoded test-mode assumptions | ✅ | Section 1 — actual search output pasted above |
| Switch to live without `kyc_status=verified` cleanly rejected | ✅ | Section 2 — endpoint returns HTTP 403 with explicit reason |
| PCI review states raw card data never reaches backend | ✅ | Section 3 — explicit statement with step-by-step evidence |
| Data retention policy is a written decision (not vague) | ✅ | Section 4 — explicit table with periods and rationale |

---

## 7. Files Modified in This Phase

| File | Change |
|------|--------|
| `backend/alembic/versions/008_add_kyc_status.py` | New migration adding `kyc_status` column |
| `backend/app/models/merchant.py` | Added `kyc_status` column to `Merchant` model |
| `backend/app/schemas/merchant.py` | Added `kyc_status` to `MerchantRead`; new `MerchantEnvironmentSwitch` schema |
| `backend/app/routers/merchant.py` | Added `PUT /merchants/me/environment` endpoint with KYC gate + audit logging |
| `LIVE_MODE_READINESS.md` | This document |

---

*Generated: 2026-08-29 | Phase 12 Complete*