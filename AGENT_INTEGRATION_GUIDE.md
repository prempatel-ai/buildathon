# Agentpay External Agent Integration Guide

Welcome to the **Agentpay Platform**. This guide provides everything an external, 3rd-party AI buyer agent developer needs to integrate unassisted against the Agentpay platform.

---

## 1. Core Architecture Overview

Agentpay acts as a secure financial execution layer between AI Buyer Agents and Merchant Stores.
All agent purchase attempts pass through the **Bounded Policy Engine** (spend limits, category allow/block rules, velocity caps) before any payment is initiated.

```text
[External AI Buyer Agent]
        │
        ├─ 1. Discover Schema: GET /catalog/agent-schema?merchant_id=<id>
        ├─ 2. Propose Order:   POST /agent/chat (Bearer agent_key_...)
        │
        ▼
[Agentpay Bounded Policy Engine]
        │
        ├──> ALLOW:           Payment Order Created & Executed Automatically
        ├──> DENY:            Action Blocked (BLOCKED_BY_POLICY / BLOCKED_BY_SCOPE)
        └──> NEEDS_APPROVAL:  Interrupt Triggered (Human Merchant Confirmation Required)
```

---

## 2. Authentication & Authorization

Every external AI Agent must authenticate using an **Agent API Key**.

- **Key Format**: `agent_key_<24_char_hex>`
- **Header**: Pass key string in body payload `agent_id` or as `Authorization: Bearer agent_key_...`
- **Scope Permissions**:
  - `read_catalog`: Query product inventory, stock, and pricing.
  - `propose_order`: Propose order purchases for policy evaluation and settlement.
- **Environment Flags**:
  - `sandbox`: Test mode keys used for developer sandbox integration.
  - `live`: Production keys used for live merchant stores.
  - *Attempting sandbox key actions against a live merchant store will return `HTTP 403 Forbidden`.*

---

## 3. Step 1: Merchant Catalog Discovery

Before proposing a purchase, query the merchant's machine-readable OpenAPI catalog schema.

```http
GET /catalog/agent-schema?merchant_id=39f7d49d-7edc-4d8a-8fb3-f1cbc63f919e HTTP/1.1
Host: api.agentpay.com
```

### Response Payload:
```json
{
  "merchant_id": "39f7d49d-7edc-4d8a-8fb3-f1cbc63f919e",
  "merchant_name": "OmniGear Store",
  "catalog": [
    {
      "id": "7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d",
      "name": "Wireless Mechanical Gaming Keyboard",
      "price": 500.00,
      "stock": 15,
      "category": "Electronics"
    }
  ]
}
```

---

## 4. Step 2: Proposing an Order Purchase

Submit purchase proposals to the `/agent/chat` endpoint:

```http
POST /agent/chat HTTP/1.1
Host: api.agentpay.com
Content-Type: application/json

{
  "merchant_id": "39f7d49d-7edc-4d8a-8fb3-f1cbc63f919e",
  "agent_id": "agent_key_ba4fffaafc62abb556779eb6",
  "prompt": "Order Wireless Mechanical Gaming Keyboard for 500 INR"
}
```

---

## 5. Policy Decision Handling for Calling Agents

The endpoint evaluates your request against the merchant's active spend policies and returns one of three policy decisions:

### A. `ALLOW` Decision (Payment Executed)
```json
{
  "merchant_id": "39f7d49d-7edc-4d8a-8fb3-f1cbc63f919e",
  "agent_id": "agent_key_ba4fffaafc62abb556779eb6",
  "policy_decision": "ALLOW",
  "reasoning": "Action approved: Proposed purchase passed all merchant policy checks.",
  "transaction_id": "6aef232f-0ab2-4aae-a783-f129ab39fcad",
  "razorpay_order_id": "order_TVJDZNi8Gaz6x7",
  "status": "PAYMENT_EXECUTED"
}
```
**Agent Action**: Order is approved and payment order is created. Proceed to payment capture verification if required.

---

### B. `DENY` Decision (Action Blocked)
```json
{
  "merchant_id": "39f7d49d-7edc-4d8a-8fb3-f1cbc63f919e",
  "agent_id": "agent_key_ba4fffaafc62abb556779eb6",
  "policy_decision": "DENY",
  "reasoning": "Denied: Requested amount ₹750.00 exceeds merchant maximum single transaction limit of ₹600.00.",
  "status": "BLOCKED_BY_POLICY"
}
```
**Agent Action**: Do NOT retry without modifying order parameters. The policy engine has hard-blocked the transaction.

---

