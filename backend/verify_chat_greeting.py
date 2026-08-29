import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_greeting():
    # Register Customer
    c_email = f"greeting_cust_{uuid.uuid4().hex[:6]}@example.com"
    c_reg = client.post("/customer/auth/register", json={
        "name": "Greeting Test User",
        "email": c_email,
        "password": "Password123!"
    })
    token = c_reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("Sending prompt: 'hi buddy'...")
    res = client.post("/customer/chat", json={"prompt": "hi buddy"}, headers=headers)
    print(f"Status Code: {res.status_code}")
    data = res.json()
    print(f"Proposed Tool    : {data['proposed_tool']}")
    print(f"Response Message : {data['response_message']}")
    print(f"Search Results   : {data['search_results']}")
    
    assert data["proposed_tool"] == "conversational_greeting"
    assert data["search_results"] is None or len(data["search_results"]) == 0
    print("\n[VERIFIED] Conversational greeting handled cleanly without triggering product search or cards!")

if __name__ == "__main__":
    test_greeting()
