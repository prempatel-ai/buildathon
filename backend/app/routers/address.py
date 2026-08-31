import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.customer_auth import get_current_customer
from app.models.customer import Customer
from app.schemas.address import AddressCreate, AddressUpdate, AddressResponse
from app.services.address_service import AddressService

router = APIRouter(prefix="/customer/addresses", tags=["Customer Addresses"])

@router.post("", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
def create_address(
    address_in: AddressCreate,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Creates a new delivery address for the authenticated customer."""
    return AddressService.create_address(db, current_customer.id, address_in)

@router.get("", response_model=List[AddressResponse])
def list_addresses(
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Returns all saved delivery addresses for the authenticated customer."""
    return AddressService.get_addresses(db, current_customer.id)

@router.get("/default", response_model=AddressResponse)
def get_default_address(
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Returns the default delivery address for the authenticated customer."""
    addr = AddressService.get_default_address(db, current_customer.id)
    if not addr:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No delivery address found for this customer."
        )
    return addr

@router.get("/{address_id}", response_model=AddressResponse)
def get_address(
    address_id: uuid.UUID,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Returns a specific delivery address by ID if owned by customer."""
    return AddressService.get_address(db, current_customer.id, address_id)

@router.put("/{address_id}", response_model=AddressResponse)
def update_address(
    address_id: uuid.UUID,
    address_in: AddressUpdate,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Updates an existing delivery address for the authenticated customer."""
    return AddressService.update_address(db, current_customer.id, address_id, address_in)

@router.put("/{address_id}/default", response_model=AddressResponse)
def set_default_address(
    address_id: uuid.UUID,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Marks the specified address as the default delivery address."""
    return AddressService.set_default(db, current_customer.id, address_id)

@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(
    address_id: uuid.UUID,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Deletes a delivery address owned by the authenticated customer."""
    AddressService.delete_address(db, current_customer.id, address_id)
    return None
