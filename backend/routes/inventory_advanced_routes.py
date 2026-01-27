"""
Advanced Inventory Management Routes - مسارات إدارة المخزون المتقدمة
تتبع الدفعات، الجرد الدوري، المرتجعات، تقييم المخزون
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
from database import db
from routes.base import get_current_user
import uuid

router = APIRouter(prefix="/inventory-advanced", tags=["Advanced Inventory"])


# ==================== تتبع الدفعات (Batch/Lot Tracking) ====================

@router.get("/batches")
async def get_product_batches(
    product_id: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    status: Optional[str] = None,
    expiring_within_days: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على دفعات المنتجات"""
    query = {}
    if product_id:
        query["product_id"] = product_id
    if warehouse_id:
        query["warehouse_id"] = warehouse_id
    if status:
        query["status"] = status
    
    batches = await db.product_batches.find(query, {"_id": 0}).sort("expiry_date", 1).to_list(1000)
    
    # تصفية الدفعات التي ستنتهي قريباً
    if expiring_within_days:
        cutoff_date = (datetime.now() + timedelta(days=expiring_within_days)).strftime("%Y-%m-%d")
        batches = [b for b in batches if b.get("expiry_date") and b["expiry_date"] <= cutoff_date]
    
    return batches


@router.post("/batches")
async def create_product_batch(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """إنشاء دفعة جديدة"""
    timestamp = datetime.now().strftime("%Y%m%d")
    uid = str(uuid.uuid4())[:6].upper()
    batch_number = data.get("batch_number") or f"BTH-{timestamp}-{uid}"
    
    batch = {
        "id": str(uuid.uuid4()),
        "batch_number": batch_number,
        "product_id": data["product_id"],
        "product_name": data.get("product_name", ""),
        "product_code": data.get("product_code", ""),
        "warehouse_id": data["warehouse_id"],
        "warehouse_name": data.get("warehouse_name", ""),
        "quantity": data["quantity"],
        "initial_quantity": data["quantity"],
        "unit_cost": data.get("unit_cost", 0),
        "production_date": data.get("production_date"),
        "expiry_date": data.get("expiry_date"),
        "supplier_id": data.get("supplier_id"),
        "supplier_name": data.get("supplier_name"),
        "supplier_batch_number": data.get("supplier_batch_number"),
        "quality_status": data.get("quality_status", "approved"),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.product_batches.insert_one(batch)
    return batch


@router.get("/batches/expiring")
async def get_expiring_batches(
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """الدفعات التي ستنتهي صلاحيتها قريباً"""
    cutoff_date = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
    today = datetime.now().strftime("%Y-%m-%d")
    
    batches = await db.product_batches.find({
        "status": "active",
        "expiry_date": {"$lte": cutoff_date, "$gte": today}
    }, {"_id": 0}).sort("expiry_date", 1).to_list(500)
    
    return {
        "expiring_soon": batches,
        "count": len(batches),
        "cutoff_date": cutoff_date
    }


# ==================== الجرد الدوري (Cycle Count) ====================

@router.get("/cycle-counts")
async def get_cycle_counts(
    warehouse_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على عمليات الجرد"""
    query = {}
    if warehouse_id:
        query["warehouse_id"] = warehouse_id
    if status:
        query["status"] = status
    
    counts = await db.cycle_counts.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return counts


@router.post("/cycle-counts")
async def create_cycle_count(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """إنشاء جرد دوري جديد"""
    timestamp = datetime.now().strftime("%Y%m%d")
    uid = str(uuid.uuid4())[:6].upper()
    count_number = f"CC-{timestamp}-{uid}"
    
    cycle_count = {
        "id": str(uuid.uuid4()),
        "count_number": count_number,
        "warehouse_id": data["warehouse_id"],
        "warehouse_name": data.get("warehouse_name", ""),
        "count_type": data.get("count_type", "full"),
        "status": "draft",
        "scheduled_date": data.get("scheduled_date", datetime.now().strftime("%Y-%m-%d")),
        "total_items": 0,
        "items_counted": 0,
        "variance_count": 0,
        "variance_value": 0,
        "notes": data.get("notes"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("user_id")
    }
    
    await db.cycle_counts.insert_one(cycle_count)
    
    # إنشاء عناصر الجرد من المخزون الحالي
    stock_items = await db.warehouse_stock.find(
        {"warehouse_id": data["warehouse_id"], "quantity": {"$gt": 0}},
        {"_id": 0}
    ).to_list(1000)
    
    items = []
    for stock in stock_items:
        item = {
            "id": str(uuid.uuid4()),
            "cycle_count_id": cycle_count["id"],
            "product_id": stock["product_id"],
            "product_name": stock.get("product_name", ""),
            "product_code": stock.get("product_code", ""),
            "batch_number": stock.get("batch_number"),
            "system_quantity": stock["quantity"],
            "counted_quantity": None,
            "variance": None,
            "variance_value": None,
            "unit_cost": stock.get("unit_price", 0),
            "status": "pending"
        }
        items.append(item)
    
    if items:
        await db.cycle_count_items.insert_many(items)
    
    cycle_count["total_items"] = len(items)
    await db.cycle_counts.update_one(
        {"id": cycle_count["id"]},
        {"$set": {"total_items": len(items)}}
    )
    
    return cycle_count


@router.get("/cycle-counts/{count_id}")
async def get_cycle_count_details(
    count_id: str,
    current_user: dict = Depends(get_current_user)
):
    """تفاصيل جرد معين مع العناصر"""
    cycle_count = await db.cycle_counts.find_one({"id": count_id}, {"_id": 0})
    if not cycle_count:
        raise HTTPException(status_code=404, detail="الجرد غير موجود")
    
    items = await db.cycle_count_items.find(
        {"cycle_count_id": count_id},
        {"_id": 0}
    ).to_list(1000)
    
    cycle_count["items"] = items
    return cycle_count


@router.put("/cycle-counts/{count_id}/item/{item_id}")
async def update_cycle_count_item(
    count_id: str,
    item_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """تحديث عنصر في الجرد (إدخال الكمية الفعلية)"""
    counted_quantity = data.get("counted_quantity")
    
    item = await db.cycle_count_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="العنصر غير موجود")
    
    variance = counted_quantity - item["system_quantity"]
    variance_value = variance * item.get("unit_cost", 0)
    
    await db.cycle_count_items.update_one(
        {"id": item_id},
        {"$set": {
            "counted_quantity": counted_quantity,
            "variance": variance,
            "variance_value": variance_value,
            "status": "counted",
            "counted_at": datetime.now(timezone.utc).isoformat(),
            "notes": data.get("notes")
        }}
    )
    
    # تحديث إحصائيات الجرد
    items = await db.cycle_count_items.find({"cycle_count_id": count_id}, {"_id": 0}).to_list(1000)
    items_counted = len([i for i in items if i.get("status") == "counted"])
    variance_items = [i for i in items if i.get("variance") and i["variance"] != 0]
    total_variance = sum(i.get("variance_value", 0) for i in variance_items)
    
    await db.cycle_counts.update_one(
        {"id": count_id},
        {"$set": {
            "items_counted": items_counted,
            "variance_count": len(variance_items),
            "variance_value": total_variance
        }}
    )
    
    return {"message": "تم تحديث العنصر", "variance": variance, "variance_value": variance_value}


@router.put("/cycle-counts/{count_id}/approve")
async def approve_cycle_count(
    count_id: str,
    adjust_stock: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """الموافقة على الجرد وتعديل المخزون"""
    cycle_count = await db.cycle_counts.find_one({"id": count_id}, {"_id": 0})
    if not cycle_count:
        raise HTTPException(status_code=404, detail="الجرد غير موجود")
    
    if adjust_stock:
        items = await db.cycle_count_items.find(
            {"cycle_count_id": count_id, "status": "counted"},
            {"_id": 0}
        ).to_list(1000)
        
        for item in items:
            if item.get("variance") and item["variance"] != 0:
                timestamp = datetime.now().strftime("%Y%m%d")
                uid = str(uuid.uuid4())[:6]
                movement = {
                    "id": str(uuid.uuid4()),
                    "movement_type": "adjust",
                    "movement_number": f"ADJ-{timestamp}-{uid}",
                    "product_id": item["product_id"],
                    "product_name": item["product_name"],
                    "product_code": item["product_code"],
                    "quantity": item["variance"],
                    "unit_price": item.get("unit_cost", 0),
                    "total_value": item.get("variance_value", 0),
                    "to_warehouse_id": cycle_count["warehouse_id"],
                    "to_warehouse_name": cycle_count["warehouse_name"],
                    "reference_type": "cycle_count",
                    "reference_id": count_id,
                    "reference_number": cycle_count["count_number"],
                    "notes": "تعديل من الجرد الدوري " + cycle_count["count_number"],
                    "status": "completed",
                    "movement_date": datetime.now(timezone.utc).isoformat(),
                    "created_by": current_user.get("user_id")
                }
                await db.warehouse_movements.insert_one(movement)
                
                await db.warehouse_stock.update_one(
                    {"product_id": item["product_id"], "warehouse_id": cycle_count["warehouse_id"]},
                    {"$set": {"quantity": item["counted_quantity"]}}
                )
    
    await db.cycle_counts.update_one(
        {"id": count_id},
        {"$set": {
            "status": "approved",
            "approved_by": current_user.get("user_id"),
            "approved_by_name": current_user.get("full_name"),
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "تم الموافقة على الجرد وتعديل المخزون"}


# ==================== إدارة المرتجعات ====================

@router.get("/returns")
async def get_returns(
    return_type: Optional[str] = None,
    status: Optional[str] = None,
    party_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على المرتجعات"""
    query = {}
    if return_type:
        query["return_type"] = return_type
    if status:
        query["status"] = status
    if party_id:
        query["party_id"] = party_id
    
    returns = await db.product_returns.find(query, {"_id": 0}).sort("return_date", -1).to_list(500)
    return returns


@router.post("/returns")
async def create_return(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """إنشاء مرتجع جديد"""
    timestamp = datetime.now().strftime("%Y%m%d")
    uid = str(uuid.uuid4())[:6].upper()
    return_number = f"RTN-{timestamp}-{uid}"
    
    product_return = {
        "id": str(uuid.uuid4()),
        "return_number": return_number,
        "return_type": data["return_type"],
        "status": "pending",
        "party_type": data["party_type"],
        "party_id": data["party_id"],
        "party_name": data.get("party_name", ""),
        "product_id": data["product_id"],
        "product_name": data.get("product_name", ""),
        "product_code": data.get("product_code", ""),
        "batch_number": data.get("batch_number"),
        "quantity": data["quantity"],
        "unit_price": data.get("unit_price", 0),
        "total_value": data["quantity"] * data.get("unit_price", 0),
        "return_reason": data["return_reason"],
        "reason_notes": data.get("reason_notes"),
        "warehouse_id": data["warehouse_id"],
        "warehouse_name": data.get("warehouse_name", ""),
        "reference_type": data.get("reference_type"),
        "reference_id": data.get("reference_id"),
        "reference_number": data.get("reference_number"),
        "return_date": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("user_id"),
        "created_by_name": current_user.get("full_name"),
        "notes": data.get("notes")
    }
    
    await db.product_returns.insert_one(product_return)
    return product_return


@router.put("/returns/{return_id}/approve")
async def approve_return(
    return_id: str,
    current_user: dict = Depends(get_current_user)
):
    """الموافقة على المرتجع وتعديل المخزون"""
    product_return = await db.product_returns.find_one({"id": return_id}, {"_id": 0})
    if not product_return:
        raise HTTPException(status_code=404, detail="المرتجع غير موجود")
    
    movement_type = "receive" if product_return["return_type"] == "customer" else "issue"
    quantity = product_return["quantity"] if movement_type == "receive" else -product_return["quantity"]
    
    uid = str(uuid.uuid4())[:6]
    movement = {
        "id": str(uuid.uuid4()),
        "movement_type": "return",
        "movement_number": f"RTN-MOV-{uid}",
        "product_id": product_return["product_id"],
        "product_name": product_return["product_name"],
        "product_code": product_return["product_code"],
        "quantity": product_return["quantity"],
        "unit_price": product_return["unit_price"],
        "total_value": product_return["total_value"],
        "to_warehouse_id": product_return["warehouse_id"],
        "to_warehouse_name": product_return["warehouse_name"],
        "reference_type": "return",
        "reference_id": return_id,
        "reference_number": product_return["return_number"],
        "notes": "مرتجع: " + product_return["return_reason"],
        "status": "completed",
        "movement_date": datetime.now(timezone.utc).isoformat()
    }
    await db.warehouse_movements.insert_one(movement)
    
    stock = await db.warehouse_stock.find_one({
        "product_id": product_return["product_id"],
        "warehouse_id": product_return["warehouse_id"]
    })
    
    if stock:
        new_qty = stock["quantity"] + quantity
        await db.warehouse_stock.update_one(
            {"id": stock["id"]},
            {"$set": {"quantity": new_qty, "last_updated": datetime.now(timezone.utc).isoformat()}}
        )
    
    await db.product_returns.update_one(
        {"id": return_id},
        {"$set": {
            "status": "completed",
            "approved_by": current_user.get("user_id"),
            "approved_by_name": current_user.get("full_name"),
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "تم الموافقة على المرتجع وتعديل المخزون"}


# ==================== ربط المنتجات بالموردين ====================

@router.get("/products/{product_id}/suppliers")
async def get_product_suppliers(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على موردين منتج معين"""
    suppliers = await db.product_suppliers.find(
        {"product_id": product_id},
        {"_id": 0}
    ).sort("is_primary", -1).to_list(100)
    return suppliers


@router.post("/products/{product_id}/suppliers")
async def add_product_supplier(
    product_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """ربط منتج بمورد"""
    product = await db.warehouse_products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    product_supplier = {
        "id": str(uuid.uuid4()),
        "product_id": product_id,
        "product_name": product.get("name", ""),
        "supplier_id": data["supplier_id"],
        "supplier_name": data.get("supplier_name", ""),
        "supplier_product_code": data.get("supplier_product_code"),
        "is_primary": data.get("is_primary", False),
        "unit_price": data.get("unit_price", 0),
        "min_order_quantity": data.get("min_order_quantity", 0),
        "lead_time_days": data.get("lead_time_days", 0),
        "currency": data.get("currency", "OMR"),
        "notes": data.get("notes"),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if data.get("is_primary"):
        await db.product_suppliers.update_many(
            {"product_id": product_id},
            {"$set": {"is_primary": False}}
        )
    
    await db.product_suppliers.insert_one(product_supplier)
    return product_supplier


# ==================== تقييم المخزون وتقارير ====================

@router.get("/valuation")
async def get_inventory_valuation(
    warehouse_id: Optional[str] = None,
    method: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """تقييم المخزون"""
    settings = await db.inventory_settings.find_one({"id": "inventory_settings"}, {"_id": 0})
    valuation_method = method or (settings.get("inventory_valuation_method") if settings else "weighted_average")
    
    query = {"quantity": {"$gt": 0}}
    if warehouse_id:
        query["warehouse_id"] = warehouse_id
    
    stocks = await db.warehouse_stock.find(query, {"_id": 0}).to_list(10000)
    
    total_value = 0
    items = []
    
    for stock in stocks:
        unit_cost = stock.get("unit_price", 0)
        value = stock["quantity"] * unit_cost
        total_value += value
        
        items.append({
            "product_id": stock["product_id"],
            "product_name": stock.get("product_name", ""),
            "warehouse_name": stock.get("warehouse_name", ""),
            "quantity": stock["quantity"],
            "unit_cost": unit_cost,
            "total_value": value
        })
    
    sorted_items = sorted(items, key=lambda x: x["total_value"], reverse=True)[:100]
    
    return {
        "method": valuation_method,
        "total_value": total_value,
        "items_count": len(items),
        "items": sorted_items
    }


@router.get("/turnover")
async def get_inventory_turnover(
    months: int = 12,
    current_user: dict = Depends(get_current_user)
):
    """معدل دوران المخزون"""
    start_date = (datetime.now() - timedelta(days=months * 30)).isoformat()
    
    issues = await db.warehouse_movements.find({
        "movement_type": "issue",
        "movement_date": {"$gte": start_date}
    }, {"_id": 0}).to_list(10000)
    
    cogs = sum(m.get("total_value", 0) for m in issues)
    
    current_stock = await db.warehouse_stock.find({"quantity": {"$gt": 0}}, {"_id": 0}).to_list(10000)
    avg_inventory = sum(s.get("quantity", 0) * s.get("unit_price", 0) for s in current_stock)
    
    turnover_rate = (cogs / avg_inventory) if avg_inventory > 0 else 0
    days_inventory = (365 / turnover_rate) if turnover_rate > 0 else 0
    
    if turnover_rate > 6:
        rating = "ممتاز"
    elif turnover_rate > 4:
        rating = "جيد"
    elif turnover_rate > 2:
        rating = "متوسط"
    else:
        rating = "منخفض"
    
    recommendation = "معدل دوران جيد" if turnover_rate > 4 else "يُنصح بمراجعة مستويات المخزون"
    
    return {
        "period_months": months,
        "cost_of_goods_sold": cogs,
        "average_inventory": avg_inventory,
        "turnover_rate": round(turnover_rate, 2),
        "days_of_inventory": round(days_inventory, 1),
        "analysis": {
            "rating": rating,
            "recommendation": recommendation
        }
    }
