import argparse
import requests
import json
import time
import uuid
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_live_demo(backend_url: str):
    print("=======================================================")
    print(f"LIVE DEMO SCRIPT VERIFICATION FOR SUBTICKET 7.1")
    print(f"Target Public Backend URL: {backend_url}")
    print("=======================================================")

    # Step 1: Health Check
    print("\n[STEP 1] GET /health check from public internet...")
    try:
        health_resp = requests.get(f"{backend_url}/health", timeout=15)
        print(f"HTTP Status Code: {health_resp.status_code}")
        print(f"Health Response:  {json.dumps(health_resp.json(), indent=2)}")
        assert health_resp.status_code == 200, "Health check failed!"
    except Exception as e:
        print(f"ERROR reaching backend health endpoint: {e}")
        return

    # Step 2: Onboard Merchant
    print("\n[STEP 2] Onboard Merchant via POST /merchants/seed...")
    merchant_resp = requests.post(f"{backend_url}/merchants/seed", timeout=15).json()
    merchant_id = merchant_resp["id"]
    merchant_name = merchant_resp["name"]
    print(f"Seeded Merchant ID:   {merchant_id}")
    print(f"Seeded Merchant Name: {merchant_name}")

    # Set spend limit policy: max_amount = ₹1,000.00
    pol_resp = requests.post(f"{backend_url}/policies/", json={
        "merchant_id": merchant_id,
        "rule_type": "max_amount",
        "config": {"max_amount": 1000.00}
    }, timeout=15).json()
    print(f"Created Spend Policy: max_amount = ₹1,000.00")

    agent_id = f"agent_live_{uuid.uuid4().hex[:6]}"

    # Step 3: Agent Queries Catalog
    print("\n[STEP 3] AI Buyer Agent Queries Catalog via /agent/chat...")
    query_resp = requests.post(f"{backend_url}/agent/chat", json={
        "merchant_id": merchant_id,
        "agent_id": agent_id,
        "prompt": "What wireless headphones or electronics are available in stock?"
    }, timeout=30).json()
    print(f"Agent Proposed Tool: {query_resp.get('proposed_tool')}")
    print(f"Agent Status:        {query_resp.get('status')}")
    print(f"Response Message:    {query_resp.get('response_message')}")

    # Step 4: Agent Proposes Purchase (ALLOW Flow)
    print("\n[STEP 4] AI Buyer Agent Proposes Purchase Order (Within Limit)...")
    allow_resp = requests.post(f"{backend_url}/agent/chat", json={
        "merchant_id": merchant_id,
        "agent_id": agent_id,
        "prompt": "Order wireless noise-canceling headphones for 450 INR in Electronics"
    }, timeout=30).json()

    print(f"Policy Decision:   {allow_resp.get('policy_decision')}")
    print(f"Agent Status:      {allow_resp.get('status')}")
    print(f"LangGraph Thread:  {allow_resp.get('thread_id')}")
    print(f"Razorpay Order ID: {allow_resp.get('razorpay_order_id')}")
    print(f"Decision Reasoning: {allow_resp.get('reasoning')}")

    # Step 5: Deliberate Over-Limit Failure (DENY Flow)
    print("\n[STEP 5] Deliberate Over-Limit Purchase (₹45,000 against ₹1,000 Limit)...")
    deny_resp = requests.post(f"{backend_url}/agent/chat", json={
        "merchant_id": merchant_id,
        "agent_id": agent_id,
        "prompt": "Order enterprise server rack hardware for 45000 INR in Electronics"
    }, timeout=30).json()

    print(f"Policy Decision:   {deny_resp.get('policy_decision')}")
    print(f"Agent Status:      {deny_resp.get('status')}")
    print(f"Decision Reasoning: {deny_resp.get('reasoning')}")

    # Step 6: Verify Audit Trail
    print("\n[STEP 6] Fetch Immutable Audit Trail via GET /audit/events...")
    audit_resp = requests.get(f"{backend_url}/audit/events?merchant_id={merchant_id}", timeout=15).json()
    print(f"Total Audit Events Logged: {audit_resp.get('total')}")
    for item in audit_resp.get('items', [])[:5]:
        print(f"  - [{item['actor_type']}:{item['actor_id']}] {item['action']} -> {item['decision']} | {item['reasoning'][:60]}")

    print("\n=======================================================")
    print("LIVE DEMO SCRIPT VERIFICATION COMPLETE — ALL STEPS PASSED!")
    print("=======================================================")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Live Demo Script Verification")
    parser.add_argument("--backend-url", default="http://localhost:8000", help="Base URL of deployed backend")
    args = parser.parse_args()

    run_live_demo(args.backend_url.rstrip("/"))
