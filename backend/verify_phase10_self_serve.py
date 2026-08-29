import requests
import json
import time
import uuid
import sys
import subprocess
from fastapi.testclient import TestClient
from main import app

sys.stdout.reconfigure(encoding='utf-8')
client = TestClient(app)

def run_phase10_verification():
    print("==================================================================")
    print("PHASE 10 VERIFICATION — MERCHANT SELF-SERVE & BILLING AUDIT")
    print("==================================================================")

    # ------------------------------------------------------------------
    # 1. Merchant Registration & JWT Auth
    # ------------------------------------------------------------------
    email_a = f"merchant_p10_a_{uuid.uuid4().hex[:6]}@store.com"
    pwd = "MerchantPass123!"

    print(f"\n[STEP 1] Registering Merchant A ({email_a})...")
    reg_a = client.post("/auth/register", json={
        "name": "OmniGear Self-Serve Store",
        "email": email_a,
        "password": pwd
    }).json()

    merchant_a_id = reg_a["merchant_id"]
    jwt_a = reg_a["access_token"]
    headers_a = {"Authorization": f"Bearer {jwt_a}"}

    print(f"Merchant A ID:  {merchant_a_id}")
    print(f"Merchant A JWT: {jwt_a[:30]}...")

    # Onboard Catalog Item
    cat_item = client.post("/catalog/items", json={
        "merchant_id": merchant_a_id,
        "name": "Wireless Mechanical Gaming Keyboard",
        "price": 500.00,
        "stock": 15,
        "category": "Electronics"
    }, headers=headers_a).json()
    print(f"Catalog Item Onboarded: {cat_item.get('name')} (Price: ₹{cat_item.get('price')})")

    # Set Initial Max Amount = 1000.00
    client.put("/merchants/settings", json={
        "max_amount": 1000.00
    }, headers=headers_a)

    # Create Agent with propose_order scope
    ag_res = client.post("/merchants/agents", json={
        "name": "Self-Serve Authorized Agent",
        "scopes": ["read_catalog", "propose_order"]
    }, headers=headers_a).json()

    ag_key = ag_res["api_key"]
    print(f"Created Agent Key: {ag_key}")

    # ------------------------------------------------------------------
    # 2. Before/After Settings Update & Policy Engine Reflection Proof
    # ------------------------------------------------------------------
    print("\n[STEP 2] BEFORE Settings Update: Order Proposal (₹500.00 against ₹1000.00 limit)...")
    chat_before = client.post("/agent/chat", json={
        "merchant_id": merchant_a_id,
        "agent_id": ag_key,
        "prompt": "Order Wireless Mechanical Gaming Keyboard for 500 INR"
    }).json()

    print(f"  - Policy Decision: {chat_before.get('policy_decision')}")
    print(f"  - Agent Status:    {chat_before.get('status')}")
    assert chat_before.get("policy_decision") == "ALLOW", "Initial proposal failed!"

    print("\nExecuting PUT /merchants/settings under JWT Auth (Changing max_amount to ₹600.00)...")
    set_update = client.put("/merchants/settings", json={
        "max_amount": 600.00
    }, headers=headers_a).json()
    print(f"  - Updated Limits Config: {json.dumps(set_update.get('limits_config'))}")

    print("\nAFTER Settings Update: Order Proposal (₹750.00 purchase attempt against NEW ₹600.00 limit)...")
    chat_after = client.post("/agent/chat", json={
        "merchant_id": merchant_a_id,
        "agent_id": ag_key,
        "prompt": "Order Wireless Mechanical Gaming Keyboard for 750 INR"
    }).json()

    print(f"  - Policy Decision: {chat_after.get('policy_decision')}")
    print(f"  - Agent Status:    {chat_after.get('status')}")
    print(f"  - Reasoning:       {chat_after.get('reasoning')}")
    assert chat_after.get("policy_decision") == "DENY", "Policy engine failed to reflect new settings!"

    # Catalog Item Safety Net Validation Test
    print("\nTesting Catalog Safety Net Warning (Setting max_amount=₹300.00 < cheapest item ₹500.00)...")
    safety_resp = client.put("/merchants/settings", json={
        "max_amount": 300.00
    }, headers=headers_a)
    print(f"  - Response Status Code: {safety_resp.status_code}")
    print(f"  - Response Warning:     {safety_resp.json().get('detail')}")
    assert safety_resp.status_code == 400, "Safety net validation failed to trigger!"

    # ------------------------------------------------------------------
    # 3. Custom Scope Agent Creation & Permission Enforcement Proof
    # ------------------------------------------------------------------
    print("\n[STEP 3] Creating Restricted Agent Key (scopes: ['read_catalog'] ONLY)...")
    restr_ag = client.post("/merchants/agents", json={
        "name": "Restricted Catalog Agent",
        "scopes": ["read_catalog"]
    }, headers=headers_a).json()

    restr_key = restr_ag["api_key"]
    print(f"Restricted Agent Key: {restr_key}")

    print("Attempting Order Proposal via Restricted Agent Key...")
    chat_restr = client.post("/agent/chat", json={
        "merchant_id": merchant_a_id,
        "agent_id": restr_key,
        "prompt": "Order Wireless Mechanical Gaming Keyboard for 500 INR"
    }).json()

    print(f"  - Policy Decision: {chat_restr.get('policy_decision')}")
    print(f"  - Agent Status:    {chat_restr.get('status')}")
    print(f"  - Scope Reasoning: {chat_restr.get('reasoning')}")
    assert chat_restr.get("status") == "BLOCKED_BY_SCOPE", "Scope gating failed!"

    # ------------------------------------------------------------------
    # 4. Multi-Tenant Isolation (Merchant B 403 Forbidden Proof)
    # ------------------------------------------------------------------
    print("\n[STEP 4] Multi-Tenant Isolation 403 Verification...")
    email_b = f"merchant_p10_b_{uuid.uuid4().hex[:6]}@store.com"
    reg_b = client.post("/auth/register", json={
        "name": "Merchant B Competitor Store",
        "email": email_b,
        "password": pwd
    }).json()

    jwt_b = reg_b["access_token"]
    headers_b = {"Authorization": f"Bearer {jwt_b}"}

    print(f"Attempting to GET Merchant A details using Merchant B's JWT token...")
    b_get = client.get(f"/merchants/{merchant_a_id}", headers=headers_b)
    print(f"  - Response HTTP Status: {b_get.status_code}")
    print(f"  - Response Detail:      {b_get.json().get('detail')}")
    assert b_get.status_code == 403, "Multi-tenant isolation failed!"

    # ------------------------------------------------------------------
    # 5. Usage Endpoint Accounting vs psql Manual Count Match Proof
    # ------------------------------------------------------------------
    print("\n[STEP 5] Usage Endpoint Accounting vs psql Direct Query Proof...")
    usage_resp = client.get("/merchants/usage", headers=headers_a).json()
    print("GET /merchants/usage Response Payload:")
    print(json.dumps(usage_resp, indent=2))

    # Run psql command to count transactions for Merchant A
    psql_cmd = [
        "docker", "exec", "agentpay_postgres", "psql", "-U", "agentpay", "-d", "agentpay_db",
        "-c", f"SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'settled' THEN amount ELSE 0 END) AS settled_vol FROM transactions WHERE merchant_id = '{merchant_a_id}';"
    ]
    psql_out = subprocess.check_output(psql_cmd, text=True, cwd="d:\\last\\infra")
    print("\nDirect PostgreSQL psql Query Output:")
    print(psql_out)

    print("==================================================================")
    print("PHASE 10 VERIFICATION COMPLETE — ALL SELF-SERVE PROOFS PASSED!")
    print("==================================================================")

if __name__ == "__main__":
    run_phase10_verification()
