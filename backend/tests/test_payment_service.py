import uuid
import hmac
import hashlib
from unittest.mock import MagicMock, patch
from decimal import Decimal
import pytest
from fastapi import HTTPException
from app.core.database import SessionLocal
from app.models.merchant import Merchant
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionStatus,
    PaymentOrderCreate,
    PaymentVerifyRequest
)
from app.services.payment_service import PaymentService, validate_state_transition, InvalidStateTransitionError
from app.core.config import settings

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_merchant(db_session):
    merchant = Merchant(
        id=uuid.uuid4(),
        name="Payment Test Merchant Store",
        limits_config={}
    )
    db_session.add(merchant)
    db_session.commit()
    db_session.refresh(merchant)
    return merchant

def test_state_machine_legal_and_illegal_transitions():
    # Legal transitions
    validate_state_transition(TransactionStatus.PROPOSED.value, TransactionStatus.APPROVED.value)
    validate_state_transition(TransactionStatus.APPROVED.value, TransactionStatus.EXECUTING.value)
    validate_state_transition(TransactionStatus.EXECUTING.value, TransactionStatus.SETTLED.value)
    validate_state_transition(TransactionStatus.EXECUTING.value, TransactionStatus.FAILED.value)

    # Illegal transitions MUST raise InvalidStateTransitionError
    with pytest.raises(InvalidStateTransitionError):
        validate_state_transition(TransactionStatus.PROPOSED.value, TransactionStatus.SETTLED.value)

    with pytest.raises(InvalidStateTransitionError):
        validate_state_transition(TransactionStatus.EXECUTING.value, TransactionStatus.APPROVED.value)

    with pytest.raises(InvalidStateTransitionError):
        validate_state_transition(TransactionStatus.SETTLED.value, TransactionStatus.FAILED.value)

    with pytest.raises(InvalidStateTransitionError):
        validate_state_transition(TransactionStatus.FAILED.value, TransactionStatus.SETTLED.value)

def test_idempotency_protection(db_session, test_merchant):
    idempotency_key = f"idemp_test_{uuid.uuid4().hex[:8]}"

    # Order payload
    order_payload = PaymentOrderCreate(
        merchant_id=test_merchant.id,
        amount=Decimal("500.00"),
        idempotency_key=idempotency_key
    )

    # First call: creates order
    tx1 = PaymentService.create_payment_order(db_session, order_payload)
    assert tx1.idempotency_key == idempotency_key
    assert tx1.status == TransactionStatus.EXECUTING.value
    tx1_id = tx1.id

    # Second call with SAME idempotency key: MUST return existing transaction without duplicate row
    tx2 = PaymentService.create_payment_order(db_session, order_payload)
    assert tx2.id == tx1_id
    assert tx2.idempotency_key == idempotency_key

    # DB count check: exactly ONE row exists
    count = db_session.query(Transaction).filter(
        Transaction.idempotency_key == idempotency_key
    ).count()
    assert count == 1

def test_signature_verification_success_and_tampered(db_session, test_merchant):
    tx = Transaction(
        id=uuid.uuid4(),
        merchant_id=test_merchant.id,
        amount=Decimal("1000.00"),
        status=TransactionStatus.EXECUTING.value,
        razorpay_order_id=f"order_{uuid.uuid4().hex[:12]}",
        idempotency_key=f"idemp_sig_{uuid.uuid4().hex[:8]}"
    )
    db_session.add(tx)
    db_session.commit()
    db_session.refresh(tx)

    payment_id = f"pay_{uuid.uuid4().hex[:12]}"
    secret = settings.RAZORPAY_KEY_SECRET

    # Generate valid HMAC SHA256 signature
    msg = f"{tx.razorpay_order_id}|{payment_id}".encode("utf-8")
    valid_signature = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    # 1. Test Tampered Signature -> REJECTED (HTTP 400 & transitions state to FAILED)
    tampered_req = PaymentVerifyRequest(
        transaction_id=tx.id,
        razorpay_order_id=tx.razorpay_order_id,
        razorpay_payment_id=payment_id,
        razorpay_signature="tampered_fake_signature_12345"
    )

    with pytest.raises(HTTPException) as exc_info:
        PaymentService.verify_and_capture_payment(db_session, tampered_req)

    assert exc_info.value.status_code == 400
    db_session.refresh(tx)
    assert tx.status == TransactionStatus.FAILED.value
    assert "Signature verification failed" in tx.error_details.get("error", "")

    # Reset state to EXECUTING to test valid signature path
    tx.status = TransactionStatus.EXECUTING.value
    db_session.commit()

    # 2. Test Valid Signature with Mocked Razorpay Capture -> ALLOWED (Transitions state to SETTLED)
    valid_req = PaymentVerifyRequest(
        transaction_id=tx.id,
        razorpay_order_id=tx.razorpay_order_id,
        razorpay_payment_id=payment_id,
        razorpay_signature=valid_signature
    )
    
    mock_client = MagicMock()
    mock_client.utility.verify_payment_signature.return_value = True
    mock_client.payment.fetch.return_value = {"id": payment_id, "status": "captured", "captured": True}

    with patch.object(PaymentService, "get_razorpay_client", return_value=mock_client):
        res_tx = PaymentService.verify_and_capture_payment(db_session, valid_req)
        assert res_tx.status == TransactionStatus.SETTLED.value
        assert res_tx.razorpay_payment_id == payment_id
        assert res_tx.razorpay_signature == valid_signature

def test_failed_payment_clean_state(db_session, test_merchant):
    tx = Transaction(
        id=uuid.uuid4(),
        merchant_id=test_merchant.id,
        amount=Decimal("250.00"),
        status=TransactionStatus.EXECUTING.value,
        razorpay_order_id="order_failed_test",
        idempotency_key=f"idemp_fail_{uuid.uuid4().hex[:8]}"
    )
    db_session.add(tx)
    db_session.commit()

    bad_req = PaymentVerifyRequest(
        transaction_id=tx.id,
        razorpay_order_id="order_failed_test",
        razorpay_payment_id="pay_invalid_card",
        razorpay_signature="invalid_signature"
    )

    with pytest.raises(HTTPException):
        PaymentService.verify_and_capture_payment(db_session, bad_req)

    db_session.refresh(tx)
    assert tx.status == TransactionStatus.FAILED.value
    assert tx.razorpay_payment_id == "pay_invalid_card"
    assert tx.error_details is not None
