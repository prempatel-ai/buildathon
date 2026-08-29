import os
import sys
import requests
import json
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def test_perfect_settlement():
    # 1. Create Order
    order = client.order.create({
        "amount": 50000, # 500 INR
        "currency": "INR",
        "receipt": f"rcpt_perfect_{os.urandom(4).hex()}"
    })
    order_id = order["id"]
    print(f"1. Created Real Order on Razorpay: {order_id}")

    # 2. Step 1: Initiate Payment
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
    
    # 3. Step 2: Submit gateway form to land on mock sharp bank page
    r2 = session.post(form_action, data=form_data, headers=headers)
    
    submit_url = re.search(r'<form[^>]*action=["\']([^"\']+)["\']', r2.text).group(1)
    cb_url = re.search(r'name=["\']callback_url["\']\s*value=["\']([^"\']+)["\']', r2.text).group(1)

    print(f"2. Extracted Callback URL: {cb_url}")
    
    submit_payload = {
        "callback_url": cb_url,
        "language_code": "en",
        "success": "S"
    }

    # 4. Step 3: Post success to mock sharp payment submit
    print(f"3. Submitting success form to {submit_url}...")
    r3 = session.post(submit_url, data=submit_payload, headers=headers)
    print(f"Submit Status: {r3.status_code}")
    print(f"Submit Response Snippet:\n{r3.text[:600]}")

    # 5. Step 4: If r3 returns a redirect or HTML, inspect order status on Razorpay API!
    updated_order = client.order.fetch(order_id)
    print("\n==================================================================")
    print(f"FINAL RAZORPAY ORDER STATUS ON SERVER: {updated_order.get('status')}")
    print(f"RAZORPAY ORDER AMOUNT PAID: INR {updated_order.get('amount_paid') / 100:.2f}")
    print("==================================================================")

if __name__ == "__main__":
    test_perfect_settlement()
