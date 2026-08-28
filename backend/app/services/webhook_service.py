import time
import json
import hmac
import hashlib
import requests
import uuid
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.webhook import WebhookEndpoint, WebhookDeliveryLog

class WebhookService:
    @staticmethod
    def sign_payload(secret: str, timestamp: int, payload_json: str) -> str:
        """
        Signs payload using HMAC SHA-256 (Matching Razorpay/Stripe scheme).
        Signature format: t=<timestamp>,v1=<hex_sig>
        """
        signed_bytes = f"{timestamp}.{payload_json}".encode("utf-8")
        sig_hex = hmac.new(secret.encode("utf-8"), signed_bytes, hashlib.sha256).hexdigest()
        return f"t={timestamp},v1={sig_hex}"

    @staticmethod
    def dispatch_event(db: Session, merchant_id: uuid.UUID, event_type: str, payload: Dict[str, Any]) -> Optional[WebhookDeliveryLog]:
        """
        Dispatches an HMAC-signed webhook to merchant's active webhook endpoint.
        Retries up to 3 times with exponential backoff on HTTP failure.
        Logs delivery attempt status in webhook_delivery_logs table.
        """
        ep = db.query(WebhookEndpoint).filter(
            WebhookEndpoint.merchant_id == merchant_id,
            WebhookEndpoint.is_active == True
        ).first()

        if not ep or not ep.url:
            return None

        timestamp = int(time.time())
        payload_str = json.dumps(payload, separators=(',', ':'))
        sig_header = WebhookService.sign_payload(ep.secret, timestamp, payload_str)

        headers = {
            "Content-Type": "application/json",
            "X-Agentpay-Signature": sig_header,
            "User-Agent": "Agentpay-Webhook-Worker/1.0"
        }

        attempts = 0
        max_attempts = 3
        last_status = None
        last_error = None
        is_success = False

        backoffs = [0.1, 0.5, 1.0]

        for i in range(max_attempts):
            attempts += 1
            try:
                resp = requests.post(ep.url, data=payload_str, headers=headers, timeout=5)
                last_status = resp.status_code
                if 200 <= resp.status_code < 300:
                    is_success = True
                    last_error = None
                    break
                else:
                    last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
            except Exception as exc:
                last_status = 500
                last_error = str(exc)

            if i < max_attempts - 1:
                time.sleep(backoffs[i])

        log = WebhookDeliveryLog(
            id=uuid.uuid4(),
            merchant_id=merchant_id,
            event_type=event_type,
            payload=payload,
            response_status=last_status,
            attempts=attempts,
            status="delivered" if is_success else "failed",
            error_message=last_error
        )

        db.add(log)
        db.commit()
        db.refresh(log)
        return log
