import os
import sys
import uuid
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.transaction import Transaction

client = TestClient(app)

def run_consumer_flow_proof():
    print("==================================================================")
    print("VERIFYING FULL CONSUMER SAVED PAYMENT METHOD & AUTO-SETTLEMENT FLOW")
    print("==================================================================")

    # 1. Register Consumer
    c_email = f"consumer_flow_{uuid.uuid4().hex[:6]}@example.com"
    reg_resp = client.post("/customer/auth/register", json={
        "name": "Prem Patel Consumer",
        "email": c_email,
        "password": "Password123!"
    }).json()

    c_token = reg_resp["access_token"]
    c_headers = {"Authorization": f"Bearer {c_token}"}
    print(f"[STEP 1] Consumer Registered | Email: {c_email}")

    # 2. Configure Saved Payment Method Card & Authorize Spend Limit
    auth_resp = client.post("/customer/authorizations", json={
        "spend_limit": 5000.0,
        "period": "per_transaction",
        "card_brand": "Visa",
        "card_last4": "4242",
        "cardholder_name": "Prem Patel",
        "vpa": "prem@upi"
    }, headers=c_headers).json()

    print(f"[STEP 2] Saved Payment Method Configured:")
    print(f"  - Card Brand       : {auth_resp.get('card_brand')}")
    print(f"  - Card Last 4      : {auth_resp.get('card_last4')}")
    print(f"  - Customer ID      : {auth_resp.get('razorpay_customer_id')}")
    print(f"  - Token ID         : {auth_resp.get('razorpay_token_id')}")
    print(f"  - Authorized Limit : INR {auth_resp.get('spend_limit')}")
    print(f"  - Remaining Limit  : INR {auth_resp.get('remaining_limit')}")

    # 3. Chat: Search across merchants
    print("\n[STEP 3] Consumer Chat: 'find cheap headphones'")
    search_resp = client.post("/customer/chat", json={"prompt": "find cheap headphones"}, headers=c_headers).json()
    print(f"  - Thread ID      : {search_resp['thread_id']}")
    print(f"  - Proposed Tool  : {search_resp['proposed_tool']}")
    print(f"  - Options Found  : {len(search_resp['search_results'] or [])}")

    # 4. Chat: Confirm purchase ("buy option 1")
    print("\n[STEP 4] Consumer Chat: 'buy option 1'")
    buy_resp = client.post("/customer/chat", json={
        "prompt": "buy option 1",
        "thread_id": search_resp['thread_id']
    }, headers=c_headers).json()

    print("\n[RAW AI PURCHASE RESPONSE]")
    print(json.dumps(buy_resp, indent=2))

    assert buy_resp["status"] == "PAYMENT_SETTLED", f"Expected status PAYMENT_SETTLED, got {buy_resp['status']}"
    assert buy_resp["razorpay_order_id"].startswith("order_"), "Missing Razorpay order ID"
    assert buy_resp["razorpay_payment_id"].startswith("pay_"), "Missing Razorpay payment capture ID"

    # 5. Fetch Dashboard & Verify Decremented Limit + Audit Trail
    print("\n[STEP 5] Fetching GET /customer/authorizations/me Dashboard...")
    dash_resp = client.get("/customer/authorizations/me", headers=c_headers).json()
    active_auth = dash_resp["active_authorization"]

    print(f"  - Card Brand           : {active_auth['card_brand']}")
    print(f"  - Card Last 4          : {active_auth['card_last4']}")
    print(f"  - Initial Limit        : INR {active_auth['spend_limit']}")
    print(f"  - Remaining Limit      : INR {active_auth['remaining_limit']}")
    print(f"  - Recent Audit Events  : {len(dash_resp['recent_transactions'])}")

    for evt in dash_resp['recent_transactions']:
        print(f"      [{evt['decision']}] {evt['action']} -> {evt['reasoning']}")

    assert float(active_auth['remaining_limit']) < float(active_auth['spend_limit']), "Remaining limit was not decremented!"

    print("\n==================================================================")
    print("CONSUMER SAVED PAYMENT & AUTO-SETTLEMENT VERIFICATION SUCCESSFUL!")
    print("==================================================================")

if __name__ == "__main__":
    run_consumer_flow_proof()
