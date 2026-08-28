import uuid
import razorpay
from typing import Optional, Dict, Any
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.transaction import Transaction
from app.models.merchant import Merchant
from app.schemas.transaction import (
    TransactionStatus,
    PaymentOrderCreate,
    PaymentVerifyRequest,
)
from app.services.audit_service import AuditService

class InvalidStateTransitionError(HTTPException):
    def __init__(self, current_status: str, target_status: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid state transition: Cannot transition transaction from '{current_status}' to '{target_status}'."
        )

# Legal State Machine Transitions Map
LEGAL_TRANSITIONS = {
    TransactionStatus.PROPOSED.value: {
        TransactionStatus.APPROVED.value,
        TransactionStatus.FAILED.value,
    },
    TransactionStatus.APPROVED.value: {
        TransactionStatus.EXECUTING.value,
        TransactionStatus.FAILED.value,
    },
    TransactionStatus.EXECUTING.value: {
        TransactionStatus.SETTLED.value,
        TransactionStatus.FAILED.value,
    },
    # Terminal states (SETTLED and FAILED) cannot transition anywhere
    TransactionStatus.SETTLED.value: set(),
    TransactionStatus.FAILED.value: set(),
}

def validate_state_transition(current_status: str, target_status: str) -> None:
    allowed = LEGAL_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        raise InvalidStateTransitionError(current_status, target_status)

