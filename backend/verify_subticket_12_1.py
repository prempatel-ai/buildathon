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
from app.models.webhook import WebhookEndpoint
from app.services.webhook_service import WebhookService
from app.schemas.transaction import PaymentOrderCreate
from app.services.payment_service import PaymentService
from fastapi.testclient import TestClient

sys.stdout.reconfigure(encoding='utf-8')
client = TestClient(app)

received_requests = []

class AuditWebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        t_recv = time.strftime('%H:%M:%S', time.localtime()) + f".{int((time.time() % 1) * 1000):03d}"
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        headers_dict = {k: v for k, v in self.headers.items()}
        received_requests.append({
            "timestamp": t_recv,
            "headers": headers_dict,
            "body_str": body.decode('utf-8'),
            "json": json.loads(body.decode('utf-8'))
        })

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"status": "delivered_ok"}')

    def log_message(self, format, *args):
        pass

def start_audit_server(port=8888):
    server = HTTPServer(('127.0.0.1', port), AuditWebhookHandler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server

def run_subticket_12_1_proof():
    print("==================================================================")
    print("SUBTICKET 12.1 — RAW EVIDENCE FOR PHASE 11 WEBHOOKS & DOCUMENTS")
    print("==================================================================\n")

    port = 8888
    url = f"http://127.0.0.1:{port}/webhook-receiver"
    secret = "whsec_subticket121_secret999"
    start_audit_server(port)

    # 1. Setup Merchant & Webhook Endpoint
    email_a = f"merchant_sub121_{uuid.uuid4().hex[:6]}@store.com"
    pwd = "MerchantPassword123!"

    reg_res = client.post("/auth/register", json={"name": "Subticket 12.1 Store", "email": email_a, "password": pwd}).json()
    merchant_id = reg_res["merchant_id"]
    jwt_token = reg_res["access_token"]
    headers_a = {"Authorization": f"Bearer {jwt_token}"}

    client.post("/webhooks", json={"url": url, "secret": secret}, headers=headers_a)

    # Onboard Catalog & Policy (max=5000, approval=1000)
    client.post("/catalog/items", json={"merchant_id": merchant_id, "name": "4K Ultra HD Monitor", "price": 2500.00, "stock": 5, "category": "Electronics"}, headers=headers_a)
    
    db = SessionLocal()
    m_pol = Policy(merchant_id=uuid.UUID(merchant_id), rule_type="max_amount", config={"max_amount": 5000.00, "approval_threshold": 1000.00})
    db.add(m_pol)
    db.commit()

    ag_res = client.post("/merchants/agents", json={"name": "Subticket 12.1 Agent", "scopes": ["read_catalog", "propose_order"]}, headers=headers_a).json()
    ag_key = ag_res["api_key"]

    # ------------------------------------------------------------------
    # ITEM 1 & 2: Raw HTTP Webhook Payloads & HMAC Computation Proof
    # ------------------------------------------------------------------
    print("[ITEM 1 & 2: RAW RECEIVED WEBHOOK PAYLOADS & HMAC PROOF]")
    
    # Trigger needs_approval event
    client.post("/agent/chat", json={"merchant_id": merchant_id, "agent_id": ag_key, "prompt": "Order 4K Ultra HD Monitor for 2500 INR"})
    time.sleep(0.5)

    na_req = received_requests[-1]
    print("\n--- RAW HTTP POST: needs_approval.created ---")
    print("Received Timestamp:", na_req["timestamp"])
    print("Headers:")
    for k, v in na_req["headers"].items():
        print(f"  {k}: {v}")
    print("Body:")
    print(na_req["body_str"])

    # HMAC Proof for needs_approval
    sig_header = na_req["headers"].get("X-Agentpay-Signature") or na_req["headers"].get("x-agentpay-signature")
    parts = dict(p.split("=") for p in sig_header.split(","))
    ts_val = parts["t"]
    v1_val = parts["v1"]

    signed_bytes = f"{ts_val}.{na_req['body_str']}".encode("utf-8")
    expected_v1 = hmac.new(secret.encode("utf-8"), signed_bytes, hashlib.sha256).hexdigest()

    print("\n--- HMAC SIGNATURE INDEPENDENT VERIFICATION COMPUTATION ---")
    print(f"Signing Secret:        {secret}")
    print(f"Header Timestamp (t):  {ts_val}")
    print(f"Received v1 Signature: {v1_val}")
    print(f"Computed v1 Signature: {expected_v1}")
    print(f"HMAC Strict Match:     {hmac.compare_digest(v1_val, expected_v1)}")

    # Trigger payment.settled event
    import re
    order_res = PaymentService.create_payment_order(db=db, order_in=PaymentOrderCreate(merchant_id=uuid.UUID(merchant_id), amount=Decimal("500.00"), currency="INR", idempotency_key=f"idemp_sub121_{uuid.uuid4().hex[:8]}"))
    tx_id = order_res.id
    order_id = order_res.razorpay_order_id

    r1 = requests.post("https://api.razorpay.com/v1/payments/create/checkout", data={"key_id": settings.RAZORPAY_KEY_ID, "amount": 50000, "currency": "INR", "order_id": order_id, "email": email_a, "contact": "9876543210", "method": "netbanking", "bank": "YESB"})
    pay_id = re.search(r'var payment_id = "(pay_[^"]+)";', r1.text).group(1)
    act1 = re.search(r'action="([^"]+)"', r1.text).group(1)
    cb1 = re.search(r'name="callback_url" value="([^"]+)"', r1.text).group(1)
    pid_raw = re.search(r'name="payment_id" value="([^"]+)"', r1.text).group(1)

    r2 = requests.post(act1, data={"action": "authorize", "amount": "50000", "method": "netbanking", "payment_id": pid_raw, "callback_url": cb1, "recurring": "0"})
    act2 = re.search(r'action="([^"]+)"', r2.text).group(1)
    cb2 = re.search(r'name="callback_url" value="([^"]+)"', r2.text).group(1)
    requests.post(act2, data={"callback_url": cb2, "language_code": "en", "success": "S"})

    sig = hmac.new(settings.RAZORPAY_KEY_SECRET.encode('utf-8'), f"{order_id}|{pay_id}".encode('utf-8'), hashlib.sha256).hexdigest()
    client.post("/payments/verify-and-capture", json={"transaction_id": str(tx_id), "razorpay_order_id": order_id, "razorpay_payment_id": pay_id, "razorpay_signature": sig}, headers=headers_a)
    
    time.sleep(0.5)
    settled_req = received_requests[-1]
    print("\n--- RAW HTTP POST: payment.settled ---")
    print("Received Timestamp:", settled_req["timestamp"])
    print("Headers:")
    for k, v in settled_req["headers"].items():
        print(f"  {k}: {v}")
    print("Body:")
    print(settled_req["body_str"])

    # ------------------------------------------------------------------
    # ITEM 3: Failed Webhook Retry Logs with Real Timestamps
    # ------------------------------------------------------------------
    print("\n[ITEM 3: FAILED WEBHOOK DELIVERY RETRY LOGS WITH TIMESTAMPS]")
    client.post("/webhooks", json={"url": "http://127.0.0.1:9999/down-endpoint", "secret": "whsec_fail_sub121"}, headers=headers_a)

    print("Firing Test Webhook to Unreachable Endpoint (http://127.0.0.1:9999/down-endpoint)...")
    fail_res = client.post("/webhooks/test", headers=headers_a).json()
    print(json.dumps(fail_res, indent=2))

    wh_logs = client.get("/webhooks", headers=headers_a).json()["logs"]
    failed_log = wh_logs[0]
    print(f"Logged Delivery Attempt Count: {failed_log['attempts']}")
    print(f"Logged Final Status:          {failed_log['status']}")
    print(f"Logged Response Status:       {failed_log['response_status']}")
    print(f"Logged Error Message:         {failed_log['error_message']}")

    # ------------------------------------------------------------------
    # ITEM 4: Sandbox vs Live Environment Guard Rejection Request/Response Pair
    # ------------------------------------------------------------------
    print("\n[ITEM 4: SANDBOX VS LIVE REJECTION PAIR (REQUEST / RESPONSE)]")
    m_live = Merchant(id=uuid.uuid4(), name="Live Merchant Store", email=f"live_sub121_{uuid.uuid4().hex[:6]}@store.com", environment="live")
    db.add(m_live)
    db.commit()

    ag_sb_raw = f"agent_key_{uuid.uuid4().hex[:12]}"
    ag_sb_hash = hashlib.sha256(ag_sb_raw.encode()).hexdigest()
    ag_sb = Agent(id=uuid.uuid4(), merchant_id=m_live.id, name="Sandbox Agent Key", api_key_hash=ag_sb_hash, environment="sandbox")
    db.add(ag_sb)
    db.commit()

    env_req_payload = {
        "merchant_id": str(m_live.id),
        "agent_id": ag_sb_raw,
        "prompt": "Order Wireless Keyboard for 500 INR"
    }

    print("\n[RAW REQUEST: POST /agent/chat (Sandbox Agent Key against Live Merchant)]")
    print(json.dumps(env_req_payload, indent=2))

    env_res = client.post("/agent/chat", json=env_req_payload)
    print(f"\n[RAW RESPONSE: POST /agent/chat] Status: {env_res.status_code}")
    print(json.dumps(env_res.json(), indent=2))

    db.close()
    print("\n==================================================================")
    print("SUBTICKET 12.1 VERIFICATION COMPLETE — ALL PROOFS GENERATED!")
    print("==================================================================")

if __name__ == "__main__":
    run_subticket_12_1_proof()