### C. `NEEDS_APPROVAL` Decision (Human Interrupt Triggered)
```json
{
  "merchant_id": "39f7d49d-7edc-4d8a-8fb3-f1cbc63f919e",
  "agent_id": "agent_key_ba4fffaafc62abb556779eb6",
  "policy_decision": "NEEDS_APPROVAL",
  "reasoning": "Approval Required: Requested amount ₹2,500.00 exceeds auto-approval threshold of ₹1,000.00.",
  "pending_approval_id": "8c9d0e1f-2a3b-4c5d-6e7f-8a9b0c1d2e3f",
  "status": "AWAITING_HUMAN_APPROVAL"
}
```
**Agent Action**: Transaction is paused. Listen for the `needs_approval.created` webhook notification when the merchant approves or rejects the purchase.

---

## 6. Step 3: Completing & Verifying Payment Settlement

Once an order proposal returns an `ALLOW` decision (or after a human merchant approves a `NEEDS_APPROVAL` request), the transaction is initialized with a `transaction_id` and a Razorpay `razorpay_order_id`.

### Responsibility Breakdown:
- **AI Agent Responsibility**: Submits the initial purchase proposal via `POST /agent/chat` and obtains the returned `transaction_id` and `razorpay_order_id`.
- **Customer / Checkout Frontend Responsibility**: Passes the `razorpay_order_id` to the payment checkout flow (e.g. Razorpay Standard Checkout modal or netbanking gateway). Upon successful payment authorization by the payer, Razorpay returns a `razorpay_payment_id` and a cryptographic `razorpay_signature`.
- **Settlement Verification Responsibility**: The merchant application (or agent helper) submits `transaction_id`, `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` to `POST /payments/verify-and-capture` to execute signature verification and trigger backend capture status confirmation.

---

### Request Endpoint & Payload (`POST /payments/verify-and-capture`)

```http
POST /payments/verify-and-capture HTTP/1.1
Host: api.agentpay.com
Content-Type: application/json
Authorization: Bearer <merchant_jwt_or_agent_key>

{
  "transaction_id": "6aef232f-0ab2-4aae-a783-f129ab39fcad",
  "razorpay_order_id": "order_TVJDZNi8Gaz6x7",
  "razorpay_payment_id": "pay_TVJDRt2BmviMuS",
  "razorpay_signature": "9b12a83f982c47a5...<64_char_hex_hmac>"
}
```

---

### Strict Capture-Status Guarantee (Trust Signal)

> [!IMPORTANT]
> **Independent Settlement Verification Guarantee**:
> Agentpay enforces a zero-trust financial contract. The system **NEVER** marks a transaction as `settled` based on order creation or signature verification alone.
> Upon receiving a capture verification request, Agentpay's backend directly queries Razorpay's independent payment status API (`GET /v1/payments/{payment_id}`).
> The word `"settled"` ONLY appears in the Agentpay database when Razorpay's official API independently confirms `status: "captured"` and `captured: true`. If Razorpay returns any non-captured state (`authorized`, `failed`, `refunded`), the transaction is transitioned to `failed`.

---

### Settlement Response Payloads

#### A. Successful Settlement (`settled`)
```json
{
  "id": "6aef232f-0ab2-4aae-a783-f129ab39fcad",
  "merchant_id": "39f7d49d-7edc-4d8a-8fb3-f1cbc63f919e",
  "amount": 500.00,
  "currency": "INR",
  "status": "settled",
  "razorpay_order_id": "order_TVJDZNi8Gaz6x7",
  "razorpay_payment_id": "pay_TVJDRt2BmviMuS",
  "error_details": null,
  "created_at": "2026-08-28T19:41:57Z"
}
```

#### B. Failed Verification or Uncaptured State (`failed`)
```json
// HTTP 400 Bad Request
{
  "detail": "Payment capture verification failed. Razorpay payment status is 'authorized' (captured: False)."
}
```
*Note: In the database, the transaction state is cleanly updated to `status: "failed"` with full error context logged in `error_details` and audit logs.*

---

## 7. Merchant Webhook Notifications & Signature Verification

Merchants receive real-time HTTP POST webhooks on state changes (`needs_approval.created`, `payment.settled`, `payment.failed`).

### Webhook Signature Verification Header:
Webhooks contain a header: `X-Agentpay-Signature: t=<timestamp>,v1=<signature>`

### Python HMAC Verification Example:
```python
import hmac
import hashlib

def verify_agentpay_webhook(raw_body_bytes: bytes, signature_header: str, webhook_secret: str) -> bool:
    parts = dict(item.split("=") for item in signature_header.split(","))
    timestamp = parts.get("t")
    received_sig = parts.get("v1")
    
    signed_payload = f"{timestamp}.{raw_body_bytes.decode('utf-8')}".encode('utf-8')
    expected_sig = hmac.new(webhook_secret.encode('utf-8'), signed_payload, hashlib.sha256).hexdigest()
    
    return hmac.compare_digest(received_sig, expected_sig)
```
