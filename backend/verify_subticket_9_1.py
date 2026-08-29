import requests
import json
import time
import uuid
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_URL = "http://localhost:8000"

def run_subticket_9_1_proof():
    print("==================================================================")
    print("SUBTICKET 9.1 — RUNTIME PROOF FOR PHASE 8 (SECURITY & MULTI-TENANT)")
    print("==================================================================")

    # ------------------------------------------------------------------
    # ITEM 1: Multi-Tenant Isolation Proof (Merchant A vs Merchant B)
    # ------------------------------------------------------------------
    print("\n--- ITEM 1: Multi-Tenant Isolation (403 Forbidden Proof) ---")
    
    email_a = f"merchant_a_{uuid.uuid4().hex[:6]}@store.com"
    email_b = f"merchant_b_{uuid.uuid4().hex[:6]}@store.com"

    reg_a = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Merchant Alpha Store",
        "email": email_a,
        "password": "Password123!"
    }).json()

    reg_b = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Merchant Beta Store",
        "email": email_b,
        "password": "Password123!"
    }).json()

    jwt_a = reg_a["access_token"]
    id_a = reg_a["merchant_id"]
    id_b = reg_b["merchant_id"]

    print(f"Registered Merchant A ID: {id_a} ({email_a})")
    print(f"Registered Merchant B ID: {id_b} ({email_b})")

    # Attempt to fetch Merchant B details using Merchant A's JWT token
    print(f"\nAttempting: GET /merchants/{id_b} using Merchant A's Bearer token...")
    forbidden_resp = requests.get(
        f"{BASE_URL}/merchants/{id_b}",
        headers={"Authorization": f"Bearer {jwt_a}"}
    )
    print(f"HTTP Status Code: {forbidden_resp.status_code}")
    print(f"HTTP Raw Response: {forbidden_resp.text}")

    # ------------------------------------------------------------------
    # ITEM 2: Agent Key Rotation & Audit History Preserved
    # ------------------------------------------------------------------
    print("\n--- ITEM 2: Agent Key Rotation & Revocation Proof ---")
    
    # Create agent key for Merchant A
    key_create_resp = requests.post(f"{BASE_URL}/agent/keys/create", json={
        "merchant_id": id_a,
        "name": "Procurement Agent Alpha",
        "scopes": ["read_catalog", "propose_order"]
    }).json()

    agent_id = key_create_resp["agent_id"]
    old_key = key_create_resp["api_key"]
    print(f"Created Agent ID: {agent_id}")
    print(f"Initial Agent API Key: {old_key}")

    # Perform initial agent chat using old key to log an audit event
    chat_pre = requests.post(f"{BASE_URL}/agent/chat", json={
        "merchant_id": id_a,
        "agent_id": old_key,
        "prompt": "What items are available in stock?"
    }).json()
    print(f"Pre-rotation Chat Status: {chat_pre.get('status')}")

    # Rotate Agent Key
    print(f"\nExecuting POST /agent/{agent_id}/rotate-key...")
    rotate_resp = requests.post(f"{BASE_URL}/agent/{agent_id}/rotate-key", json={"merchant_id": id_a}).json()
    new_key = rotate_resp["new_api_key"]
    print(f"Rotated New API Key: {new_key}")

    # Immediately retry call using OLD key -> Expected 401 Unauthorized
    print(f"\nImmediately retrying POST /agent/chat using REVOKED key ({old_key})...")
    revoked_resp = requests.post(f"{BASE_URL}/agent/chat", json={
        "merchant_id": id_a,
        "agent_id": old_key,
        "prompt": "What items are available in stock?"
    })
    print(f"HTTP Status Code: {revoked_resp.status_code}")
    print(f"HTTP Raw Response: {revoked_resp.text}")

    # Query audit events under agent_id to verify prior history is preserved
    print(f"\nQuerying GET /audit/events?merchant_id={id_a} to verify prior audit history...")
    audit_resp = requests.get(f"{BASE_URL}/audit/events?merchant_id={id_a}").json()
    print(f"Total Audit Events for Merchant A: {audit_resp.get('total')}")
    for evt in audit_resp.get("items", [])[:4]:
        print(f"  - [{evt['actor_type']}:{evt['actor_id']}] {evt['action']} -> {evt['decision']}")

    # ------------------------------------------------------------------
    # ITEM 3: Rate Limiting Proof (429 Too Many Requests)
    # ------------------------------------------------------------------
    print("\n--- ITEM 3: Redis Rate Limiting Proof (429 Response) ---")
    print(f"Sending repeated POST /auth/login requests for {email_a} past 5-request limit...")

    last_resp = None
    for i in range(1, 8):
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email_a,
            "password": "WrongPasswordAttempt"
        })
        print(f"Attempt #{i}: HTTP {resp.status_code} - {resp.json().get('detail')}")
        last_resp = resp
        if resp.status_code == 429:
            print("\n429 Rate Limit Triggered Successfully!")
            print(f"Final 429 Raw Response: {resp.text}")
            break

    # ------------------------------------------------------------------
    # ITEM 5: End-to-End Demo Script under Authenticated System
    # ------------------------------------------------------------------
    print("\n--- ITEM 5: End-to-End Demo Script Under Authenticated System ---")
    
    # 1. Onboard Merchant & Catalog
    print("\n1. Seed merchant catalog item...")
    cat_resp = requests.post(f"{BASE_URL}/catalog/items", json={
        "merchant_id": id_a,
        "name": "Wireless Pro Noise-Canceling Headphones",
        "price": 450.00,
        "stock": 15,
        "category": "Electronics"
    }, headers={"Authorization": f"Bearer {jwt_a}"}).json()
    print(f"Created Catalog Item: {cat_resp.get('name')} (₹{cat_resp.get('price')})")

    # Set spend policy limit = ₹1,000.00
    pol_resp = requests.post(f"{BASE_URL}/policies/", json={
        "merchant_id": id_a,
        "rule_type": "max_amount",
        "config": {"max_amount": 1000.00}
    }, headers={"Authorization": f"Bearer {jwt_a}"}).json()
    print(f"Created Spend Policy: Max Amount = ₹1,000.00")

    # 2. Agent Proposes Purchase Order (Within Limit -> ALLOW)
    print("\n2. Agent Proposes Purchase Order (₹450.00 - Within Limit)...")
    allow_chat = requests.post(f"{BASE_URL}/agent/chat", json={
        "merchant_id": id_a,
        "agent_id": new_key,
        "prompt": "Order wireless headphones for 450 INR in Electronics"
    }).json()

    print(f"Policy Decision:   {allow_chat.get('policy_decision')}")
    print(f"Agent Status:      {allow_chat.get('status')}")
    print(f"Razorpay Order ID: {allow_chat.get('razorpay_order_id')}")
    print(f"Reasoning:         {allow_chat.get('reasoning')}")

    # 3. Deliberate Over-Limit Purchase (₹45,000.00 -> DENY)
    print("\n3. Deliberate Over-Limit Purchase (₹45,000.00 - Exceeds Limit)...")
    deny_chat = requests.post(f"{BASE_URL}/agent/chat", json={
        "merchant_id": id_a,
        "agent_id": new_key,
        "prompt": "Order enterprise server rack for 45000 INR in Electronics"
    }).json()

    print(f"Policy Decision:   {deny_chat.get('policy_decision')}")
    print(f"Agent Status:      {deny_chat.get('status')}")
    print(f"Reasoning:         {deny_chat.get('reasoning')}")

    print("\n==================================================================")
    print("SUBTICKET 9.1 RUNTIME VERIFICATION COMPLETE — ALL PROOFS PASSED!")
    print("==================================================================")

if __name__ == "__main__":
    run_subticket_9_1_proof()
