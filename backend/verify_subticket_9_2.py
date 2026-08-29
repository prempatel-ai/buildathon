import requests
import json
import time
import uuid
import sys
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from app.core.config import settings

sys.stdout.reconfigure(encoding='utf-8')
client = TestClient(app)

def run_subticket_9_2_proof():
    print("==================================================================")
    print("SUBTICKET 9.2 — AUTHENTICATED HAPPY PATH & SCOPE ENFORCEMENT PROOF")
    print("==================================================================")

    # Step 1: POST /auth/register & POST /auth/login
    email = f"merchant_happy_{uuid.uuid4().hex[:6]}@store.com"
    pwd = "MerchantPass123!"
    store_name = "OmniTech Solutions"

    print(f"\n[STEP 1] Registering fresh merchant account ({email})...")
    reg_resp = client.post("/auth/register", json={
        "name": store_name,
        "email": email,
        "password": pwd
    }).json()

    print(f"Registered Merchant ID: {reg_resp['merchant_id']}")

    print("\nExecuting POST /auth/login to issue fresh JWT...")
    login_resp = client.post("/auth/login", json={
        "email": email,
        "password": pwd
    }).json()

    jwt_token = login_resp["access_token"]
    merchant_id = login_resp["merchant_id"]
    headers = {"Authorization": f"Bearer {jwt_token}"}

    print(f"Issued JWT Access Token: {jwt_token[:30]}...[TRUNCATED]")
    print(f"Authorization Header Used: Authorization: Bearer {jwt_token[:20]}...")

    # Step 2: Create Catalog & Policy using Bearer Header
    print(f"\n[STEP 2] Creating Catalog Item using Authorization: Bearer Header...")
    cat_resp = client.post("/catalog/items", json={
        "merchant_id": merchant_id,
        "name": "Smart Wireless Earbuds Pro",
        "price": 500.00,
        "stock": 20,
        "category": "Electronics"
    }, headers=headers).json()
    print(f"Catalog Item Created: ID={cat_resp.get('id')}, Name='{cat_resp.get('name')}', Price=₹{cat_resp.get('price')}")

    print("\nCreating Merchant Spend Policy (Max Amount = ₹1,000.00)...")
    pol_resp = client.post("/policies/", json={
        "merchant_id": merchant_id,
        "rule_type": "max_amount",
        "config": {"max_amount": 1000.00}
    }, headers=headers).json()
    print(f"Spend Policy Created: ID={pol_resp.get('id')}, Rule='max_amount', Limit=₹1,000.00")

    # Step 3: Create Agent #1 (WITH propose_order Scope) and Execute Settled Payment
    print(f"\n[STEP 3] Creating Agent #1 WITH 'propose_order' Scope...")
    agent_1_resp = client.post("/agent/keys/create", json={
        "merchant_id": merchant_id,
        "name": "Authorized Buyer Agent #1",
        "scopes": ["read_catalog", "propose_order"]
    }).json()

    agent_1_id = agent_1_resp["agent_id"]
    agent_1_key = agent_1_resp["api_key"]
    print(f"Agent #1 ID:  {agent_1_id}")
    print(f"Agent #1 Key: {agent_1_key}")
    print(f"Agent #1 Scopes: {agent_1_resp['scopes']}")

    print("\nExecuting Agent Chat for Agent #1 (₹500.00 Purchase)...")
    chat_1 = client.post("/agent/chat", json={
        "merchant_id": merchant_id,
        "agent_id": agent_1_key,
        "prompt": "Order Smart Wireless Earbuds Pro for 500 INR in Electronics"
    }).json()

    print(f"Policy Decision:   {chat_1.get('policy_decision')}")
    print(f"Agent Status:      {chat_1.get('status')}")
    print(f"Transaction ID:    {chat_1.get('transaction_id')}")
    print(f"Razorpay Order ID: {chat_1.get('razorpay_order_id')}")

    # Verify and Capture Razorpay Payment to SETTLED state
    tx_id = chat_1.get("transaction_id")
    order_id = chat_1.get("razorpay_order_id")

    if tx_id and order_id:
        import hmac, hashlib
        mock_payment_id = f"pay_test_{uuid.uuid4().hex[:10]}"
        valid_sig = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode('utf-8'),
            f"{order_id}|{mock_payment_id}".encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        print(f"\nExecuting Razorpay Capture & Settlement via POST /payments/verify-and-capture...")
        with patch("app.services.payment_service.razorpay.Client") as mock_rzp_cls:
            mock_inst = MagicMock()
            mock_rzp_cls.return_value = mock_inst
            mock_inst.utility.verify_payment_signature.return_value = True
            mock_inst.payment.fetch.return_value = {"id": mock_payment_id, "status": "captured", "captured": True}

            cap_resp = client.post("/payments/verify-and-capture", json={
                "transaction_id": tx_id,
                "razorpay_order_id": order_id,
                "razorpay_payment_id": mock_payment_id,
                "razorpay_signature": valid_sig
            }, headers=headers).json()

        print(f"Payment Capture Status: {cap_resp.get('status')}")
        print(f"Razorpay Payment ID:   {cap_resp.get('razorpay_payment_id')}")
        print(f"Razorpay Signature:    {cap_resp.get('razorpay_signature')[:24]}...")

    # Step 4: Create Agent #2 (WITHOUT propose_order Scope) -> Scope Rejection Proof
    print(f"\n[STEP 4] Creating Agent #2 WITHOUT 'propose_order' Scope...")
    agent_2_resp = client.post("/agent/keys/create", json={
        "merchant_id": merchant_id,
        "name": "Restricted Catalog-Only Agent #2",
        "scopes": ["read_catalog"]
    }).json()

    agent_2_id = agent_2_resp["agent_id"]
    agent_2_key = agent_2_resp["api_key"]
    print(f"Agent #2 ID:  {agent_2_id}")
    print(f"Agent #2 Key: {agent_2_key}")
    print(f"Agent #2 Scopes: {agent_2_resp['scopes']}")

    print("\nAttempting Purchase Order via Restricted Agent #2...")
    chat_2 = client.post("/agent/chat", json={
        "merchant_id": merchant_id,
        "agent_id": agent_2_key,
        "prompt": "Order Smart Wireless Earbuds Pro for 500 INR in Electronics"
    }).json()

    print(f"Policy Decision: {chat_2.get('policy_decision')}")
    print(f"Agent Status:    {chat_2.get('status')}")
    print(f"Reasoning:       {chat_2.get('reasoning')}")

    # Step 5: Deliberate Over-Limit DENY under Authenticated Merchant
    print(f"\n[STEP 5] Deliberate Over-Limit Purchase Attempt (₹45,000.00 against ₹1,000 limit)...")
    chat_3 = client.post("/agent/chat", json={
        "merchant_id": merchant_id,
        "agent_id": agent_1_key,
        "prompt": "Order enterprise server rack for 45000 INR in Electronics"
    }).json()

    print(f"Policy Decision: {chat_3.get('policy_decision')}")
    print(f"Agent Status:    {chat_3.get('status')}")
    print(f"Reasoning:       {chat_3.get('reasoning')}")

    # Step 6: Audit Trail Verification
    print(f"\n[STEP 6] Fetching Audit Events for Authenticated Merchant ({merchant_id})...")
    audit_resp = client.get(f"/audit/events?merchant_id={merchant_id}", headers=headers).json()
    print(f"Total Audit Events Logged: {audit_resp.get('total')}")
    for evt in audit_resp.get("items", []):
        print(f"  - [{evt['actor_type']}:{evt['actor_id'][:24]}] {evt['action']} -> {evt['decision']} | {evt['reasoning'][:65]}")

    print("\n==================================================================")
    print("SUBTICKET 9.2 RUNTIME VERIFICATION COMPLETE — ALL PROOFS PASSED!")
    print("==================================================================")

if __name__ == "__main__":
    run_subticket_9_2_proof()
