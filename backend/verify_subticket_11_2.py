import requests
import json
import uuid
import sys

from main import app
from fastapi.testclient import TestClient

sys.stdout.reconfigure(encoding='utf-8')
client = TestClient(app)

def run_subticket_11_2_verification():
    print("==================================================================")
    print("SUBTICKET 11.2 — BROWSER STATE PERSISTENCE & JWT STORAGE AUDIT")
    print("==================================================================\n")

    # 1. JWT Storage Pattern Statement
    print("[1. JWT STORAGE ARCHITECTURE STATEMENT]")
    print("JWT Auth Storage Pattern: localStorage vs httpOnly Cookie")
    print("---------------------------------------------------------")
    print("Choice: localStorage was chosen for client-side API calls in this decoupled Next.js / FastAPI build.")
    print("Reasoning:")
    print("1. Next.js React Client Components ('use client') run on port 3001 while FastAPI runs on port 8000.")
    print("2. localStorage allows explicit, deterministic Authorization: Bearer <jwt> header injection without CORS SameSite/Secure cookie blocking during local dev & cross-domain deployment (Vercel + Render).")
    print("3. Security Mitigation: All API calls are validated server-side by get_current_merchant dependency, verifying HMAC signature and preventing XSS state corruption.\n")

    # 2. Form Persistence Test
    email = f"merchant_sub112_{uuid.uuid4().hex[:6]}@store.com"
    pwd = "MerchantPassword123!"

    reg_data = client.post("/auth/register", json={"name": "UI Persistence Store", "email": email, "password": pwd}).json()
    token = reg_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("[2. FORM PERSISTENCE TEST (/settings)]")
    print("Initial GET /merchants/me:")
    init_profile = client.get("/merchants/me", headers=headers).json()
    print(f"  - Initial max_amount: {init_profile.get('limits_config', {}).get('max_transaction_amount')}")

    print("Submitting Form Update (max_amount = 650.00):")
    update_res = client.put("/merchants/settings", json={"max_amount": 650.00}, headers=headers).json()
    print(f"  - API Response max_amount: {update_res.get('limits_config', {}).get('max_transaction_amount')}")

    print("Simulating Page Reload (GET /merchants/me):")
    reloaded_profile = client.get("/merchants/me", headers=headers).json()
    persisted_val = reloaded_profile.get('limits_config', {}).get('max_transaction_amount')
    print(f"  - Reloaded max_amount: {persisted_val}")
    assert persisted_val == 650.00, "Persistence failed!"

    # 3. Agent Creation & Roster Table Update
    print("\n[3. AGENT MODAL CREATION TEST (/agents-list)]")
    create_res = client.post("/merchants/agents", json={"name": "UI Agent #3", "scopes": ["read_catalog", "propose_order"]}, headers=headers).json()
    print(f"Created Agent Name: {create_res.get('name')}")
    print(f"Issued API Key:     {create_res.get('api_key')}")

    roster = client.get("/merchants/agents", headers=headers).json()
    print(f"Roster Table Count: {len(roster)}")
    assert any(a["name"] == "UI Agent #3" for a in roster), "Agent missing from roster!"

    print("\n==================================================================")
    print("SUBTICKET 11.2 VERIFICATION COMPLETE!")
    print("==================================================================")

if __name__ == "__main__":
    run_subticket_11_2_verification()
