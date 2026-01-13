"""
Sales Routes - مسارات المبيعات
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timezone
from database import db
from models.all_models import Sale, SaleCreate
from routes.base import get_current_user, log_activity

router = APIRouter(prefix="/sales", tags=["Sales"])


async def create_auto_journal_entry(description, lines, reference_type, reference_id, created_by_id, created_by_name):
    """Helper function to create auto journal entries"""
    from models.all_models import JournalEntry, JournalEntryLine
    import uuid
    
    entry_lines = []
    total_debit = 0
    total_credit = 0
    
    for line in lines:
        entry_line = JournalEntryLine(
            id=str(uuid.uuid4()),
            account_number=line["account_number"],
            account_name=line.get("description", ""),
            debit=line["debit"],
            credit=line["credit"],
            description=line.get("description", "")
        )
        entry_lines.append(entry_line.model_dump())
        total_debit += line["debit"]
        total_credit += line["credit"]
    
    journal_entry = JournalEntry(
        entry_number=f"AUTO-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        entry_date=datetime.now(timezone.utc).isoformat(),
        description=description,
        entry_type="auto",
        lines=entry_lines,
        total_debit=total_debit,
        total_credit=total_credit,
        status="posted",
        reference_type=reference_type,
        reference_id=reference_id,
        created_by=created_by_id,
        created_by_name=created_by_name,
        is_auto=True
    )
    
    await db.journal_entries.insert_one(journal_entry.model_dump())
    return journal_entry


@router.post("", response_model=Sale)
async def create_sale(sale_data: SaleCreate, current_user: dict = Depends(get_current_user)):
    """Create a new sale"""
    sale = Sale(**sale_data.model_dump())
    sale.total_amount = sale.quantity_liters * sale.price_per_liter
    sale.created_by = current_user["id"]
    sale.is_paid = sale.sale_type == "cash"
    
    await db.sales.insert_one(sale.model_dump())
    
    # Update customer's total purchases
    balance_change = 0 if sale.is_paid else sale.total_amount
    await db.customers.update_one(
        {"id": sale.customer_id},
        {"$inc": {"total_purchases": sale.total_amount, "balance": balance_change}}
    )
    
    # Update inventory
    await db.inventory.update_one(
        {"product_type": "raw_milk"},
        {"$inc": {"quantity_liters": -sale.quantity_liters}, "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_sale",
        entity_type="sale",
        entity_id=sale.id,
        entity_name=sale.customer_name,
        details=f"عملية بيع: {sale.quantity_liters} لتر إلى {sale.customer_name} - {sale.total_amount} ر.ع"
    )
    
    # === AUTO JOURNAL ENTRY: Milk Sale ===
    if sale.is_paid:
        # Cash sale: Dr: الصندوق (1111) / Cr: إيرادات مبيعات الحليب (4100)
        await create_auto_journal_entry(
            description=f"بيع حليب نقدي إلى {sale.customer_name} - {sale.quantity_liters} لتر",
            lines=[
                {"account_number": "1111", "debit": sale.total_amount, "credit": 0, "description": "نقدية من بيع الحليب"},
                {"account_number": "4100", "debit": 0, "credit": sale.total_amount, "description": "إيراد مبيعات الحليب"}
            ],
            reference_type="milk_sale",
            reference_id=sale.id,
            created_by_id=current_user["id"],
            created_by_name=current_user["full_name"]
        )
    else:
        # Credit sale: Dr: العملاء (1120) / Cr: إيرادات مبيعات الحليب (4100)
        await create_auto_journal_entry(
            description=f"بيع حليب آجل إلى {sale.customer_name} - {sale.quantity_liters} لتر",
            lines=[
                {"account_number": "1120", "debit": sale.total_amount, "credit": 0, "description": f"مستحق من العميل {sale.customer_name}"},
                {"account_number": "4100", "debit": 0, "credit": sale.total_amount, "description": "إيراد مبيعات الحليب"}
            ],
            reference_type="milk_sale",
            reference_id=sale.id,
            created_by_id=current_user["id"],
            created_by_name=current_user["full_name"]
        )
    
    return sale


@router.get("", response_model=List[Sale])
async def get_sales(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    customer_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get sales with optional filters"""
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    if start_date:
        query["sale_date"] = {"$gte": start_date}
    if end_date:
        if "sale_date" in query:
            query["sale_date"]["$lte"] = end_date
        else:
            query["sale_date"] = {"$lte": end_date}
    
    sales = await db.sales.find(query, {"_id": 0}).sort("sale_date", -1).to_list(1000)
    return sales
