import os
import sys
import requests
import json
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def test_cards():
    order = client.order.create({
        "amount": 50000,
        "currency": "INR",
        "receipt": f"rcpt_card_{os.urandom(4).hex()}"
    })
    order_id = order["id"]
    print(f"Created Real Order: {order_id}")

    url = "https://api.razorpay.com/v1/payments"
    
    # Razorpay test card list
    cards = [
        "5555555555555555",
        "4000000000000002",
        "4556000000000001",
        "5241000000000001"
    ]

    session = requests.Session()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/json",
        "Referer": "https://api.razorpay.com/",
        "Origin": "https://api.razorpay.com"
    }

    for num in cards:
        print(f"\n--- Testing Card Number {num} ---")
        json_payload = {
            "key_id": settings.RAZORPAY_KEY_ID,
            "amount": 50000,
            "currency": "INR",
            "order_id": order_id,
            "email": "customer@example.com",
            "contact": "9876543210",
            "method": "card",
            "card": {
                "name": "Prem Patel",
                "number": num,
                "cvv": "123",
                "expiry_month": "12",
                "expiry_year": "2030"
            }
        }

        r = session.post(url, json=json_payload, headers=headers)
        match = re.search(r'var data = ({.*?});', r.text)
        if match:
            print(f"Callback Data: {match.group(1)[:300]}")
        else:
            print(f"Body snippet: {r.text[:300]}")

if __name__ == "__main__":
    test_cards()
