import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def check_order():
    try:
        # Check order
        order_id = "order_TVcFAXkF17bqwX"
        print(f"Fetching Order '{order_id}' from Razorpay API servers...")
        order_info = client.order.fetch(order_id)
        print("ORDER FETCHED DIRECTLY FROM RAZORPAY API SERVERS:")
        print(json.dumps(order_info, indent=2))
    except Exception as e:
        print(f"Error fetching order: {e}")

    try:
        # Check recent orders on this Razorpay account
        print("\nFetching recent 5 orders from this Razorpay Key ID...")
        recent_orders = client.order.all({"count": 5})
        for o in recent_orders.get("items", []):
            print(f"  - Order ID: {o['id']} | Amount: ₹{o['amount']/100} | Status: {o['status']} | Created: {o['created_at']}")
    except Exception as e:
        print(f"Error fetching recent orders: {e}")

if __name__ == "__main__":
    check_order()
