import os
import sys
import json
import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

def verify_order_on_razorpay_servers():
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    target_order_id = "order_TVcFAXkF17bqwX"

    print("==================================================================")
    print(f"VERIFYING ORDER '{target_order_id}' ON LIVE RAZORPAY SERVERS")
    print("==================================================================")
    print(f"Razorpay Key ID used by App: {settings.RAZORPAY_KEY_ID}")
    
    order = client.order.fetch(target_order_id)
    print(f"\n[LIVE RAZORPAY API RESPONSE FOR {target_order_id}]:")
    print(f"  - Order ID        : {order['id']}")
    print(f"  - Amount          : INR {order['amount'] / 100:.2f}")
    print(f"  - Currency        : {order['currency']}")
    print(f"  - Status          : {order['status']}")
    print(f"  - Receipt         : {order['receipt']}")
    print(f"  - Transaction ID  : {order['notes'].get('transaction_id')}")
    print(f"  - Merchant ID     : {order['notes'].get('merchant_id')}")
    created_dt = datetime.datetime.fromtimestamp(order['created_at'], tz=datetime.timezone.utc)
    print(f"  - Created At (UTC): {created_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print("==================================================================")

if __name__ == "__main__":
    verify_order_on_razorpay_servers()
