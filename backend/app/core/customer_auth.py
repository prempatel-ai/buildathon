import uuid
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, hash_password, verify_password
from app.models.customer import Customer

customer_security_bearer = HTTPBearer(auto_error=False)

def create_customer_access_token(customer_id: str, email: str, expires_delta: Optional[timedelta] = None) -> str:
    """Generates signed JWT access token for Customer actor."""
    to_encode = {
        "sub": str(customer_id),
        "email": email,
        "actor_type": "customer",
        "exp": datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)

def get_current_customer(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(customer_security_bearer),
    db: Session = Depends(get_db)
) -> Customer:
    """
    FastAPI dependency extracting authenticated customer from Bearer JWT header.
    Returns authenticated Customer model.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Customer authentication required. Please provide a valid Bearer JWT token."
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Customer JWT token has expired."
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate Customer JWT token."
        )

    if payload.get("actor_type") != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid token type: customer token required."
        )

    customer_id_str = payload.get("sub")
    if not customer_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid JWT token payload: missing subject identifier."
        )

    try:
        cust_uuid = uuid.UUID(customer_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid customer ID format in JWT token."
        )

    customer = db.query(Customer).filter(Customer.id == cust_uuid).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated customer account no longer exists."
        )

    return customer