class PaymentService:
    @staticmethod
    def get_razorpay_client() -> razorpay.Client:
        return razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

    @staticmethod
    def create_payment_order(db: Session, order_in: PaymentOrderCreate) -> Transaction:
        """
        Creates a payment order with explicit state transitions and DB-level idempotency protection.
        State transitions: PROPOSED -> APPROVED -> EXECUTING.
        Calls Razorpay's real Orders API (client.order.create).
        """
        # 1. Idempotency Check: Return existing transaction if key exists
        existing_tx = db.query(Transaction).filter(
            Transaction.idempotency_key == order_in.idempotency_key
        ).first()
        if existing_tx:
            return existing_tx

        # 2. Check merchant exists
        merchant = db.query(Merchant).filter(Merchant.id == order_in.merchant_id).first()
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Merchant with ID {order_in.merchant_id} does not exist"
            )

        # 3. Create initial transaction in PROPOSED state
        tx = Transaction(
            id=uuid.uuid4(),
            merchant_id=order_in.merchant_id,
            agent_id=order_in.agent_id,
            amount=order_in.amount,
            status=TransactionStatus.PROPOSED.value,
            idempotency_key=order_in.idempotency_key,
            error_details={}
        )

        try:
            db.add(tx)
            db.commit()
            db.refresh(tx)
        except IntegrityError:
            db.rollback()
            # Concurrent retry hit unique constraint
            existing_tx = db.query(Transaction).filter(
                Transaction.idempotency_key == order_in.idempotency_key
            ).first()
            if existing_tx:
                return existing_tx
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Idempotency conflict on transaction creation"
            )

        actor_id_str = str(tx.agent_id) if tx.agent_id else "merchant_user"

        AuditService.log_event(
            db=db,
            actor_type="agent" if tx.agent_id else "system",
            actor_id=actor_id_str,
            action="payment_proposed",
            input={
                "transaction_id": str(tx.id),
                "merchant_id": str(tx.merchant_id),
                "agent_id": str(tx.agent_id) if tx.agent_id else None,
                "amount": str(tx.amount),
                "idempotency_key": tx.idempotency_key
            },
            decision="PROPOSED",
            reasoning=f"Proposed new payment transaction for ₹{tx.amount} (Idempotency Key: {tx.idempotency_key}).",
            merchant_id=tx.merchant_id
        )

        # 4. Transition: PROPOSED -> APPROVED
        validate_state_transition(tx.status, TransactionStatus.APPROVED.value)
        tx.status = TransactionStatus.APPROVED.value
        db.commit()
        db.refresh(tx)

        AuditService.log_event(
            db=db,
            actor_type="system",
            actor_id="policy_engine",
            action="payment_approved",
            input={
                "transaction_id": str(tx.id),
                "merchant_id": str(tx.merchant_id),
                "amount": str(tx.amount)
            },
            decision="APPROVED",
            reasoning=f"Transaction {tx.id} approved for execution by policy checks.",
            merchant_id=tx.merchant_id
        )

        # 5. Transition: APPROVED -> EXECUTING
        validate_state_transition(tx.status, TransactionStatus.EXECUTING.value)
        tx.status = TransactionStatus.EXECUTING.value
        db.commit()
        db.refresh(tx)

        # 6. Direct Call to Razorpay Orders API (client.order.create)
        try:
            client = PaymentService.get_razorpay_client()
            amount_in_paise = int(tx.amount * 100)
            receipt = order_in.receipt or f"rcpt_{tx.id.hex[:12]}"
            notes = order_in.notes or {}
            notes.update({"transaction_id": str(tx.id), "merchant_id": str(tx.merchant_id)})

            rzp_order = client.order.create(data={
                "amount": amount_in_paise,
                "currency": "INR",
                "receipt": receipt,
                "notes": notes
            })

            tx.razorpay_order_id = rzp_order.get("id")
            db.commit()
            db.refresh(tx)

            AuditService.log_event(
                db=db,
                actor_type="system",
                actor_id="payment_service",
                action="payment_executing",
                input={
                    "transaction_id": str(tx.id),
                    "merchant_id": str(tx.merchant_id),
                    "amount": str(tx.amount),
                    "razorpay_order_id": tx.razorpay_order_id,
                    "receipt": receipt
                },
                decision="EXECUTING",
                reasoning=f"Razorpay order '{tx.razorpay_order_id}' created successfully for ₹{tx.amount}.",
                merchant_id=tx.merchant_id
            )

            return tx
        except Exception as e:
            # Clean transition to FAILED state if Razorpay API call fails
            tx.status = TransactionStatus.FAILED.value
            tx.error_details = {"error": "Razorpay order creation failed", "details": str(e)}
            db.commit()
            db.refresh(tx)

            AuditService.log_event(
                db=db,
                actor_type="system",
                actor_id="payment_service",
                action="payment_failed",
                input={
                    "transaction_id": str(tx.id),
                    "merchant_id": str(tx.merchant_id),
                    "error": str(e)
                },
                decision="FAILED",
                reasoning=f"Razorpay order creation failed: {str(e)}",
                merchant_id=tx.merchant_id
            )

            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Razorpay Order Creation Failed: {str(e)}"
            )

    @staticmethod
    def verify_and_capture_payment(db: Session, verify_in: PaymentVerifyRequest) -> Transaction:
        """
        Verifies Razorpay payment HMAC signature AND double-checks captured status against Razorpay's real API.
        Transitions transaction: EXECUTING -> SETTLED or FAILED.
        """
        tx = db.query(Transaction).filter(Transaction.id == verify_in.transaction_id).first()
        if not tx:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction with ID {verify_in.transaction_id} does not exist"
            )

        # Idempotent return if transaction already reached a terminal state
        if tx.status in (TransactionStatus.SETTLED.value, TransactionStatus.FAILED.value):
            return tx

        # Validate state transition: EXECUTING -> SETTLED / FAILED
        if tx.status != TransactionStatus.EXECUTING.value:
            raise InvalidStateTransitionError(tx.status, TransactionStatus.SETTLED.value)

        # Step 1: Signature verification via Razorpay SDK utility
        params_dict = {
            "razorpay_order_id": verify_in.razorpay_order_id,
            "razorpay_payment_id": verify_in.razorpay_payment_id,
            "razorpay_signature": verify_in.razorpay_signature
        }

        client = PaymentService.get_razorpay_client()

        try:
            client.utility.verify_payment_signature(params_dict)
        except razorpay.errors.SignatureVerificationError:
            validate_state_transition(tx.status, TransactionStatus.FAILED.value)
            tx.status = TransactionStatus.FAILED.value
            tx.razorpay_payment_id = verify_in.razorpay_payment_id
            tx.error_details = {
                "error": "Signature verification failed",
                "details": "Razorpay HMAC SHA256 signature does not match expected payload."
            }
            db.commit()
            db.refresh(tx)

            AuditService.log_event(
                db=db,
                actor_type="system",
                actor_id="payment_service",
                action="payment_failed",
                input={
                    "transaction_id": str(tx.id),
                    "merchant_id": str(tx.merchant_id),
                    "razorpay_order_id": verify_in.razorpay_order_id,
                    "razorpay_payment_id": verify_in.razorpay_payment_id
                },
                decision="FAILED",
                reasoning="Razorpay payment HMAC SHA256 signature verification failed. Invalid or tampered signature.",
                merchant_id=tx.merchant_id
            )

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Razorpay payment signature verification failed. Invalid or tampered signature."
            )

        # Step 2 (SUBTICKET 4.3 Mandatory Check): Fetch payment directly from Razorpay API and confirm status is captured & captured == True
        try:
            rzp_payment = client.payment.fetch(verify_in.razorpay_payment_id)
            rzp_status = rzp_payment.get("status")
            is_captured = rzp_payment.get("captured", False)

            # If authorized, attempt auto-capture on Razorpay
            if rzp_status == "authorized" and not is_captured:
                try:
                    amount_paise = int(tx.amount * 100)
                    client.payment.capture(verify_in.razorpay_payment_id, amount_paise)
                    rzp_payment = client.payment.fetch(verify_in.razorpay_payment_id)
                    rzp_status = rzp_payment.get("status")
                    is_captured = rzp_payment.get("captured", False)
                except Exception:
                    pass

            if rzp_status != "captured" or not is_captured:
                # MANDATORY FAIL: Payment was NOT captured on Razorpay's side!
                validate_state_transition(tx.status, TransactionStatus.FAILED.value)
                tx.status = TransactionStatus.FAILED.value
                tx.razorpay_order_id = verify_in.razorpay_order_id
                tx.razorpay_payment_id = verify_in.razorpay_payment_id
                tx.error_details = {
                    "error": "Razorpay Payment Capture Verification Failed",
                    "razorpay_status": rzp_status,
                    "captured": is_captured,
                    "details": rzp_payment.get("error_description") or f"Payment state on Razorpay is '{rzp_status}', not 'captured'."
                }
                db.commit()
                db.refresh(tx)

                AuditService.log_event(
                    db=db,
                    actor_type="system",
                    actor_id="payment_service",
                    action="payment_failed",
                    input={
                        "transaction_id": str(tx.id),
                        "merchant_id": str(tx.merchant_id),
                        "razorpay_order_id": verify_in.razorpay_order_id,
                        "razorpay_payment_id": verify_in.razorpay_payment_id,
                        "razorpay_status": rzp_status,
                        "captured": is_captured
                    },
                    decision="FAILED",
                    reasoning=f"Razorpay capture verification failed: Razorpay payment status is '{rzp_status}' (captured: {is_captured}).",
                    merchant_id=tx.merchant_id
                )

                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Payment capture verification failed. Razorpay payment status is '{rzp_status}' (captured: {is_captured})."
                )

            # Step 3: Verification & Capture Confirmed -> SETTLED
            validate_state_transition(tx.status, TransactionStatus.SETTLED.value)
            tx.status = TransactionStatus.SETTLED.value
            tx.razorpay_order_id = verify_in.razorpay_order_id
            tx.razorpay_payment_id = verify_in.razorpay_payment_id
            tx.razorpay_signature = verify_in.razorpay_signature
            db.commit()
            db.refresh(tx)

            AuditService.log_event(
                db=db,
                actor_type="system",
                actor_id="payment_service",
                action="payment_settled",
                input={
                    "transaction_id": str(tx.id),
                    "merchant_id": str(tx.merchant_id),
                    "amount": str(tx.amount),
                    "razorpay_order_id": tx.razorpay_order_id,
                    "razorpay_payment_id": tx.razorpay_payment_id,
                    "razorpay_signature": tx.razorpay_signature
                },
                decision="SETTLED",
                reasoning=f"Payment {tx.id} settled: Razorpay signature verified and live capture confirmed (Order ID: {tx.razorpay_order_id}, Payment ID: {tx.razorpay_payment_id}).",
                merchant_id=tx.merchant_id
            )

            return tx

        except HTTPException:
            raise
        except Exception as e:
            tx.status = TransactionStatus.FAILED.value
            tx.error_details = {"error": "Payment verification failed", "details": str(e)}
            db.commit()
            db.refresh(tx)

            AuditService.log_event(
                db=db,
                actor_type="system",
                actor_id="payment_service",
                action="payment_failed",
                input={
                    "transaction_id": str(tx.id),
                    "merchant_id": str(tx.merchant_id),
                    "error": str(e)
                },
                decision="FAILED",
                reasoning=f"Payment capture verification failed: {str(e)}",
                merchant_id=tx.merchant_id
            )

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment verification failed: {str(e)}"
            )

    @staticmethod
    def fetch_razorpay_order(order_id: str) -> Dict[str, Any]:
        client = PaymentService.get_razorpay_client()
        return client.order.fetch(order_id)

    @staticmethod
    def fetch_razorpay_payment(payment_id: str) -> Dict[str, Any]:
        client = PaymentService.get_razorpay_client()
        return client.payment.fetch(payment_id)

    @staticmethod
    def get_transaction(db: Session, transaction_id: uuid.UUID) -> Optional[Transaction]:
        return db.query(Transaction).filter(Transaction.id == transaction_id).first()
