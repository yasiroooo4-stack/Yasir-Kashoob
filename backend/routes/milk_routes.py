"""
Milk Reception Routes - مسارات استقبال الحليب
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timezone
from database import db
from models.all_models import MilkReception, MilkReceptionCreate
from routes.base import get_current_user, log_activity
from routes.sales_routes import create_auto_journal_entry

router = APIRouter(prefix="/milk-receptions", tags=["Milk Receptions"])


@router.post("", response_model=MilkReception)
async def create_milk_reception(reception_data: MilkReceptionCreate, current_user: dict = Depends(get_current_user)):
    """Create a new milk reception record"""
    reception = MilkReception(**reception_data.model_dump())
    reception.total_amount = reception.quantity_liters * reception.price_per_liter
    reception.created_by = current_user["id"]
    
    await db.milk_receptions.insert_one(reception.model_dump())
    
    # Update supplier's total supplied
    await db.suppliers.update_one(
        {"id": reception.supplier_id},
        {"$inc": {"total_supplied": reception.quantity_liters, "balance": reception.total_amount}}
    )
    
    # Update inventory
    await db.inventory.update_one(
        {"product_type": "raw_milk"},
        {"$inc": {"quantity_liters": reception.quantity_liters}, "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_milk_reception",
        entity_type="milk_reception",
        entity_id=reception.id,
        entity_name=reception.supplier_name,
        details=f"استلام حليب: {reception.quantity_liters} لتر من {reception.supplier_name}"
    )
    
    # === AUTO JOURNAL ENTRY: Milk Purchase ===
    # Dr: مشتريات الحليب (5100) / Cr: الموردين (2110)
    await create_auto_journal_entry(
        description=f"شراء حليب من {reception.supplier_name} - {reception.quantity_liters} لتر",
        lines=[
            {"account_number": "5100", "debit": reception.total_amount, "credit": 0, "description": "تكلفة شراء الحليب"},
            {"account_number": "2110", "debit": 0, "credit": reception.total_amount, "description": f"مستحق للمورد {reception.supplier_name}"}
        ],
        reference_type="milk_purchase",
        reference_id=reception.id,
        created_by_id=current_user["id"],
        created_by_name=current_user["full_name"]
    )
    
    return reception


@router.get("")
async def get_milk_receptions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    supplier_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get milk receptions with optional filters"""
    query = {}
    if supplier_id:
        query["supplier_id"] = supplier_id
    if start_date:
        query["reception_date"] = {"$gte": start_date}
    if end_date:
        if "reception_date" in query:
            query["reception_date"]["$lte"] = end_date
        else:
            query["reception_date"] = {"$lte": end_date}
    
    receptions = await db.milk_receptions.find(query, {"_id": 0}).sort("reception_date", -1).to_list(2500)
    return receptions


@router.get("/{reception_id}", response_model=MilkReception)
async def get_milk_reception(reception_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific milk reception by ID"""
    reception = await db.milk_receptions.find_one({"id": reception_id}, {"_id": 0})
    if not reception:
        raise HTTPException(status_code=404, detail="Milk reception not found")
    return reception
