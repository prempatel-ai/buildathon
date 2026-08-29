import os
import sys
import requests
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

def test_real_razorpay_payment_creation():
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    
    # 1. Create a real Order on Razorpay
    order = client.order.create({
        "amount": 120000, # 1200 INR in paise
        "currency": "INR",
        "receipt": "rcpt_test_direct_123"
    })
    order_id = order["id"]
    print(f"Created Real Order on Razorpay: {order_id}")

    # 2. Attempt to create a real test payment via Razorpay S2S endpoint
    # Method 1: S2S JSON endpoint used by Razorpay test mocks
    auth = (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    
    # Try S2S payment creation endpoint
    url = "https://api.razorpay.com/v1/payments/create/json"
    payload = {
        "amount": 120000,
        "currency": "INR",
        "order_id": order_id,
        "email": "customer@example.com",
        "contact": "9876543210",
        "method": "netbanking",
        "bank": "YESB"
    }

    try:
        resp = requests.post(url, auth=auth, json=payload)
        print(f"S2S Create Response Status: {resp.status_code}")
        print(f"S2S Create Response Body: {resp.text[:300]}")
        if resp.status_code in (200, 201):
            data = resp.json()
            pid = data.get("razorpay_payment_id") or data.get("id")
            print(f"REAL PAYMENT ID CREATED ON RAZORPAY SERVER: {pid}")
            
            # Fetch it back via SDK to verify it exists on Razorpay
            fetched = client.payment.fetch(pid)
            print("FETCHED FROM RAZORPAY SERVER:")
            print(json.dumps(fetched, indent=2))
            return
    except Exception as e:
        print(f"S2S method error: {e}")

    # Method 2: Check if there's any other server-side test payment endpoint or capture
    print("Testing alternative API methods...")

if __name__ == "__main__":
    test_real_razorpay_payment_creation()
