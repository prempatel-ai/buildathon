import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import time
import json
import uuid
import hmac
import hashlib
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from decimal import Decimal
import requests

from main import app
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.merchant import Merchant
from app.models.agent import Agent
from app.models.policy import Policy
from app.models.catalog import CatalogItem
from app.models.webhook import WebhookEndpoint
from app.services.webhook_service import WebhookService
from app.schemas.transaction import PaymentOrderCreate, PaymentVerifyRequest
from app.services.payment_service import PaymentService
from fastapi.testclient import TestClient

sys.stdout.reconfigure(encoding='utf-8')
client = TestClient(app)

received_webhooks = []

class WebhookReceiverHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        sig_header = self.headers.get('X-Agentpay-Signature')

        payload_json = json.loads(body.decode('utf-8'))
        received_webhooks.append({
            "path": self.path,
            "signature_header": sig_header,
            "body_bytes": body,
            "payload": payload_json
        })

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"status": "received"}')

    def log_message(self, format, *args):
        pass

def start_local_webhook_server(port=8888):
    server = HTTPServer(('127.0.0.1', port), WebhookReceiverHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server

def run_phase11_verification():
    print("==================================================================")
    print("PHASE 11 VERIFICATION — EXTERNAL AGENT INTEGRATION & WEBHOOKS AUDIT")
    print("==================================================================\n")

    # Start Local HTTP Webhook Server
    webhook_port = 8888
    webhook_url = f"http://127.0.0.1:{webhook_port}/webhook-listener"
    webhook_secret = "whsec_phase11_secret123"
    start_local_webhook_server(webhook_port)
    print(f"Started Local HTTP Webhook Receiver at {webhook_url}")

    # ------------------------------------------------------------------
    # 1. Register Merchant & Webhook Endpoint
    # ------------------------------------------------------------------
    email_a = f"merchant_p11_{uuid.uuid4().hex[:6]}@store.com"
    pwd = "MerchantPassword123!"

    reg_res = client.post("/auth/register", json={
        "name": "Phase 11 Merchant Store",
        "email": email_a,
        "password": pwd
    }).json()

    merchant_id = reg_res["merchant_id"]
    jwt_token = reg_res["access_token"]
    headers = {"Authorization": f"Bearer {jwt_token}"}

    # Register Webhook Endpoint via API
    wh_reg = client.post("/webhooks", json={
        "url": webhook_url,
        "secret": webhook_secret
    }, headers=headers).json()
    print(f"Registered Webhook Endpoint: {wh_reg['url']} (Secret: {wh_reg['secret']})")

    # Onboard Catalog Item
    client.post("/catalog/items", json={
        "merchant_id": merchant_id,
        "name": "High Precision Gaming Mouse",
        "price": 2500.00,
        "stock": 10,
        "category": "Electronics"
    }, headers=headers)

    # Set Policy: max_amount = 5000.00, approval_threshold = 1000.00
    db = SessionLocal()
    m_pol = Policy(merchant_id=uuid.UUID(merchant_id), rule_type="max_amount", config={"max_amount": 5000.00, "approval_threshold": 1000.00})
    db.add(m_pol)
    db.commit()

    # Create Authorized Agent Key
    ag_res = client.post("/merchants/agents", json={
        "name": "External Buyer Agent Key",
        "scopes": ["read_catalog", "propose_order"]
    }, headers=headers).json()
    agent_key = ag_res["api_key"]

    # ------------------------------------------------------------------
    # 2. Real needs_approval Webhook Dispatch & HMAC Verification
    # ------------------------------------------------------------------
    print("\n------------------------------------------------------------------")
    print("PROVING NEEDS_APPROVAL WEBHOOK DISPATCH & HMAC SIGNATURE VERIFICATION")
    print("------------------------------------------------------------------")
    print("Proposing Order for ₹2,500.00 (Exceeds ₹1,000.00 approval threshold)...")
    chat_na = client.post("/agent/chat", json={
        "merchant_id": merchant_id,
        "agent_id": agent_key,
        "prompt": "Order High Precision Gaming Mouse for 2500 INR"
    }).json()

    print(f"  - Policy Decision: {chat_na.get('policy_decision')}")
    print(f"  - Agent Status:    {chat_na.get('status')}")

    time.sleep(0.5)
    assert len(received_webhooks) > 0, "No webhook received for needs_approval!"
    na_webhook = received_webhooks[-1]

    print("\n[RAW RECEIVED WEBHOOK PAYLOAD (needs_approval.created)]")
    print(json.dumps(na_webhook["payload"], indent=2))
    print(f"Raw Signature Header: {na_webhook['signature_header']}")

    # Verify HMAC Signature Independently
    sig_header = na_webhook['signature_header']
    parts = dict(item.split("=") for item in sig_header.split(","))
    timestamp = parts["t"]
    received_v1 = parts["v1"]

    payload_json_str = json.dumps(na_webhook["payload"], separators=(',', ':'))
    signed_bytes = f"{timestamp}.{payload_json_str}".encode("utf-8")
    expected_v1 = hmac.new(webhook_secret.encode("utf-8"), signed_bytes, hashlib.sha256).hexdigest()

    print(f"\n[HMAC SHA-256 SIGNATURE INDEPENDENT VERIFICATION CHECK]")
    print(f"  - Received v1 Signature: {received_v1}")
    print(f"  - Expected v1 Signature: {expected_v1}")
    print(f"  - HMAC Match Result:      {hmac.compare_digest(received_v1, expected_v1)}")
    assert hmac.compare_digest(received_v1, expected_v1), "HMAC Signature verification failed!"

    # ------------------------------------------------------------------
    # 3. Real payment.settled Webhook Dispatch
    # ------------------------------------------------------------------
    print("\n------------------------------------------------------------------")
    print("PROVING PAYMENT.SETTLED WEBHOOK DISPATCH")
    print("------------------------------------------------------------------")
    
    # Run genuine settled payment
    order_res = PaymentService.create_payment_order(
        db=db,
        order_in=PaymentOrderCreate(
            merchant_id=uuid.UUID(merchant_id),
            amount=Decimal("500.00"),
            currency="INR",
            idempotency_key=f"idemp_wh_{uuid.uuid4().hex[:8]}"
        )
    )
    tx_id = order_res.id
    order_id = order_res.razorpay_order_id

    # Execute Netbanking Mock-Authorize
    checkout_url = "https://api.razorpay.com/v1/payments/create/checkout"
    r1 = requests.post(checkout_url, data={
        "key_id": settings.RAZORPAY_KEY_ID,
        "amount": 50000,
        "currency": "INR",
        "order_id": order_id,
        "email": email_a,
        "contact": "9876543210",
        "method": "netbanking",
        "bank": "YESB"
    })
    import re
    pay_id = re.search(r'var payment_id = "(pay_[^"]+)";', r1.text).group(1)
    action1_url = re.search(r'action="([^"]+)"', r1.text).group(1)
    cb1_url = re.search(r'name="callback_url" value="([^"]+)"', r1.text).group(1)
    pid_raw = re.search(r'name="payment_id" value="([^"]+)"', r1.text).group(1)

    r2 = requests.post(action1_url, data={"action": "authorize", "amount": "50000", "method": "netbanking", "payment_id": pid_raw, "callback_url": cb1_url, "recurring": "0"})
    action2_url = re.search(r'action="([^"]+)"', r2.text).group(1)
    cb2_url = re.search(r'name="callback_url" value="([^"]+)"', r2.text).group(1)
    requests.post(action2_url, data={"callback_url": cb2_url, "language_code": "en", "success": "S"})

    msg = f"{order_id}|{pay_id}".encode('utf-8')
    sig = hmac.new(settings.RAZORPAY_KEY_SECRET.encode('utf-8'), msg, hashlib.sha256).hexdigest()

    client.post("/payments/verify-and-capture", json={
        "transaction_id": str(tx_id),
        "razorpay_order_id": order_id,
        "razorpay_payment_id": pay_id,
        "razorpay_signature": sig
    }, headers=headers)

    time.sleep(0.5)
    settled_webhook = received_webhooks[-1]
    print("\n[RAW RECEIVED WEBHOOK PAYLOAD (payment.settled)]")
    print(json.dumps(settled_webhook["payload"], indent=2))
    assert settled_webhook["payload"].get("event") == "payment.settled", "Expected payment.settled event!"

    # ------------------------------------------------------------------
    # 4. Sandbox vs Live Environment Guard Rejection Proof
    # ------------------------------------------------------------------
    print("\n------------------------------------------------------------------")
    print("PROVING SANDBOX VS LIVE ENVIRONMENT GUARD REJECTION (403 FORBIDDEN)")
    print("------------------------------------------------------------------")
    m_live = Merchant(id=uuid.uuid4(), name="Live Store", email=f"live_{uuid.uuid4().hex[:6]}@store.com", environment="live")
    db.add(m_live)
    db.commit()

    ag_sb_raw = f"agent_key_{uuid.uuid4().hex[:12]}"
    ag_sb_hash = hashlib.sha256(ag_sb_raw.encode()).hexdigest()
    ag_sb = Agent(id=uuid.uuid4(), merchant_id=m_live.id, name="Sandbox Agent Key", api_key_hash=ag_sb_hash, environment="sandbox")
    db.add(ag_sb)
    db.commit()

    env_res = client.post("/agent/chat", json={
        "merchant_id": str(m_live.id),
        "agent_id": ag_sb_raw,
        "prompt": "Order item for 100 INR"
    })
    print(f"  - Environment Rejection HTTP Status: {env_res.status_code}")
    print(f"  - Environment Rejection Detail:      {env_res.json().get('detail')}")
    assert env_res.status_code == 403, "Environment mismatch guard failed!"

    # ------------------------------------------------------------------
    # 5. Webhook Failure Retry & Log Output
    # ------------------------------------------------------------------
    print("\n------------------------------------------------------------------")
    print("PROVING WEBHOOK FAILURE RETRIES & DELIVERY LOGGING")
    print("------------------------------------------------------------------")
    
    # Update webhook URL to unreachable endpoint
    client.post("/webhooks", json={
        "url": "http://127.0.0.1:9999/unreachable-endpoint",
        "secret": "whsec_fail123"
    }, headers=headers)

    test_res = client.post("/webhooks/test", headers=headers).json()
    print("Test Webhook Dispatch Result against Unreachable Endpoint:")
    print(json.dumps(test_res, indent=2))
    assert test_res.get("status") == "failed", "Expected delivery failure!"
    assert test_res.get("attempts") == 3, "Expected 3 retry attempts!"

    db.close()
    print("\n==================================================================")
    print("PHASE 11 VERIFICATION COMPLETE — ALL WEBHOOK PROOFS PASSED!")
    print("==================================================================")

if __name__ == "__main__":
    run_phase11_verification()
