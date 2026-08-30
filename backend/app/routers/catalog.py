from uuid import UUID
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.catalog import CatalogItemCreate, CatalogItemRead, CatalogItemUpdate
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/catalog", tags=["catalog"])

@router.post("/items", response_model=CatalogItemRead, status_code=status.HTTP_201_CREATED)
def create_catalog_item(item_in: CatalogItemCreate, db: Session = Depends(get_db)):
    return CatalogService.create_catalog_item(db, item_in)

@router.get("/items", response_model=List[CatalogItemRead])
def list_catalog_items(merchant_id: UUID, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return CatalogService.list_catalog_items(db, merchant_id=merchant_id, skip=skip, limit=limit)

@router.get("/items/{item_id}", response_model=CatalogItemRead)
def get_catalog_item(item_id: UUID, db: Session = Depends(get_db)):
    item = CatalogService.get_catalog_item(db, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Catalog item with ID {item_id} does not exist"
        )
    return item

@router.put("/items/{item_id}", response_model=CatalogItemRead)
def update_catalog_item(item_id: UUID, item_in: CatalogItemUpdate, db: Session = Depends(get_db)):
    return CatalogService.update_catalog_item(db, item_id, item_in)

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_catalog_item(item_id: UUID, db: Session = Depends(get_db)):
    CatalogService.delete_catalog_item(db, item_id)
    return None

@router.get("/agent-schema", response_model=Dict[str, Any])
def get_agent_schema(merchant_id: UUID, db: Session = Depends(get_db)):
    """Returns a structured schema.org JSON-LD document representing the merchant's catalog for AI buyer agents."""
    return CatalogService.generate_agent_schema(db, merchant_id)

@router.post("/bulk-import", response_model=List[CatalogItemRead], status_code=status.HTTP_201_CREATED)
def bulk_import_catalog_items(merchant_id: UUID, items_in: List[CatalogItemCreate], db: Session = Depends(get_db)):
    """Bulk import catalog items for a merchant via JSON or Shopify/CSV sync."""
    return CatalogService.bulk_import_catalog_items(db, merchant_id=merchant_id, items_data=items_in)

@router.post("/shopify-sync", response_model=List[CatalogItemRead], status_code=status.HTTP_201_CREATED)
def sync_shopify_catalog(merchant_id: UUID, store_url: str = "myshop.myshopify.com", access_token: Optional[str] = None, db: Session = Depends(get_db)):
    """Automatically fetch and sync products directly from a Shopify store domain into Agentpay."""
    return CatalogService.sync_shopify_catalog(db, merchant_id=merchant_id, store_url=store_url, access_token=access_token)
