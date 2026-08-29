import os
import sys
import requests
import json
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def test_enabled_bank():
    order = client.order.create({
        "amount": 50000,
        "currency": "INR",
        "receipt": f"rcpt_yesb_{os.urandom(4).hex()}"
    })
    order_id = order["id"]
    print(f"Created Real Order: {order_id}")

    url = "https://api.razorpay.com/v1/payments"
    
    # YESB is enabled on this account!
    payload = {
        "key_id": settings.RAZORPAY_KEY_ID,
        "amount": 50000,
        "currency": "INR",
        "order_id": order_id,
        "email": "customer@example.com",
        "contact": "9876543210",
        "method": "netbanking",
        "bank": "YESB"
    }

    session = requests.Session()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://api.razorpay.com/",
        "Origin": "https://api.razorpay.com"
    }

    r = session.post(url, data=payload, headers=headers)
    print(f"Status Code: {r.status_code}")
    print(f"HTML snippet:\n{r.text[:800]}")

    match = re.search(r'var data = ({.*?});', r.text)
    if match:
        print(f"\nExtracted Data: {match.group(1)}")

    updated_order = client.order.fetch(order_id)
    print(f"\nRAZORPAY ORDER STATUS ON SERVER: {updated_order.get('status')}")

if __name__ == "__main__":
    test_enabled_bank()
