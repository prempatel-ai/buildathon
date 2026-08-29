import os
import sys
import requests
import json
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def test_full_auto_settlement():
    order = client.order.create({
        "amount": 50000,
        "currency": "INR",
        "receipt": f"rcpt_auto_{os.urandom(4).hex()}"
    })
    order_id = order["id"]
    print(f"1. Created Real Order on Razorpay: {order_id}")

    url = "https://api.razorpay.com/v1/payments"
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

    r1 = session.post(url, data=payload, headers=headers)
    action_match = re.search(r'<form[^>]*action=["\']([^"\']+)["\']', r1.text)
    form1_match = re.search(r'<form[^>]*name=["\']form1["\'][^>]*>(.*?)</form>', r1.text, re.DOTALL)
    
    form_action = action_match.group(1)
    inputs = re.findall(r'<input[^>]*name=["\']([^"\']+)["\'][^>]*value=["\']([^"\']*)["\']', form1_match.group(1))
    form_data = {name: val for name, val in inputs}
    
    r2 = session.post(form_action, data=form_data, headers=headers)
    print(f"--- R2 HTML Content ---\n{r2.text}")

if __name__ == "__main__":
    test_full_auto_settlement()
