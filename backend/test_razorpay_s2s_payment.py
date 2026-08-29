import os
import sys
import requests
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def test_s2s_methods():
    order = client.order.create({
        "amount": 120000,
        "currency": "INR",
        "receipt": f"rcpt_s2s_{os.urandom(4).hex()}"
    })
    order_id = order["id"]
    print(f"Created Real Razorpay Order: {order_id}")

    # Method 1: Check Razorpay Recurring Payment Token API (customer tokenization)
    # Method 2: Check Razorpay S2S payment capture / mock authorize endpoint
    
    auth = (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    
    # Try S2S payment capture endpoint
    # razorpay.Client allows capturing payments, but requires a payment_id.
    # How does Razorpay generate a payment_id programmatically in test mode?
    # Endpoint 1: https://api.razorpay.com/v1/payments/create/checkout
    # Endpoint 2: https://api.razorpay.com/v1/payments/pay/netbanking
    # Endpoint 3: https://api.razorpay.com/v1/payments/pay/recurring
    
    test_urls = [
        ("POST", f"https://api.razorpay.com/v1/orders/{order_id}/payments", {
            "amount": 120000,
            "currency": "INR",
            "email": "customer@example.com",
            "contact": "9876543210",
            "method": "netbanking",
            "bank": "SBIN"
        }),
        ("POST", "https://api.razorpay.com/v1/payments", {
            "amount": 120000,
            "currency": "INR",
            "order_id": order_id,
            "email": "customer@example.com",
            "contact": "9876543210",
            "method": "netbanking",
            "bank": "SBIN"
        }),
        ("POST", "https://api.razorpay.com/v1/checkout/embedded", {
            "amount": 120000,
            "currency": "INR",
            "order_id": order_id,
            "email": "customer@example.com",
            "contact": "9876543210",
            "method": "netbanking",
            "bank": "SBIN"
        })
    ]

    for method, url, payload in test_urls:
        print(f"\nTesting {url}...")
        try:
            r = requests.request(method, url, auth=auth, json=payload)
            print(f"Status: {r.status_code}")
            print(f"Response: {r.text[:300]}")
            if r.status_code in (200, 201):
                print("SUCCESSFUL S2S PAYMENT RESPONSE!")
                data = r.json()
                pid = data.get("id") or data.get("razorpay_payment_id")
                print(f"Payment ID: {pid}")
                fetched_order = client.order.fetch(order_id)
                print(f"Order status on Razorpay: {fetched_order.get('status')}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_s2s_methods()
