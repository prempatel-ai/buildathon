#!/usr/bin/env python
"""
Phase 12 Verification — KYC Gate for Live-Mode Switch
Tests that environment switch to 'live' is denied when kyc_status != 'verified'
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uuid
from decimal import Decimal
from fastapi.testclient import TestClient

from main import app
from app.core.database import SessionLocal
from app.models.merchant import Merchant
from app.models.agent import Agent
from app.core.security import create_access_token

client = TestClient(app)

def run_kyc_gate_verification():
    print("=" * 70)
    print("PHASE 12 VERIFICATION — KYC GATE FOR LIVE-MODE SWITCH")
    print("=" * 70 + "\n")

    db = SessionLocal()

    # 1. Register a merchant (KYC status defaults to 'unverified')
    email = f"kyc_test_{uuid.uuid4().hex[:6]}@store.com"
    pwd = "TestPassword123!"

    reg_res = client.post("/auth/register", json={
        "name": "KYC Gate Test Store",
        "email": email,
        "password": pwd
    })
    assert reg_res.status_code in (200, 201), f"Registration failed: {reg_res.text}"
    reg_data = reg_res.json()
    merchant_id = reg_data["merchant_id"]
    jwt_token = reg_data["access_token"]
    headers = {"Authorization": f"Bearer {jwt_token}"}

    print(f"[1] Registered Merchant: {merchant_id}")
    print(f"    Initial KYC Status (from DB): ", end="")
    m = db.query(Merchant).filter(Merchant.id == uuid.UUID(merchant_id)).first()
    print(f"{m.kyc_status} (default)")

    # 2. Try to switch to LIVE with unverified KYC — SHOULD BE DENIED (403)
    print("\n[2] Attempting PUT /merchants/environment -> 'live' with kyc_status='unverified'...")
    switch_res = client.put("/merchants/environment", json={"environment": "live"}, headers=headers)
    print(f"    HTTP Status: {switch_res.status_code}")
    print(f"    Response: {switch_res.json()}")

    assert switch_res.status_code == 403, f"Expected 403, got {switch_res.status_code}"
    assert "kyc_status must be 'verified'" in switch_res.json().get("detail", "") or "KYC status must be 'verified'" in switch_res.json().get("detail", ""), "Wrong error message"
    print("    [OK] Correctly REJECTED with 403 Forbidden")

    # 3. Verify audit event was logged for the denial
    from app.models.audit import AuditEvent
    deny_event = db.query(AuditEvent).filter(
        AuditEvent.merchant_id == uuid.UUID(merchant_id),
        AuditEvent.action == "environment_switch_denied"
    ).order_by(AuditEvent.created_at.desc()).first()
    assert deny_event is not None, "No environment_switch_denied audit event found!"
    print(f"\n[3] Audit Event Logged: {deny_event.action}")
    print(f"    Decision: {deny_event.decision}")
    print(f"    Reasoning: {deny_event.reasoning}")
    print("    [OK] Audit trail captures KYC gate rejection")

    # 4. Switch to SANDBOX (should always work, no KYC required)
    print("\n[4] Switching to 'sandbox' (should always succeed)...")
    switch_sb = client.put("/merchants/environment", json={"environment": "sandbox"}, headers=headers)
    print(f"    HTTP Status: {switch_sb.status_code}")
    assert switch_sb.status_code == 200, f"Sandbox switch failed: {switch_sb.text}"
    print(f"    Environment: {switch_sb.json().get('environment')}")
    print("    [OK] Sandbox switch allowed without KYC")

    # 5. Manually set KYC to 'verified' in DB (simulating completed KYC)
    print("\n[5] Simulating KYC completion: setting kyc_status='verified' in DB...")
    m = db.query(Merchant).filter(Merchant.id == uuid.UUID(merchant_id)).first()
    m.kyc_status = "verified"
    db.commit()
    db.refresh(m)
    print(f"    KYC Status now: {m.kyc_status}")

    # 6. Switch to LIVE with verified KYC — SHOULD SUCCEED
    print("\n[6] Attempting PUT /merchants/environment -> 'live' with kyc_status='verified'...")
    switch_res2 = client.put("/merchants/environment", json={"environment": "live"}, headers=headers)
    print(f"    HTTP Status: {switch_res2.status_code}")
    if switch_res2.status_code != 200:
        print(f"    Response: {switch_res2.json()}")
    assert switch_res2.status_code == 200, f"Expected 200, got {switch_res2.status_code}"
    assert switch_res2.json().get("environment") == "live"
    assert switch_res2.json().get("kyc_status") == "verified"
    print(f"    Environment: {switch_res2.json().get('environment')}")
    print(f"    KYC Status: {switch_res2.json().get('kyc_status')}")
    print("    [OK] Live switch ALLOWED with verified KYC")

    # 7. Verify audit event for successful switch
    switch_event = db.query(AuditEvent).filter(
        AuditEvent.merchant_id == uuid.UUID(merchant_id),
        AuditEvent.action == "environment_switched"
    ).order_by(AuditEvent.created_at.desc()).first()
    assert switch_event is not None, "No environment_switched audit event found!"
    print(f"\n[7] Audit Event Logged: {switch_event.action}")
    print(f"    Decision: {switch_event.decision}")
    print(f"    Reasoning: {switch_event.reasoning}")
    print("    [OK] Audit trail captures successful environment switch")

    db.close()
    print("\n" + "=" * 70)
    print("PHASE 12 KYC GATE VERIFICATION — ALL CHECKS PASSED!")
    print("=" * 70)

if __name__ == "__main__":
    run_kyc_gate_verification()