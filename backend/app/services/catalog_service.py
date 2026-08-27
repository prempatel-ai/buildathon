from uuid import UUID
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.catalog import CatalogItem
from app.models.merchant import Merchant
from app.schemas.catalog import CatalogItemCreate, CatalogItemUpdate

class CatalogService:
    @staticmethod
    def create_catalog_item(db: Session, item_in: CatalogItemCreate) -> CatalogItem:
        # Verify merchant exists
        merchant = db.query(Merchant).filter(Merchant.id == item_in.merchant_id).first()
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Merchant with ID {item_in.merchant_id} does not exist"
            )
        
        item = CatalogItem(
            merchant_id=item_in.merchant_id,
            name=item_in.name,
            price=item_in.price,
            stock=item_in.stock,
            category=item_in.category
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def get_catalog_item(db: Session, item_id: UUID) -> Optional[CatalogItem]:
        return db.query(CatalogItem).filter(CatalogItem.id == item_id).first()

    @staticmethod
    def list_catalog_items(db: Session, merchant_id: UUID, skip: int = 0, limit: int = 100) -> List[CatalogItem]:
        # Verify merchant exists
        merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Merchant with ID {merchant_id} does not exist"
            )
        return db.query(CatalogItem).filter(CatalogItem.merchant_id == merchant_id).offset(skip).limit(limit).all()

    @staticmethod
    def update_catalog_item(db: Session, item_id: UUID, item_in: CatalogItemUpdate) -> CatalogItem:
        item = CatalogService.get_catalog_item(db, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Catalog item with ID {item_id} does not exist"
            )
        update_data = item_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(item, field, value)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def delete_catalog_item(db: Session, item_id: UUID) -> bool:
        item = CatalogService.get_catalog_item(db, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Catalog item with ID {item_id} does not exist"
            )
        db.delete(item)
        db.commit()
        return True

    @staticmethod
    def generate_agent_schema(db: Session, merchant_id: UUID) -> Dict[str, Any]:
        merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Merchant with ID {merchant_id} does not exist"
            )

        items = db.query(CatalogItem).filter(CatalogItem.merchant_id == merchant_id).all()

        elements = []
        for index, item in enumerate(items, start=1):
            availability = (
                "https://schema.org/InStock"
                if item.stock > 0
                else "https://schema.org/OutOfStock"
            )
            elements.append({
                "@type": "ListItem",
                "position": index,
                "item": {
                    "@type": "Product",
                    "productID": str(item.id),
                    "name": item.name,
                    "category": item.category,
                    "offers": {
                        "@type": "Offer",
                        "price": str(item.price),
                        "priceCurrency": "INR",
                        "availability": availability,
                        "inventoryLevel": {
                            "@type": "QuantitativeValue",
                            "value": item.stock
                        }
                    }
                }
            })

        return {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": f"{merchant.name} Agent-Readable Catalog",
            "description": "Structured product catalog formatted for AI buyer agents and MCP integration.",
            "merchant": {
                "@type": "Organization",
                "identifier": str(merchant.id),
                "name": merchant.name
            },
            "numberOfItems": len(items),
            "itemListElement": elements
        }
