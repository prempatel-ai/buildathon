import requests
import re
import json
from app.core.config import settings
from app.services.payment_service import PaymentService

client = PaymentService.get_razorpay_client()
order = client.order.create(data={
    "amount": 75000,
    "currency": "INR",
    "receipt": "rcpt_test_flow_96",
    "notes": {
        "transaction_id": "test_tx_sub96_uuid",
        "merchant_id": "test_merchant_sub96_uuid"
    }
})

order_id = order["id"]
print("Created New Order:", order_id)

url = "https://api.razorpay.com/v1/payments/create/checkout"
data = {
    "key_id": settings.RAZORPAY_KEY_ID,
    "amount": 75000,
    "currency": "INR",
    "order_id": order_id,
    "email": "sub96_test@example.com",
    "contact": "9876543210",
    "method": "netbanking",
    "bank": "YESB"
}

r1 = requests.post(url, data=data)
m_pay = re.search(r'var payment_id = "(pay_[^"]+)";', r1.text)
m_action1 = re.search(r'action="([^"]+)"', r1.text)
m_cb1 = re.search(r'name="callback_url" value="([^"]+)"', r1.text)
m_pid_raw = re.search(r'name="payment_id" value="([^"]+)"', r1.text)

if m_pay and m_action1 and m_cb1:
    payment_id = m_pay.group(1)
    action1_url = m_action1.group(1)
    cb1_url = m_cb1.group(1)
    pid_raw = m_pid_raw.group(1)

    print("Generated Payment ID:", payment_id)

    r2 = requests.post(action1_url, data={
        "action": "authorize",
        "amount": "75000",
        "method": "netbanking",
        "payment_id": pid_raw,
        "callback_url": cb1_url,
        "recurring": "0"
    })

    m_action2 = re.search(r'action="([^"]+)"', r2.text)
    m_cb2 = re.search(r'name="callback_url" value="([^"]+)"', r2.text)

    if m_action2 and m_cb2:
        action2_url = m_action2.group(1)
        cb2_url = m_cb2.group(1)

        r3 = requests.post(action2_url, data={
            "callback_url": cb2_url,
            "language_code": "en",
            "success": "S"
        })
        print("Mocksharp Submit Status:", r3.status_code)

    # Fetch Payment Status from Razorpay API
    payment_info = client.payment.fetch(payment_id)
    print("Fetched Payment Status on Razorpay:", payment_info.get("status"))
    print("Fetched Payment Captured Flag:", payment_info.get("captured"))
    print("Fetched Payment Notes:", payment_info.get("notes"))
