#!/usr/bin/env python
"""
Subticket 13.1 Verification Script
1. Runs pytest tests/ -v and captures complete output.
2. Executes raw requests for all three KYC gate environment-switch cases.
3. Queries and prints the exact corresponding audit_events rows from PostgreSQL.
"""
import os
import sys
import json
import subprocess
import uuid
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.merchant import Merchant
from app.models.audit import AuditEvent

def run_subticket_13_1():
    print("======================================================================")
    print("SUBTICKET 13.1 — CONFIRM TEST SUITE STATUS + RAW KYC GATE EVIDENCE")
    print("======================================================================\n")

    # -------------------------------------------------------------------------
    # PART 1: Full Pytest Execution Output
    # -------------------------------------------------------------------------
    print("--- PART 1: FULL PYTEST OUTPUT (pytest tests/ -v) ---")
    try:
        res = subprocess.run([sys.executable, "-m", "pytest", "tests/", "-v"], capture_output=True, text=True)
        print(res.stdout)
        if res.stderr:
            print("STDERR:")
            print(res.stderr)
        print(f"Pytest Exit Code: {res.returncode}\n")
    except Exception as e:
        print(f"Error running pytest: {e}\n")

    # -------------------------------------------------------------------------
    # PART 2: Raw KYC Gate HTTP Requests & Responses
    # -------------------------------------------------------------------------
    print("--- PART 2: RAW KYC GATE REQUEST / RESPONSE EVIDENCE ---")
    client = TestClient(app)
    db = SessionLocal()

    # Setup test merchant
    email = f"raw_kyc_subticket13_1_{uuid.uuid4().hex[:6]}@example.com"
    pwd = "SecurePassword123!"

    reg_res = client.post("/auth/register", json={
        "name": "Subticket 13.1 Merchant Store",
        "email": email,
        "password": pwd
    })
    reg_data = reg_res.json()
    merchant_id = reg_data["merchant_id"]
    jwt_token = reg_data["access_token"]
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }

    print(f"Test Merchant Created: ID={merchant_id}")
    print(f"Initial KYC Status: unverified\n")

    # Case 1: Switch to LIVE while UNVERIFIED (Expect 403 Forbidden)
    print(">>> CASE 1: Switch to LIVE while UNVERIFIED (Expect HTTP 403 Denial)")
    req_body_1 = {"environment": "live"}
    print(f"Request: PUT /merchants/environment")
    print(f"Headers: Authorization: Bearer <jwt_token>")
    print(f"Body:\n{json.dumps(req_body_1, indent=2)}")
    
    resp_1 = client.put("/merchants/environment", json=req_body_1, headers=headers)
    print(f"Response Status Code: {resp_1.status_code}")
    print(f"Response Body:\n{json.dumps(resp_1.json(), indent=2)}\n")

    # Case 2: Switch to SANDBOX while UNVERIFIED (Expect 200 OK)
    print(">>> CASE 2: Switch to SANDBOX (Expect HTTP 200 OK - No KYC required)")
    req_body_2 = {"environment": "sandbox"}
    print(f"Request: PUT /merchants/environment")
    print(f"Headers: Authorization: Bearer <jwt_token>")
    print(f"Body:\n{json.dumps(req_body_2, indent=2)}")
    
    resp_2 = client.put("/merchants/environment", json=req_body_2, headers=headers)
    print(f"Response Status Code: {resp_2.status_code}")
    print(f"Response Body:\n{json.dumps(resp_2.json(), indent=2)}\n")

    # Case 3: Set KYC to VERIFIED and switch to LIVE (Expect 200 OK)
    print(">>> CASE 3: Set kyc_status='verified' in DB & Switch to LIVE (Expect HTTP 200 OK)")
    m = db.query(Merchant).filter(Merchant.id == uuid.UUID(merchant_id)).first()
    m.kyc_status = "verified"
    db.commit()
    db.refresh(m)
    print(f"Updated Merchant kyc_status in DB: {m.kyc_status}")

    req_body_3 = {"environment": "live"}
    print(f"Request: PUT /merchants/environment")
    print(f"Headers: Authorization: Bearer <jwt_token>")
    print(f"Body:\n{json.dumps(req_body_3, indent=2)}")
    
    resp_3 = client.put("/merchants/environment", json=req_body_3, headers=headers)
    print(f"Response Status Code: {resp_3.status_code}")
    print(f"Response Body:\n{json.dumps(resp_3.json(), indent=2)}\n")

    # -------------------------------------------------------------------------
    # PART 3: Corresponding Audit Events from PostgreSQL
    # -------------------------------------------------------------------------
    print("--- PART 3: CORRESPONDING AUDIT EVENTS FROM POSTGRESQL ---")
    audit_rows = db.query(AuditEvent).filter(
        AuditEvent.merchant_id == uuid.UUID(merchant_id)
    ).order_by(AuditEvent.created_at.asc()).all()

    print(f"Found {len(audit_rows)} Audit Event(s) for Merchant ID {merchant_id}:\n")
    for idx, event in enumerate(audit_rows, 1):
        event_dict = {
            "id": str(event.id),
            "merchant_id": str(event.merchant_id) if event.merchant_id else None,
            "actor_type": event.actor_type,
            "actor_id": str(event.actor_id) if event.actor_id else None,
            "action": event.action,
            "decision": event.decision,
            "reasoning": event.reasoning,
            "input": event.input,
            "created_at": event.created_at.isoformat() if isinstance(event.created_at, datetime) else str(event.created_at)
        }
        print(f"Audit Event #{idx}:")
        print(json.dumps(event_dict, indent=2))
        print("-" * 50)

    db.close()
    print("\n======================================================================")
    print("SUBTICKET 13.1 EVIDENCE GENERATION COMPLETE")
    print("======================================================================")

if __name__ == "__main__":
    run_subticket_13_1()
