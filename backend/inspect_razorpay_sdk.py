import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def inspect_sdk():
    print("Razorpay Client attributes/methods:")
    for attr in dir(client):
        if not attr.startswith("_"):
            obj = getattr(client, attr)
            methods = [m for m in dir(obj) if not m.startswith("_")] if not callable(obj) else []
            print(f"  - client.{attr}: {methods if methods else type(obj)}")

if __name__ == "__main__":
    inspect_sdk()
