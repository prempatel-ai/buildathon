import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.address import Address
from app.schemas.address import AddressCreate, AddressUpdate

class AddressService:
    @staticmethod
    def get_addresses(db: Session, customer_id: uuid.UUID) -> List[Address]:
        return db.query(Address).filter(
            Address.customer_id == customer_id
        ).order_by(Address.is_default.desc(), Address.created_at.desc()).all()

    @staticmethod
    def get_address(db: Session, customer_id: uuid.UUID, address_id: uuid.UUID) -> Address:
        addr = db.query(Address).filter(
            Address.id == address_id,
            Address.customer_id == customer_id
        ).first()
        if not addr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Delivery address not found or not owned by customer."
            )
        return addr

    @staticmethod
    def get_default_address(db: Session, customer_id: uuid.UUID) -> Optional[Address]:
        addr = db.query(Address).filter(
            Address.customer_id == customer_id,
            Address.is_default == True
        ).first()
        if not addr:
            # Fallback to most recent address if no explicit default
            addr = db.query(Address).filter(
                Address.customer_id == customer_id
            ).order_by(Address.created_at.desc()).first()
        return addr

    @staticmethod
    def create_address(db: Session, customer_id: uuid.UUID, address_in: AddressCreate) -> Address:
        # Check if customer has any addresses yet
        count = db.query(Address).filter(Address.customer_id == customer_id).count()
        make_default = address_in.is_default or (count == 0)

        if make_default:
            # Unset prior defaults
            db.query(Address).filter(
                Address.customer_id == customer_id,
                Address.is_default == True
            ).update({"is_default": False})

        new_addr = Address(
            customer_id=customer_id,
            label=address_in.label or "Home",
            recipient_name=address_in.recipient_name,
            phone=address_in.phone,
            line1=address_in.line1,
            line2=address_in.line2,
            city=address_in.city,
            state=address_in.state,
            postal_code=address_in.postal_code,
            country=address_in.country or "IN",
            is_default=make_default
        )
        db.add(new_addr)
        db.commit()
        db.refresh(new_addr)
        return new_addr

    @staticmethod
    def update_address(db: Session, customer_id: uuid.UUID, address_id: uuid.UUID, address_in: AddressUpdate) -> Address:
        addr = AddressService.get_address(db, customer_id, address_id)

        update_data = address_in.model_dump(exclude_unset=True)
        if update_data.get("is_default") is True:
            db.query(Address).filter(
                Address.customer_id == customer_id,
                Address.id != address_id
            ).update({"is_default": False})

        for key, val in update_data.items():
            setattr(addr, key, val)

        db.commit()
        db.refresh(addr)
        return addr

    @staticmethod
    def set_default(db: Session, customer_id: uuid.UUID, address_id: uuid.UUID) -> Address:
        addr = AddressService.get_address(db, customer_id, address_id)
        db.query(Address).filter(
            Address.customer_id == customer_id
        ).update({"is_default": False})

        addr.is_default = True
        db.commit()
        db.refresh(addr)
        return addr

    @staticmethod
    def delete_address(db: Session, customer_id: uuid.UUID, address_id: uuid.UUID) -> None:
        addr = AddressService.get_address(db, customer_id, address_id)
        was_default = addr.is_default

        db.delete(addr)
        db.commit()

        # If deleted address was default, promote the newest remaining address
        if was_default:
            next_addr = db.query(Address).filter(
                Address.customer_id == customer_id
            ).order_by(Address.created_at.desc()).first()
            if next_addr:
                next_addr.is_default = True
                db.commit()
