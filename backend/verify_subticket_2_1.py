import requests
import json

BASE_URL = "http://localhost:8000"

def verify():
    # 0. Get merchant
    m_res = requests.get(f"{BASE_URL}/merchants")
    merchants = m_res.json()
    merchant_id = merchants[0]["id"]

    items_res = requests.get(f"{BASE_URL}/catalog/items?merchant_id={merchant_id}")
    items = items_res.json()

    print("=======================================================")
    print("1. PUT /catalog/items/{item_id} - UPDATE ITEM")
    print("=======================================================")
    target_id = items[0]["id"]
    update_payload = {
        "name": "UltraComfort Wireless Headphones v2",
        "price": 3899.99,
        "stock": 50,
        "category": "Electronics"
    }
    put_res = requests.put(f"{BASE_URL}/catalog/items/{target_id}", json=update_payload)
    print(f"HTTP Status: {put_res.status_code}")
    print("API Response:")
    print(json.dumps(put_res.json(), indent=2))

    print("\n=======================================================")
    print("2. DELETE /catalog/items/{item_id} - DELETE ITEM")
    print("=======================================================")
    delete_id = items[-1]["id"]
    del_res = requests.delete(f"{BASE_URL}/catalog/items/{delete_id}")
    print(f"HTTP Status: {del_res.status_code} (204 No Content)")
    print(f"Target Deleted ID: {delete_id}")

    print("\n=======================================================")
    print("3. GET /catalog/agent-schema - FULL UNTRUNCATED JSON-LD")
    print("=======================================================")
    schema_res = requests.get(f"{BASE_URL}/catalog/agent-schema?merchant_id={merchant_id}")
    print(json.dumps(schema_res.json(), indent=2))

    print("\n=======================================================")
    print("4. POST /catalog/items WITH NON-EXISTENT MERCHANT ID")
    print("=======================================================")
    bad_item_res = requests.post(
        f"{BASE_URL}/catalog/items",
        json={
            "merchant_id": "00000000-0000-0000-0000-000000000000",
            "name": "Orphan Item",
            "price": 499.00,
            "stock": 10,
            "category": "Gadgets"
        }
    )
    print(f"HTTP Status: {bad_item_res.status_code}")
    print("API Response:")
    print(json.dumps(bad_item_res.json(), indent=2))

    print("\n=======================================================")
    print("5. POST /merchants WITH INVALID/EMPTY NAME")
    print("=======================================================")
    bad_merchant_res = requests.post(
        f"{BASE_URL}/merchants",
        json={"name": ""}
    )
    print(f"HTTP Status: {bad_merchant_res.status_code}")
    print("API Response:")
    print(json.dumps(bad_merchant_res.json(), indent=2))

if __name__ == "__main__":
    verify()
