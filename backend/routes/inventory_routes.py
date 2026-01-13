"""
Inventory Routes - مسارات المخزون
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone
from database import db
from models.all_models import Inventory, InventoryBase, InventoryUpdate
from routes.base import get_current_user, require_role, log_activity

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("")
async def get_inventory(current_user: dict = Depends(get_current_user)):
    """Get all inventory items"""
    inventory = await db.inventory.find({}, {"_id": 0}).to_list(100)
    return inventory


@router.post("", response_model=Inventory)
async def create_inventory(inventory_data: InventoryBase, current_user: dict = Depends(require_role(["admin", "employee"]))):
    """Create a new inventory item"""
    inventory = Inventory(**inventory_data.model_dump())
    await db.inventory.insert_one(inventory.model_dump())
    return inventory


@router.put("/{inventory_id}")
async def update_inventory(inventory_id: str, inventory_data: InventoryUpdate, current_user: dict = Depends(get_current_user)):
    """Update an inventory item"""
    update_data = {k: v for k, v in inventory_data.model_dump().items() if v is not None}
    update_data["last_updated"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.inventory.update_one(
        {"id": inventory_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    inventory = await db.inventory.find_one({"id": inventory_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_inventory",
        entity_type="inventory",
        entity_id=inventory_id,
        entity_name=inventory.get("product_name", ""),
        details=f"تعديل مخزون: {inventory.get('product_name', '')} - الكمية: {inventory.get('quantity_liters', 0)} لتر"
    )
    
    return inventory


@router.delete("/{inventory_id}")
async def delete_inventory(inventory_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Delete an inventory item (admin only)"""
    existing = await db.inventory.find_one({"id": inventory_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="المخزون غير موجود")
    
    await db.inventory.delete_one({"id": inventory_id})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="delete_inventory",
        entity_type="inventory",
        entity_id=inventory_id,
        entity_name=existing.get("product_name", ""),
        details=f"حذف مخزون: {existing.get('product_name', '')} - الكمية: {existing.get('quantity_liters', 0)} لتر"
    )
    
    return {"message": "تم حذف المخزون بنجاح"}
