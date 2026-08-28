from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.transaction import (
    PaymentOrderCreate,
    PaymentVerifyRequest,
    TransactionRead
)
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/create-order", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_payment_order(order_in: PaymentOrderCreate, db: Session = Depends(get_db)):
    """
    Creates a new payment order via Razorpay test mode.
    Enforces idempotency and explicit state transitions: PROPOSED -> APPROVED -> EXECUTING.
    """
    return PaymentService.create_payment_order(db, order_in)

@router.post("/verify-and-capture", response_model=TransactionRead)
def verify_and_capture_payment(verify_in: PaymentVerifyRequest, db: Session = Depends(get_db)):
    """
    Verifies Razorpay HMAC signature and captures payment.
    Transitions state: EXECUTING -> SETTLED or FAILED.
    """
    return PaymentService.verify_and_capture_payment(db, verify_in)

@router.get("/transactions/{transaction_id}", response_model=TransactionRead)
def get_transaction_status(transaction_id: UUID, db: Session = Depends(get_db)):
    """
    Fetches transaction details and current status by ID.
    """
    tx = PaymentService.get_transaction(db, transaction_id)
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction with ID {transaction_id} does not exist"
        )
    return tx

@router.get("/razorpay-order/{order_id}")
def fetch_razorpay_order(order_id: str):
    """
    Directly fetches order payload from Razorpay's API by Order ID.
    """
    try:
        return PaymentService.fetch_razorpay_order(order_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch order from Razorpay: {str(e)}"
        )

@router.get("/razorpay-payment/{payment_id}")
def fetch_razorpay_payment(payment_id: str):
    """
    Directly fetches payment payload from Razorpay's API by Payment ID.
    """
    try:
        return PaymentService.fetch_razorpay_payment(payment_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch payment from Razorpay: {str(e)}"
        )
