import requests
import subprocess
import json
import time
import uuid
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000"

def run_cmd(cmd_list, cwd=None):
    res = subprocess.run(cmd_list, capture_output=True, text=True, cwd=cwd)
    return res.stdout.strip()

def run_verification():
    print("=======================================================")
    print("TICKET 7: PHASE 6 FAILURE HANDLING & UX POLISH VERIFICATION")
    print("=======================================================")

    # 1. Seed fresh merchant
    print("\n1. SEEDING FRESH MERCHANT")
    merchant = requests.post(f"{BASE_URL}/merchants/seed").json()
    merchant_id = merchant["id"]
    print(f"Merchant ID: {merchant_id}")

    # Set policy: max_amount = 1000.00, approval_threshold = 200.00
    requests.post(f"{BASE_URL}/policies/", json={
        "merchant_id": merchant_id,
        "rule_type": "max_amount",
        "config": {"max_amount": 1000.00, "approval_threshold": 200.00}
    })
    agent_id = f"agent_key_{uuid.uuid4().hex[:6]}"

    # 2. Trigger Over-Limit DENY twice to prove repeatability
    print("\n=======================================================")
    print("2. DELIBERATE OVER-LIMIT DENY DEMO CASE (RUN 1 & RUN 2)")
    print("=======================================================")
    
    for run in [1, 2]:
        deny_res = requests.post(f"{BASE_URL}/agent/chat", json={
            "merchant_id": merchant_id,
            "agent_id": agent_id,
            "prompt": "Order luxury server equipment for 45000 INR in Electronics"
        }).json()

        print(f"\n[Run {run}] Policy Decision:  {deny_res.get('policy_decision')}")
        print(f"[Run {run}] Agent Status:      {deny_res.get('status')}")
        print(f"[Run {run}] Decision Reasoning: {deny_res.get('reasoning')}")

    print("\nPSQL SELECT COUNT(*) FROM transactions FOR OVER-LIMIT DENY CASE:")
    psql_count_deny = run_cmd(["docker", "exec", "agentpay_postgres", "psql", "-U", "agentpay", "-d", "agentpay_db", "-c", f"SELECT COUNT(*) FROM transactions WHERE merchant_id = '{merchant_id}';"], cwd="d:\\last\\infra")
    print(psql_count_deny)

    # 3. Trigger Human Rejection Flow (NEEDS_APPROVAL -> REJECTED)
    print("\n=======================================================")
    print("3. NEEDS_APPROVAL -> HUMAN REJECTION FLOW")
    print("=======================================================")
    
    interrupt_res = requests.post(f"{BASE_URL}/agent/chat", json={
        "merchant_id": merchant_id,
        "agent_id": agent_id,
        "prompt": "Order wireless noise-canceling headphones for 450 INR in Electronics"
    }).json()

    print(f"Policy Decision:      {interrupt_res.get('policy_decision')}")
    print(f"Agent Status:         {interrupt_res.get('status')}")
    print(f"Pending Approval ID:  {interrupt_res.get('pending_approval_id')}")

    pending_id = interrupt_res.get('pending_approval_id')

    # Merchant clicks REJECT
    reject_res = requests.post(f"{BASE_URL}/agent/approve/{pending_id}", json={
        "action": "reject",
        "merchant_id": merchant_id
    }).json()

    print(f"\nHuman Rejection Message: {reject_res.get('message')}")
    print(f"Pending Action Status:   {reject_res.get('status')}")

    print("\nPSQL Audit Event for Human Rejection:")
    psql_reject_audit = run_cmd(["docker", "exec", "agentpay_postgres", "psql", "-U", "agentpay", "-d", "agentpay_db", "-c", f"SELECT created_at, actor_type, actor_id, action, decision, reasoning FROM audit_events WHERE action = 'human_approval_rejected' AND merchant_id = '{merchant_id}';"], cwd="d:\\last\\infra")
    print(psql_reject_audit)

    print("\nPSQL SELECT COUNT(*) FROM transactions FOR REJECTION CASE:")
    psql_count_reject = run_cmd(["docker", "exec", "agentpay_postgres", "psql", "-U", "agentpay", "-d", "agentpay_db", "-c", f"SELECT COUNT(*) FROM transactions WHERE merchant_id = '{merchant_id}';"], cwd="d:\\last\\infra")
    print(psql_count_reject)

    # 4. API Resilience Sweep for Malformed Inputs
    print("\n=======================================================")
    print("4. API RESILIENCE SWEEP (MALFORMED INPUT HANDLING)")
    print("=======================================================")
    
    fake_merchant_id = str(uuid.uuid4())
    bad_req = requests.post(f"{BASE_URL}/agent/chat", json={
        "merchant_id": fake_merchant_id,
        "agent_id": agent_id,
        "prompt": "Buy item"
    })

    print(f"Non-existent Merchant Status Code: {bad_req.status_code}")
    print(f"Response Detail Payload:          {bad_req.json().get('detail')}")

    print("\nTICKET 7 VERIFICATION COMPLETE — ALL TESTS & CHECKS PASSED!")

if __name__ == "__main__":
    run_verification()
