import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import time
import json
import uuid
import hmac
import hashlib
import requests
import subprocess
from decimal import Decimal

from main import app
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.merchant import Merchant
from app.models.catalog import CatalogItem
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionStatus, PaymentOrderCreate, PaymentVerifyRequest
from app.services.payment_service import PaymentService
from fastapi.testclient import TestClient

sys.stdout.reconfigure(encoding='utf-8')
client = TestClient(app)

def run_subticket_11_1_verification():
    print("==================================================================")
    print("SUBTICKET 11.1 — RAW EVIDENCE FOR PHASE 10 SELF-SERVE & BILLING")
    print("==================================================================\n")

    # ------------------------------------------------------------------
    # 1. Register Merchant A & Get JWT Token
    # ------------------------------------------------------------------
    email_a = f"merchant_sub111_a_{uuid.uuid4().hex[:6]}@store.com"
    pwd = "MerchantPassword123!"

    print("[RAW REQUEST: POST /auth/register]")
    reg_req_payload = {"name": "Apex Self-Serve Gear", "email": email_a, "password": pwd}
    print(json.dumps(reg_req_payload, indent=2))

    reg_res = client.post("/auth/register", json=reg_req_payload)
    print(f"\n[RAW RESPONSE: POST /auth/register] Status: {reg_res.status_code}")
    print(json.dumps(reg_res.json(), indent=2))

    reg_data = reg_res.json()
    merchant_a_id = reg_data["merchant_id"]
    jwt_a = reg_data["access_token"]
    headers_a = {"Authorization": f"Bearer {jwt_a}"}

    # Onboard Catalog Item
    cat_item = client.post("/catalog/items", json={
        "merchant_id": merchant_a_id,
        "name": "Wireless Mechanical Keyboard",
        "price": 500.00,
        "stock": 20,
        "category": "Electronics"
    }, headers=headers_a).json()

    # ------------------------------------------------------------------
    # 2. Genuine Settled Transaction Flow (Razorpay Mock-Authorize + Capture)
    # ------------------------------------------------------------------
    print("\n------------------------------------------------------------------")
    print("EXECUTING REAL SETTLED TRANSACTION (Razorpay Mock-Authorize + Capture)")
    print("------------------------------------------------------------------")
    
    # Initial Settings: max_amount = 1000.00
    set_req_init = {"max_amount": 1000.00, "daily_limit": 50000.00}
    client.put("/merchants/settings", json=set_req_init, headers=headers_a)

    # Create Authorized Agent
    ag_init = client.post("/merchants/agents", json={
        "name": "Primary Buyer Agent",
        "scopes": ["read_catalog", "propose_order"]
    }, headers=headers_a).json()
    ag_key_init = ag_init["api_key"]

    import re
    # Propose Order via Agent Chat -> Creates REAL Razorpay Order
    chat_init = client.post("/agent/chat", json={
        "merchant_id": merchant_a_id,
        "agent_id": ag_key_init,
        "prompt": "Order Wireless Mechanical Keyboard for 500 INR"
    }).json()

    tx_id = chat_init["transaction_id"]
    order_id = chat_init["razorpay_order_id"]

    # Execute Netbanking Mock-Authorize Flow
    checkout_url = "https://api.razorpay.com/v1/payments/create/checkout"
    checkout_data = {
        "key_id": settings.RAZORPAY_KEY_ID,
        "amount": 50000,
        "currency": "INR",
        "order_id": order_id,
        "email": email_a,
        "contact": "9876543210",
        "method": "netbanking",
        "bank": "YESB"
    }

    r1 = requests.post(checkout_url, data=checkout_data)
    m_pay = re.search(r'var payment_id = "(pay_[^"]+)";', r1.text)
    m_action1 = re.search(r'action="([^"]+)"', r1.text)
    m_cb1 = re.search(r'name="callback_url" value="([^"]+)"', r1.text)
    m_pid_raw = re.search(r'name="payment_id" value="([^"]+)"', r1.text)

    pay_id = m_pay.group(1)
    action1_url = m_action1.group(1)
    cb1_url = m_cb1.group(1)
    pid_raw = m_pid_raw.group(1)

    r2 = requests.post(action1_url, data={
        "action": "authorize",
        "amount": "50000",
        "method": "netbanking",
        "payment_id": pid_raw,
        "callback_url": cb1_url,
        "recurring": "0"
    })

    m_action2 = re.search(r'action="([^"]+)"', r2.text)
    m_cb2 = re.search(r'name="callback_url" value="([^"]+)"', r2.text)
    action2_url = m_action2.group(1)
    cb2_url = m_cb2.group(1)

    r3 = requests.post(action2_url, data={
        "callback_url": cb2_url,
        "language_code": "en",
        "success": "S"
    })

    # Generate HMAC signature & Capture
    msg = f"{order_id}|{pay_id}".encode('utf-8')
    sig = hmac.new(settings.RAZORPAY_KEY_SECRET.encode('utf-8'), msg, hashlib.sha256).hexdigest()

    cap_res = client.post("/payments/verify-and-capture", json={
        "transaction_id": tx_id,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": pay_id,
        "razorpay_signature": sig
    }, headers=headers_a).json()

    print(f"Settled Transaction ID: {tx_id}")
    print(f"Razorpay Order ID:       {order_id}")
    print(f"Razorpay Payment ID:     {pay_id}")
    print(f"Final Transaction State: {cap_res.get('status')}")

    # Fetch Usage Metrics API
    print("\n[RAW REQUEST: GET /merchants/usage]")
    usage_res = client.get("/merchants/usage", headers=headers_a)
    print(f"\n[RAW RESPONSE: GET /merchants/usage] Status: {usage_res.status_code}")
    print(json.dumps(usage_res.json(), indent=2))

    # Query psql for comparison
    psql_cmd = [
        "docker", "exec", "agentpay_postgres", "psql", "-U", "agentpay", "-d", "agentpay_db",
        "-c", f"SELECT id, amount, status, razorpay_order_id, razorpay_payment_id FROM transactions WHERE merchant_id = '{merchant_a_id}';"
    ]
    psql_out = subprocess.check_output(psql_cmd, text=True, cwd="d:\\last\\infra")
    print("\n[DIRECT POSTGRESQL PSQL OUTPUT FOR MERCHANT A]")
    print(psql_out)

    # ------------------------------------------------------------------
    # 3. Settings Update (PUT /merchants/settings) & Before/After Agent Purchase
    # ------------------------------------------------------------------
    print("\n------------------------------------------------------------------")
    print("SETTINGS UPDATE & BEFORE/AFTER POLICY EVALUATION PROOF")
    print("------------------------------------------------------------------")

    # BEFORE: Order proposal ₹500.00 against ₹1000.00 limit
    print("\n[BEFORE SETTINGS UPDATE: Order Proposal for ₹500.00 against ₹1000.00 Limit]")
    chat_before_req = {
        "merchant_id": merchant_a_id,
        "agent_id": ag_key_init,
        "prompt": "Order Wireless Mechanical Keyboard for 500 INR"
    }
    chat_before_res = client.post("/agent/chat", json=chat_before_req)
    print(f"Status: {chat_before_res.status_code}")
    print(json.dumps(chat_before_res.json(), indent=2))

    # PUT /merchants/settings: Update max_amount to ₹600.00
    print("\n[RAW REQUEST: PUT /merchants/settings (Updating max_amount to ₹600.00)]")
    set_req_update = {"max_amount": 600.00, "velocity_limit": 10}
    print(json.dumps(set_req_update, indent=2))

    set_res_update = client.put("/merchants/settings", json=set_req_update, headers=headers_a)
    print(f"\n[RAW RESPONSE: PUT /merchants/settings] Status: {set_res_update.status_code}")
    print(json.dumps(set_res_update.json(), indent=2))

    # AFTER: Order proposal ₹750.00 against NEW ₹600.00 limit
    print("\n[AFTER SETTINGS UPDATE: Order Proposal for ₹750.00 against NEW ₹600.00 Limit]")
    chat_after_req = {
        "merchant_id": merchant_a_id,
        "agent_id": ag_key_init,
        "prompt": "Order Wireless Mechanical Keyboard for 750 INR"
    }
    chat_after_res = client.post("/agent/chat", json=chat_after_req)
    print(f"Status: {chat_after_res.status_code}")
    print(json.dumps(chat_after_res.json(), indent=2))

    # ------------------------------------------------------------------
    # 4. max_amount-below-cheapest-item Validation Safety Net
    # ------------------------------------------------------------------
    print("\n------------------------------------------------------------------")
    print("MAX_AMOUNT BELOW CHEAPEST ITEM VALIDATION SAFETY NET PROOF")
    print("------------------------------------------------------------------")
    print("\n[RAW REQUEST: PUT /merchants/settings (Setting max_amount=₹300.00 < cheapest item ₹500.00)]")
    safety_req = {"max_amount": 300.00}
    print(json.dumps(safety_req, indent=2))

    safety_res = client.put("/merchants/settings", json=safety_req, headers=headers_a)
    print(f"\n[RAW RESPONSE: PUT /merchants/settings] Status: {safety_res.status_code}")
    print(json.dumps(safety_res.json(), indent=2))

    # ------------------------------------------------------------------
    # 5. Custom Scope Agent Creation & Scope-Blocked Attempt
    # ------------------------------------------------------------------
    print("\n------------------------------------------------------------------")
    print("CUSTOM SCOPE AGENT CREATION & SCOPE-BLOCKED ATTEMPT PROOF")
    print("------------------------------------------------------------------")
    print("\n[RAW REQUEST: POST /merchants/agents (Creating Agent with 'read_catalog' ONLY)]")
    agent_req = {"name": "ReadOnly Inventory Agent", "scopes": ["read_catalog"]}
    print(json.dumps(agent_req, indent=2))

    agent_res = client.post("/merchants/agents", json=agent_req, headers=headers_a)
    print(f"\n[RAW RESPONSE: POST /merchants/agents] Status: {agent_res.status_code}")
    print(json.dumps(agent_res.json(), indent=2))
    restr_key = agent_res.json()["api_key"]

    print("\n[RAW REQUEST: POST /agent/chat using Restricted Scope Agent Key]")
    chat_restr_req = {
        "merchant_id": merchant_a_id,
        "agent_id": restr_key,
        "prompt": "Order Wireless Mechanical Keyboard for 500 INR"
    }
    chat_restr_res = client.post("/agent/chat", json=chat_restr_req)
    print(f"\n[RAW RESPONSE: POST /agent/chat] Status: {chat_restr_res.status_code}")
    print(json.dumps(chat_restr_res.json(), indent=2))

    # ------------------------------------------------------------------
    # 6. Cross-Tenant 403 Forbidden Proof
    # ------------------------------------------------------------------
    print("\n------------------------------------------------------------------")
    print("CROSS-TENANT MULTI-TENANT 403 FORBIDDEN PROOF")
    print("------------------------------------------------------------------")
    email_b = f"merchant_sub111_b_{uuid.uuid4().hex[:6]}@store.com"
    reg_b = client.post("/auth/register", json={"name": "Merchant B", "email": email_b, "password": pwd}).json()
    jwt_b = reg_b["access_token"]
    headers_b = {"Authorization": f"Bearer {jwt_b}"}

    print(f"\n[RAW REQUEST: GET /merchants/{merchant_a_id} using Merchant B JWT]")
    cross_res = client.get(f"/merchants/{merchant_a_id}", headers=headers_b)
    print(f"[RAW RESPONSE] Status: {cross_res.status_code}")
    print(json.dumps(cross_res.json(), indent=2))

    print("\n==================================================================")
    print("SUBTICKET 11.1 VERIFICATION COMPLETE — ALL RAW EVIDENCE GENERATED!")
    print("==================================================================")

if __name__ == "__main__":
    run_subticket_11_1_verification()
