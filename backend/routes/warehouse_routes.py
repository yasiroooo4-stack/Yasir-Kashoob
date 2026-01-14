"""
Warehouse Management Routes - مسارات إدارة المخازن الشاملة
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from database import db
from models.all_models import (
    Warehouse, WarehouseBase,
    ProductCategory, ProductCategoryBase,
    WarehouseProduct, WarehouseProductBase,
    ProductStock, ProductStockBase,
    StockMovement, StockMovementBase,
    LabSolution, LabSolutionBase,
    SolutionConsumption, SolutionConsumptionBase,
    PurchaseRequest, PurchaseRequestBase,
    StockAlert, StockAlertBase
)
from routes.base import get_current_user, require_role, log_activity
import uuid
import io
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter(prefix="/warehouse", tags=["Warehouse Management"])

# ==================== المراكز والمخازن الافتراضية ====================

CENTERS = ["زيك", "حجيف", "غدو", "طاقة", "ثمريت", "مرباط"]

WAREHOUSE_CATEGORIES = {
    "internal": {
        "name_ar": "مخزن داخلي",
        "name_en": "Internal Warehouse",
        "sub_warehouses": [
            {"category": "lab", "name_ar": "مخزن المختبر", "name_en": "Lab Warehouse", "temp_controlled": True, "expiry_tracking": True},
            {"category": "maintenance", "name_ar": "مخزن الصيانة", "name_en": "Maintenance Warehouse", "temp_controlled": False, "expiry_tracking": False},
            {"category": "cleaning", "name_ar": "مخزن مواد التنظيف", "name_en": "Cleaning Materials Warehouse", "temp_controlled": False, "expiry_tracking": True},
            {"category": "ppe", "name_ar": "مخزن معدات الحماية", "name_en": "PPE Warehouse", "temp_controlled": False, "expiry_tracking": False},
        ]
    },
    "external": {
        "name_ar": "مخزن خارجي",
        "name_en": "External Warehouse",
        "sub_warehouses": [
            {"category": "feed", "name_ar": "مخزن الأعلاف", "name_en": "Feed Warehouse", "temp_controlled": False, "expiry_tracking": True},
            {"category": "equipment", "name_ar": "مخزن المعدات وقطع الغيار", "name_en": "Equipment & Spare Parts", "temp_controlled": False, "expiry_tracking": False},
            {"category": "supplies", "name_ar": "مخزن مستلزمات الموردين", "name_en": "Supplier Supplies", "temp_controlled": False, "expiry_tracking": False},
        ]
    }
}


# ==================== وظائف التنبيهات ====================

async def send_email_alert(to_email: str, subject: str, body: str):
    """إرسال تنبيه بالبريد الإلكتروني"""
    try:
        smtp_host = os.environ.get("SMTP_HOST", "")
        smtp_port = int(os.environ.get("SMTP_PORT", 465))
        smtp_user = os.environ.get("SMTP_USER", "")
        smtp_password = os.environ.get("SMTP_PASSWORD", "")
        smtp_from = os.environ.get("SMTP_FROM_EMAIL", smtp_user)
        
        if not all([smtp_host, smtp_user, smtp_password, to_email]):
            print(f"Email config missing, skipping email to {to_email}")
            return False
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_from
        msg["To"] = to_email
        
        html_body = f"""
        <html dir="rtl">
        <body style="font-family: Arial, sans-serif; direction: rtl;">
            {body}
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))
        
        with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, to_email, msg.as_string())
        
        print(f"Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


async def send_sms_alert(phone: str, message: str):
    """إرسال تنبيه SMS"""
    try:
        # TODO: تكامل مع مزود SMS
        # يمكن استخدام Twilio أو أي مزود آخر
        print(f"SMS to {phone}: {message}")
        return True
    except Exception as e:
        print(f"Failed to send SMS: {e}")
        return False


async def create_stock_alert(
    alert_type: str,
    product_id: str,
    product_name: str,
    product_code: str,
    warehouse_id: str,
    warehouse_name: str,
    center_name: str,
    current_quantity: float,
    min_quantity: float,
    expiry_date: str = None,
    days_to_expiry: int = None
):
    """إنشاء تنبيه مخزون"""
    
    # تحديد الرسالة والأولوية
    if alert_type == "low_stock":
        if current_quantity == 0:
            message = f"⚠️ نفاد المخزون: {product_name} في {warehouse_name} ({center_name})"
            priority = "critical"
        elif current_quantity <= min_quantity * 0.5:
            message = f"🔴 مخزون منخفض جداً: {product_name} - الكمية: {current_quantity} (الحد الأدنى: {min_quantity})"
            priority = "high"
        else:
            message = f"🟡 مخزون منخفض: {product_name} - الكمية: {current_quantity} (الحد الأدنى: {min_quantity})"
            priority = "medium"
    elif alert_type == "expiry_warning":
        message = f"⏰ قرب انتهاء الصلاحية: {product_name} في {warehouse_name} - ينتهي في {days_to_expiry} يوم ({expiry_date})"
        priority = "high" if days_to_expiry <= 7 else "medium"
    elif alert_type == "expired":
        message = f"🚫 منتهي الصلاحية: {product_name} في {warehouse_name} - انتهى في {expiry_date}"
        priority = "critical"
    else:
        message = f"تنبيه مخزون: {product_name}"
        priority = "low"
    
    # التحقق من عدم وجود تنبيه مشابه غير محلول
    existing = await db.stock_alerts.find_one({
        "alert_type": alert_type,
        "product_id": product_id,
        "warehouse_id": warehouse_id,
        "is_resolved": False
    }, {"_id": 0})
    
    if existing:
        # تحديث التنبيه الموجود
        await db.stock_alerts.update_one(
            {"id": existing["id"]},
            {"$set": {
                "current_quantity": current_quantity,
                "message": message,
                "priority": priority,
                "created_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return existing["id"]
    
    # إنشاء تنبيه جديد
    alert = StockAlert(
        alert_type=alert_type,
        product_id=product_id,
        product_name=product_name,
        product_code=product_code,
        warehouse_id=warehouse_id,
        warehouse_name=warehouse_name,
        center_name=center_name,
        current_quantity=current_quantity,
        min_quantity=min_quantity,
        expiry_date=expiry_date,
        days_to_expiry=days_to_expiry,
        message=message,
        priority=priority
    )
    
    await db.stock_alerts.insert_one(alert.model_dump())
    
    # إرسال التنبيهات
    warehouse = await db.warehouses.find_one({"id": warehouse_id}, {"_id": 0})
    if warehouse:
        # إرسال لمشرف المركز
        if warehouse.get("supervisor_email"):
            await send_email_alert(
                warehouse["supervisor_email"],
                f"تنبيه مخزون - {center_name}",
                f"""
                <h2>تنبيه مخزون</h2>
                <p><strong>{message}</strong></p>
                <table border="1" cellpadding="10" style="border-collapse: collapse;">
                    <tr><td>المنتج</td><td>{product_name}</td></tr>
                    <tr><td>الرمز</td><td>{product_code}</td></tr>
                    <tr><td>المخزن</td><td>{warehouse_name}</td></tr>
                    <tr><td>المركز</td><td>{center_name}</td></tr>
                    <tr><td>الكمية الحالية</td><td>{current_quantity}</td></tr>
                    <tr><td>الحد الأدنى</td><td>{min_quantity}</td></tr>
                </table>
                """
            )
            await db.stock_alerts.update_one({"id": alert.id}, {"$set": {"notified_via_email": True}})
        
        if warehouse.get("supervisor_phone"):
            sms_msg = f"تنبيه: {product_name} - الكمية: {current_quantity} ({warehouse_name})"
            await send_sms_alert(warehouse["supervisor_phone"], sms_msg)
            await db.stock_alerts.update_one({"id": alert.id}, {"$set": {"notified_via_sms": True}})
        
        # إرسال لمسؤول المخازن
        if warehouse.get("warehouse_manager_email"):
            await send_email_alert(
                warehouse["warehouse_manager_email"],
                f"تنبيه مخزون - {center_name}",
                f"<h2>{message}</h2><p>المنتج: {product_name} | المخزن: {warehouse_name} | الكمية: {current_quantity}</p>"
            )
    
    return alert.id


async def check_stock_alerts():
    """فحص المخزون وإنشاء التنبيهات"""
    # فحص المخزون المنخفض
    products = await db.warehouse_products.find({"status": "active"}, {"_id": 0}).to_list(1000)
    product_map = {p["id"]: p for p in products}
    
    stock_items = await db.product_stock.find({}, {"_id": 0}).to_list(5000)
    
    for item in stock_items:
        product = product_map.get(item.get("product_id"))
        if not product:
            continue
        
        min_qty = product.get("min_quantity", 0)
        current_qty = item.get("quantity", 0)
        
        # تنبيه نقص المخزون
        if min_qty > 0 and current_qty <= min_qty:
            warehouse = await db.warehouses.find_one({"id": item.get("warehouse_id")}, {"_id": 0})
            await create_stock_alert(
                alert_type="low_stock",
                product_id=item.get("product_id"),
                product_name=item.get("product_name"),
                product_code=item.get("product_code"),
                warehouse_id=item.get("warehouse_id"),
                warehouse_name=item.get("warehouse_name"),
                center_name=warehouse.get("center_name", "") if warehouse else "",
                current_quantity=current_qty,
                min_quantity=min_qty
            )
        
        # تنبيه انتهاء الصلاحية
        if item.get("expiry_date") and product.get("expiry_tracking"):
            try:
                expiry = datetime.strptime(item["expiry_date"], "%Y-%m-%d")
                today = datetime.now()
                days_to_expiry = (expiry - today).days
                
                warehouse = await db.warehouses.find_one({"id": item.get("warehouse_id")}, {"_id": 0})
                alert_days = warehouse.get("expiry_alert_days", 30) if warehouse else 30
                
                if days_to_expiry <= 0:
                    await create_stock_alert(
                        alert_type="expired",
                        product_id=item.get("product_id"),
                        product_name=item.get("product_name"),
                        product_code=item.get("product_code"),
                        warehouse_id=item.get("warehouse_id"),
                        warehouse_name=item.get("warehouse_name"),
                        center_name=warehouse.get("center_name", "") if warehouse else "",
                        current_quantity=current_qty,
                        min_quantity=min_qty,
                        expiry_date=item["expiry_date"],
                        days_to_expiry=days_to_expiry
                    )
                elif days_to_expiry <= alert_days:
                    await create_stock_alert(
                        alert_type="expiry_warning",
                        product_id=item.get("product_id"),
                        product_name=item.get("product_name"),
                        product_code=item.get("product_code"),
                        warehouse_id=item.get("warehouse_id"),
                        warehouse_name=item.get("warehouse_name"),
                        center_name=warehouse.get("center_name", "") if warehouse else "",
                        current_quantity=current_qty,
                        min_quantity=min_qty,
                        expiry_date=item["expiry_date"],
                        days_to_expiry=days_to_expiry
                    )
            except:
                pass


# ==================== المخازن ====================

@router.get("/warehouses")
async def get_warehouses(
    status: Optional[str] = None,
    warehouse_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على قائمة المخازن"""
    query = {}
    if status:
        query["status"] = status
    if warehouse_type:
        query["warehouse_type"] = warehouse_type
    
    warehouses = await db.warehouses.find(query, {"_id": 0}).sort("name", 1).to_list(100)
    return warehouses


@router.post("/warehouses")
async def create_warehouse(
    data: WarehouseBase,
    current_user: dict = Depends(get_current_user)
):
    """إنشاء مخزن جديد"""
    # التحقق من عدم تكرار الرمز
    existing = await db.warehouses.find_one({"code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="رمز المخزن موجود مسبقاً")
    
    warehouse = Warehouse(**data.model_dump())
    await db.warehouses.insert_one(warehouse.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user.get("full_name", ""),
        action="create_warehouse",
        entity_type="warehouse",
        entity_id=warehouse.id,
        entity_name=warehouse.name,
        details=f"إنشاء مخزن: {warehouse.name}"
    )
    
    return warehouse.model_dump()


@router.put("/warehouses/{warehouse_id}")
async def update_warehouse(
    warehouse_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """تحديث مخزن"""
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.warehouses.update_one(
        {"id": warehouse_id},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="المخزن غير موجود")
    
    warehouse = await db.warehouses.find_one({"id": warehouse_id}, {"_id": 0})
    return warehouse


@router.delete("/warehouses/{warehouse_id}")
async def delete_warehouse(
    warehouse_id: str,
    current_user: dict = Depends(get_current_user)
):
    """حذف مخزن"""
    # التحقق من عدم وجود مخزون
    stock_count = await db.product_stock.count_documents({"warehouse_id": warehouse_id})
    if stock_count > 0:
        raise HTTPException(status_code=400, detail="لا يمكن حذف المخزن - يوجد مخزون مرتبط")
    
    await db.warehouses.delete_one({"id": warehouse_id})
    return {"message": "تم حذف المخزن بنجاح"}


# ==================== فئات المنتجات ====================

@router.get("/categories")
async def get_categories(current_user: dict = Depends(get_current_user)):
    """الحصول على فئات المنتجات"""
    categories = await db.product_categories.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    return categories


@router.post("/categories")
async def create_category(
    data: ProductCategoryBase,
    current_user: dict = Depends(get_current_user)
):
    """إنشاء فئة منتج"""
    category = ProductCategory(**data.model_dump())
    await db.product_categories.insert_one(category.model_dump())
    return category.model_dump()


# ==================== المنتجات ====================

@router.get("/products")
async def get_products(
    category_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على قائمة المنتجات"""
    query = {}
    if category_id:
        query["category_id"] = category_id
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.warehouse_products.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    return products


@router.post("/products")
async def create_product(
    data: WarehouseProductBase,
    current_user: dict = Depends(get_current_user)
):
    """إنشاء منتج جديد"""
    existing = await db.warehouse_products.find_one({"code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="رمز المنتج موجود مسبقاً")
    
    product = WarehouseProduct(**data.model_dump())
    await db.warehouse_products.insert_one(product.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user.get("full_name", ""),
        action="create_product",
        entity_type="product",
        entity_id=product.id,
        entity_name=product.name,
        details=f"إنشاء منتج: {product.name}"
    )
    
    return product.model_dump()


@router.put("/products/{product_id}")
async def update_product(
    product_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """تحديث منتج"""
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.warehouse_products.update_one(
        {"id": product_id},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    product = await db.warehouse_products.find_one({"id": product_id}, {"_id": 0})
    return product


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """حذف منتج"""
    stock_count = await db.product_stock.count_documents({"product_id": product_id, "quantity": {"$gt": 0}})
    if stock_count > 0:
        raise HTTPException(status_code=400, detail="لا يمكن حذف المنتج - يوجد مخزون")
    
    await db.warehouse_products.delete_one({"id": product_id})
    return {"message": "تم حذف المنتج بنجاح"}


# ==================== مخزون المنتجات ====================

@router.get("/stock")
async def get_stock(
    warehouse_id: Optional[str] = None,
    product_id: Optional[str] = None,
    low_stock: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على مخزون المنتجات"""
    query = {}
    if warehouse_id:
        query["warehouse_id"] = warehouse_id
    if product_id:
        query["product_id"] = product_id
    if search:
        query["$or"] = [
            {"product_name": {"$regex": search, "$options": "i"}},
            {"product_code": {"$regex": search, "$options": "i"}}
        ]
    
    stock = await db.product_stock.find(query, {"_id": 0}).sort("product_name", 1).to_list(1000)
    
    # Filter low stock if requested
    if low_stock:
        # Get min quantities from products
        products = await db.warehouse_products.find({}, {"_id": 0, "id": 1, "min_quantity": 1}).to_list(500)
        min_qty_map = {p["id"]: p.get("min_quantity", 0) for p in products}
        stock = [s for s in stock if s["quantity"] <= min_qty_map.get(s["product_id"], 0)]
    
    return stock


@router.get("/stock/summary")
async def get_stock_summary(current_user: dict = Depends(get_current_user)):
    """ملخص المخزون"""
    # إجمالي المنتجات
    total_products = await db.warehouse_products.count_documents({})
    
    # إجمالي المخازن
    total_warehouses = await db.warehouses.count_documents({})
    
    # المنتجات منخفضة المخزون
    products = await db.warehouse_products.find({}, {"_id": 0, "id": 1, "min_quantity": 1}).to_list(500)
    min_qty_map = {p["id"]: p.get("min_quantity", 0) for p in products}
    
    stock = await db.product_stock.find({}, {"_id": 0}).to_list(1000)
    low_stock_count = sum(1 for s in stock if s["quantity"] <= min_qty_map.get(s["product_id"], 0))
    
    # إجمالي قيمة المخزون
    total_value = sum(s.get("quantity", 0) * s.get("unit_price", 0) for s in stock if s.get("unit_price"))
    
    # المنتجات منتهية الصلاحية
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    expired_count = await db.product_stock.count_documents({
        "expiry_date": {"$lt": today, "$ne": None}
    })
    
    # حركات اليوم
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    today_movements = await db.stock_movements.count_documents({
        "movement_date": {"$gte": today_start}
    })
    
    return {
        "total_products": total_products,
        "total_warehouses": total_warehouses,
        "low_stock_count": low_stock_count,
        "total_value": round(total_value, 2),
        "expired_count": expired_count,
        "today_movements": today_movements
    }


@router.post("/stock/adjust")
async def adjust_stock(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """تعديل مخزون (جرد)"""
    product_id = data.get("product_id")
    warehouse_id = data.get("warehouse_id")
    new_quantity = data.get("new_quantity")
    reason = data.get("reason", "تعديل جرد")
    
    # البحث عن المخزون الحالي
    stock = await db.product_stock.find_one({
        "product_id": product_id,
        "warehouse_id": warehouse_id
    }, {"_id": 0})
    
    if not stock:
        raise HTTPException(status_code=404, detail="المخزون غير موجود")
    
    old_quantity = stock.get("quantity", 0)
    difference = new_quantity - old_quantity
    
    # تحديث المخزون
    await db.product_stock.update_one(
        {"id": stock["id"]},
        {"$set": {
            "quantity": new_quantity,
            "available_quantity": new_quantity - stock.get("reserved_quantity", 0),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # إنشاء حركة تعديل
    movement = StockMovement(
        movement_type="adjust",
        movement_number=f"ADJ-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        product_id=product_id,
        product_name=stock.get("product_name", ""),
        product_code=stock.get("product_code", ""),
        quantity=abs(difference),
        from_warehouse_id=warehouse_id if difference < 0 else None,
        from_warehouse_name=stock.get("warehouse_name") if difference < 0 else None,
        to_warehouse_id=warehouse_id if difference > 0 else None,
        to_warehouse_name=stock.get("warehouse_name") if difference > 0 else None,
        notes=f"{reason} - الكمية القديمة: {old_quantity}, الكمية الجديدة: {new_quantity}",
        created_by=current_user["id"],
        created_by_name=current_user.get("full_name", "")
    )
    
    await db.stock_movements.insert_one(movement.model_dump())
    
    return {"message": "تم تعديل المخزون بنجاح", "old_quantity": old_quantity, "new_quantity": new_quantity}


# ==================== حركات المخزون ====================

@router.get("/movements")
async def get_movements(
    movement_type: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    product_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على حركات المخزون"""
    query = {}
    if movement_type:
        query["movement_type"] = movement_type
    if warehouse_id:
        query["$or"] = [
            {"from_warehouse_id": warehouse_id},
            {"to_warehouse_id": warehouse_id}
        ]
    if product_id:
        query["product_id"] = product_id
    if start_date:
        query.setdefault("movement_date", {})["$gte"] = start_date
    if end_date:
        query.setdefault("movement_date", {})["$lte"] = end_date + "T23:59:59"
    
    movements = await db.stock_movements.find(query, {"_id": 0}).sort("movement_date", -1).to_list(limit)
    return movements


@router.post("/movements/receive")
async def receive_stock(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """استلام بضاعة"""
    product_id = data.get("product_id")
    warehouse_id = data.get("warehouse_id")
    quantity = data.get("quantity")
    unit_price = data.get("unit_price", 0)
    supplier_id = data.get("supplier_id")
    supplier_name = data.get("supplier_name")
    batch_number = data.get("batch_number")
    expiry_date = data.get("expiry_date")
    reference_number = data.get("reference_number")
    notes = data.get("notes")
    
    # الحصول على بيانات المنتج والمخزن
    product = await db.warehouse_products.find_one({"id": product_id}, {"_id": 0})
    warehouse = await db.warehouses.find_one({"id": warehouse_id}, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    if not warehouse:
        raise HTTPException(status_code=404, detail="المخزن غير موجود")
    
    # تحديث أو إنشاء سجل المخزون
    stock = await db.product_stock.find_one({
        "product_id": product_id,
        "warehouse_id": warehouse_id
    }, {"_id": 0})
    
    if stock:
        new_quantity = stock.get("quantity", 0) + quantity
        await db.product_stock.update_one(
            {"id": stock["id"]},
            {"$set": {
                "quantity": new_quantity,
                "available_quantity": new_quantity - stock.get("reserved_quantity", 0),
                "batch_number": batch_number or stock.get("batch_number"),
                "expiry_date": expiry_date or stock.get("expiry_date"),
                "last_updated": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        new_stock = ProductStock(
            product_id=product_id,
            product_name=product.get("name", ""),
            product_code=product.get("code", ""),
            warehouse_id=warehouse_id,
            warehouse_name=warehouse.get("name", ""),
            quantity=quantity,
            available_quantity=quantity,
            batch_number=batch_number,
            expiry_date=expiry_date
        )
        await db.product_stock.insert_one(new_stock.model_dump())
    
    # إنشاء حركة استلام
    movement = StockMovement(
        movement_type="receive",
        movement_number=f"RCV-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        product_id=product_id,
        product_name=product.get("name", ""),
        product_code=product.get("code", ""),
        quantity=quantity,
        unit_price=unit_price,
        total_value=quantity * unit_price,
        to_warehouse_id=warehouse_id,
        to_warehouse_name=warehouse.get("name", ""),
        reference_type="purchase",
        reference_number=reference_number,
        batch_number=batch_number,
        expiry_date=expiry_date,
        supplier_id=supplier_id,
        supplier_name=supplier_name,
        notes=notes,
        created_by=current_user["id"],
        created_by_name=current_user.get("full_name", "")
    )
    
    await db.stock_movements.insert_one(movement.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user.get("full_name", ""),
        action="receive_stock",
        entity_type="stock",
        entity_id=product_id,
        entity_name=product.get("name", ""),
        details=f"استلام {quantity} {product.get('unit', 'قطعة')} من {product.get('name', '')} في مخزن {warehouse.get('name', '')}"
    )
    
    return {"message": "تم استلام البضاعة بنجاح", "movement": movement.model_dump()}


@router.post("/movements/issue")
async def issue_stock(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """صرف بضاعة"""
    product_id = data.get("product_id")
    warehouse_id = data.get("warehouse_id")
    quantity = data.get("quantity")
    unit_price = data.get("unit_price", 0)
    customer_id = data.get("customer_id")
    customer_name = data.get("customer_name")
    reference_number = data.get("reference_number")
    notes = data.get("notes")
    
    # الحصول على المخزون الحالي
    stock = await db.product_stock.find_one({
        "product_id": product_id,
        "warehouse_id": warehouse_id
    }, {"_id": 0})
    
    if not stock:
        raise HTTPException(status_code=404, detail="المخزون غير موجود")
    
    if stock.get("available_quantity", 0) < quantity:
        raise HTTPException(status_code=400, detail="الكمية المطلوبة غير متوفرة")
    
    # تحديث المخزون
    new_quantity = stock.get("quantity", 0) - quantity
    await db.product_stock.update_one(
        {"id": stock["id"]},
        {"$set": {
            "quantity": new_quantity,
            "available_quantity": new_quantity - stock.get("reserved_quantity", 0),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    warehouse = await db.warehouses.find_one({"id": warehouse_id}, {"_id": 0})
    
    # إنشاء حركة صرف
    movement = StockMovement(
        movement_type="issue",
        movement_number=f"ISS-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        product_id=product_id,
        product_name=stock.get("product_name", ""),
        product_code=stock.get("product_code", ""),
        quantity=quantity,
        unit_price=unit_price,
        total_value=quantity * unit_price,
        from_warehouse_id=warehouse_id,
        from_warehouse_name=warehouse.get("name", "") if warehouse else "",
        reference_type="sales",
        reference_number=reference_number,
        customer_id=customer_id,
        customer_name=customer_name,
        notes=notes,
        created_by=current_user["id"],
        created_by_name=current_user.get("full_name", "")
    )
    
    await db.stock_movements.insert_one(movement.model_dump())
    
    return {"message": "تم صرف البضاعة بنجاح", "movement": movement.model_dump()}


@router.post("/movements/transfer")
async def transfer_stock(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """تحويل بضاعة بين المخازن"""
    product_id = data.get("product_id")
    from_warehouse_id = data.get("from_warehouse_id")
    to_warehouse_id = data.get("to_warehouse_id")
    quantity = data.get("quantity")
    notes = data.get("notes")
    
    if from_warehouse_id == to_warehouse_id:
        raise HTTPException(status_code=400, detail="لا يمكن التحويل لنفس المخزن")
    
    # الحصول على المخزون المصدر
    from_stock = await db.product_stock.find_one({
        "product_id": product_id,
        "warehouse_id": from_warehouse_id
    }, {"_id": 0})
    
    if not from_stock:
        raise HTTPException(status_code=404, detail="المخزون المصدر غير موجود")
    
    if from_stock.get("available_quantity", 0) < quantity:
        raise HTTPException(status_code=400, detail="الكمية المطلوبة غير متوفرة")
    
    # الحصول على بيانات المخازن
    from_warehouse = await db.warehouses.find_one({"id": from_warehouse_id}, {"_id": 0})
    to_warehouse = await db.warehouses.find_one({"id": to_warehouse_id}, {"_id": 0})
    product = await db.warehouse_products.find_one({"id": product_id}, {"_id": 0})
    
    # تحديث المخزون المصدر (نقص)
    new_from_qty = from_stock.get("quantity", 0) - quantity
    await db.product_stock.update_one(
        {"id": from_stock["id"]},
        {"$set": {
            "quantity": new_from_qty,
            "available_quantity": new_from_qty - from_stock.get("reserved_quantity", 0),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # تحديث أو إنشاء المخزون الوجهة
    to_stock = await db.product_stock.find_one({
        "product_id": product_id,
        "warehouse_id": to_warehouse_id
    }, {"_id": 0})
    
    if to_stock:
        new_to_qty = to_stock.get("quantity", 0) + quantity
        await db.product_stock.update_one(
            {"id": to_stock["id"]},
            {"$set": {
                "quantity": new_to_qty,
                "available_quantity": new_to_qty - to_stock.get("reserved_quantity", 0),
                "last_updated": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        new_stock = ProductStock(
            product_id=product_id,
            product_name=from_stock.get("product_name", ""),
            product_code=from_stock.get("product_code", ""),
            warehouse_id=to_warehouse_id,
            warehouse_name=to_warehouse.get("name", "") if to_warehouse else "",
            quantity=quantity,
            available_quantity=quantity,
            batch_number=from_stock.get("batch_number"),
            expiry_date=from_stock.get("expiry_date")
        )
        await db.product_stock.insert_one(new_stock.model_dump())
    
    # إنشاء حركة تحويل
    movement = StockMovement(
        movement_type="transfer",
        movement_number=f"TRF-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        product_id=product_id,
        product_name=from_stock.get("product_name", ""),
        product_code=from_stock.get("product_code", ""),
        quantity=quantity,
        from_warehouse_id=from_warehouse_id,
        from_warehouse_name=from_warehouse.get("name", "") if from_warehouse else "",
        to_warehouse_id=to_warehouse_id,
        to_warehouse_name=to_warehouse.get("name", "") if to_warehouse else "",
        reference_type="transfer",
        notes=notes,
        created_by=current_user["id"],
        created_by_name=current_user.get("full_name", "")
    )
    
    await db.stock_movements.insert_one(movement.model_dump())
    
    return {"message": "تم التحويل بنجاح", "movement": movement.model_dump()}


# ==================== المحاليل والفحوصات ====================

@router.get("/solutions")
async def get_solutions(
    solution_type: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    low_stock: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على قائمة المحاليل"""
    query = {}
    if solution_type:
        query["solution_type"] = solution_type
    if warehouse_id:
        query["warehouse_id"] = warehouse_id
    
    solutions = await db.lab_solutions.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    
    if low_stock:
        solutions = [s for s in solutions if s.get("current_quantity", 0) <= s.get("min_quantity", 0)]
    
    return solutions


@router.post("/solutions")
async def create_solution(
    data: LabSolutionBase,
    current_user: dict = Depends(get_current_user)
):
    """إنشاء محلول جديد"""
    existing = await db.lab_solutions.find_one({"code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="رمز المحلول موجود مسبقاً")
    
    solution = LabSolution(**data.model_dump())
    await db.lab_solutions.insert_one(solution.model_dump())
    return solution.model_dump()


@router.put("/solutions/{solution_id}")
async def update_solution(
    solution_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """تحديث محلول"""
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.lab_solutions.update_one(
        {"id": solution_id},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="المحلول غير موجود")
    
    solution = await db.lab_solutions.find_one({"id": solution_id}, {"_id": 0})
    return solution


@router.delete("/solutions/{solution_id}")
async def delete_solution(
    solution_id: str,
    current_user: dict = Depends(get_current_user)
):
    """حذف محلول"""
    await db.lab_solutions.delete_one({"id": solution_id})
    return {"message": "تم حذف المحلول بنجاح"}


# ==================== استهلاك المحاليل ====================

@router.get("/solutions/consumption")
async def get_solution_consumption(
    solution_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على سجلات استهلاك المحاليل"""
    query = {}
    if solution_id:
        query["solution_id"] = solution_id
    if start_date:
        query.setdefault("consumption_date", {})["$gte"] = start_date
    if end_date:
        query.setdefault("consumption_date", {})["$lte"] = end_date
    
    consumption = await db.solution_consumption.find(query, {"_id": 0}).sort("consumption_date", -1).to_list(500)
    return consumption


@router.post("/solutions/consumption")
async def record_consumption(
    data: SolutionConsumptionBase,
    current_user: dict = Depends(get_current_user)
):
    """تسجيل استهلاك محلول"""
    # التحقق من وجود المحلول
    solution = await db.lab_solutions.find_one({"id": data.solution_id}, {"_id": 0})
    if not solution:
        raise HTTPException(status_code=404, detail="المحلول غير موجود")
    
    # التحقق من توفر الكمية
    if solution.get("current_quantity", 0) < data.quantity_consumed:
        raise HTTPException(status_code=400, detail="الكمية المطلوبة غير متوفرة")
    
    # تحديث كمية المحلول
    new_quantity = solution.get("current_quantity", 0) - data.quantity_consumed
    await db.lab_solutions.update_one(
        {"id": data.solution_id},
        {"$set": {
            "current_quantity": new_quantity,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # إنشاء سجل الاستهلاك
    consumption = SolutionConsumption(
        **data.model_dump(),
        created_by=current_user["id"],
        created_by_name=current_user.get("full_name", "")
    )
    await db.solution_consumption.insert_one(consumption.model_dump())
    
    return consumption.model_dump()


@router.get("/solutions/consumption/daily-summary")
async def get_daily_consumption_summary(
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """ملخص الاستهلاك اليومي للمحاليل"""
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    consumption = await db.solution_consumption.find(
        {"consumption_date": date},
        {"_id": 0}
    ).to_list(500)
    
    # تجميع حسب المحلول
    summary = {}
    for c in consumption:
        sol_id = c.get("solution_id")
        if sol_id not in summary:
            summary[sol_id] = {
                "solution_id": sol_id,
                "solution_name": c.get("solution_name"),
                "solution_code": c.get("solution_code"),
                "total_consumed": 0,
                "total_tests": 0,
                "records": []
            }
        summary[sol_id]["total_consumed"] += c.get("quantity_consumed", 0)
        summary[sol_id]["total_tests"] += c.get("test_count", 0)
        summary[sol_id]["records"].append(c)
    
    return {
        "date": date,
        "solutions": list(summary.values()),
        "total_consumption_records": len(consumption)
    }


# ==================== التقارير والتصدير ====================

@router.get("/reports/stock-value")
async def get_stock_value_report(
    warehouse_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """تقرير قيمة المخزون"""
    query = {}
    if warehouse_id:
        query["warehouse_id"] = warehouse_id
    
    stock = await db.product_stock.find(query, {"_id": 0}).to_list(1000)
    products = await db.warehouse_products.find({}, {"_id": 0}).to_list(500)
    
    product_prices = {p["id"]: p.get("cost_price", 0) for p in products}
    
    report = []
    total_value = 0
    
    for s in stock:
        unit_price = product_prices.get(s["product_id"], 0)
        value = s.get("quantity", 0) * unit_price
        total_value += value
        
        report.append({
            "product_id": s.get("product_id"),
            "product_name": s.get("product_name"),
            "product_code": s.get("product_code"),
            "warehouse_name": s.get("warehouse_name"),
            "quantity": s.get("quantity", 0),
            "unit_price": unit_price,
            "total_value": round(value, 2)
        })
    
    return {
        "report": report,
        "total_value": round(total_value, 2),
        "total_items": len(report)
    }


@router.get("/reports/movements-summary")
async def get_movements_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """ملخص حركات المخزون"""
    if not start_date:
        start_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    if not end_date:
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = {
        "movement_date": {"$gte": start_date, "$lte": end_date + "T23:59:59"}
    }
    
    movements = await db.stock_movements.find(query, {"_id": 0}).to_list(5000)
    
    summary = {
        "receive": {"count": 0, "quantity": 0, "value": 0},
        "issue": {"count": 0, "quantity": 0, "value": 0},
        "transfer": {"count": 0, "quantity": 0, "value": 0},
        "adjust": {"count": 0, "quantity": 0, "value": 0},
        "return": {"count": 0, "quantity": 0, "value": 0}
    }
    
    for m in movements:
        mt = m.get("movement_type", "")
        if mt in summary:
            summary[mt]["count"] += 1
            summary[mt]["quantity"] += m.get("quantity", 0)
            summary[mt]["value"] += m.get("total_value", 0)
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "summary": summary,
        "total_movements": len(movements)
    }


@router.get("/export/stock/excel")
async def export_stock_excel(
    warehouse_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """تصدير المخزون إلى Excel"""
    query = {}
    if warehouse_id:
        query["warehouse_id"] = warehouse_id
    
    stock = await db.product_stock.find(query, {"_id": 0}).sort("product_name", 1).to_list(1000)
    products = await db.warehouse_products.find({}, {"_id": 0}).to_list(500)
    product_prices = {p["id"]: p.get("cost_price", 0) for p in products}
    
    # إنشاء DataFrame
    data = []
    for s in stock:
        unit_price = product_prices.get(s["product_id"], 0)
        data.append({
            "رمز المنتج": s.get("product_code", ""),
            "اسم المنتج": s.get("product_name", ""),
            "المخزن": s.get("warehouse_name", ""),
            "الكمية": s.get("quantity", 0),
            "الكمية المتاحة": s.get("available_quantity", 0),
            "الكمية المحجوزة": s.get("reserved_quantity", 0),
            "رقم الدفعة": s.get("batch_number", ""),
            "تاريخ الصلاحية": s.get("expiry_date", ""),
            "سعر الوحدة": unit_price,
            "القيمة الإجمالية": round(s.get("quantity", 0) * unit_price, 2)
        })
    
    df = pd.DataFrame(data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='المخزون', index=False)
        
        workbook = writer.book
        worksheet = writer.sheets['المخزون']
        
        # تنسيق العناوين
        header_fill = PatternFill(start_color='2E7D32', end_color='2E7D32', fill_type='solid')
        header_font = Font(bold=True, color='FFFFFF')
        
        for cell in worksheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
        
        # تعديل عرض الأعمدة
        for column in worksheet.columns:
            max_length = max(len(str(cell.value or "")) for cell in column)
            worksheet.column_dimensions[column[0].column_letter].width = min(max_length + 2, 50)
    
    output.seek(0)
    
    filename = f"stock_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/movements/excel")
async def export_movements_excel(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    movement_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """تصدير حركات المخزون إلى Excel"""
    if not start_date:
        start_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    if not end_date:
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = {
        "movement_date": {"$gte": start_date, "$lte": end_date + "T23:59:59"}
    }
    if movement_type:
        query["movement_type"] = movement_type
    
    movements = await db.stock_movements.find(query, {"_id": 0}).sort("movement_date", -1).to_list(5000)
    
    # ترجمة أنواع الحركات
    movement_types = {
        "receive": "استلام",
        "issue": "صرف",
        "transfer": "تحويل",
        "adjust": "تعديل",
        "return": "إرجاع"
    }
    
    data = []
    for m in movements:
        data.append({
            "رقم الحركة": m.get("movement_number", ""),
            "التاريخ": m.get("movement_date", "")[:10] if m.get("movement_date") else "",
            "نوع الحركة": movement_types.get(m.get("movement_type", ""), m.get("movement_type", "")),
            "رمز المنتج": m.get("product_code", ""),
            "اسم المنتج": m.get("product_name", ""),
            "الكمية": m.get("quantity", 0),
            "سعر الوحدة": m.get("unit_price", 0),
            "القيمة": m.get("total_value", 0),
            "من مخزن": m.get("from_warehouse_name", ""),
            "إلى مخزن": m.get("to_warehouse_name", ""),
            "المورد": m.get("supplier_name", ""),
            "العميل": m.get("customer_name", ""),
            "ملاحظات": m.get("notes", ""),
            "المسؤول": m.get("created_by_name", "")
        })
    
    df = pd.DataFrame(data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='حركات المخزون', index=False)
        
        workbook = writer.book
        worksheet = writer.sheets['حركات المخزون']
        
        header_fill = PatternFill(start_color='1565C0', end_color='1565C0', fill_type='solid')
        header_font = Font(bold=True, color='FFFFFF')
        
        for cell in worksheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
        
        for column in worksheet.columns:
            max_length = max(len(str(cell.value or "")) for cell in column)
            worksheet.column_dimensions[column[0].column_letter].width = min(max_length + 2, 50)
    
    output.seek(0)
    
    filename = f"movements_report_{start_date}_to_{end_date}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/solutions/excel")
async def export_solutions_excel(
    current_user: dict = Depends(get_current_user)
):
    """تصدير المحاليل إلى Excel"""
    solutions = await db.lab_solutions.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    
    solution_types = {
        "reagent": "كاشف",
        "buffer": "محلول منظم",
        "standard": "محلول قياسي",
        "cleaning": "محلول تنظيف"
    }
    
    data = []
    for s in solutions:
        data.append({
            "رمز المحلول": s.get("code", ""),
            "اسم المحلول": s.get("name", ""),
            "النوع": solution_types.get(s.get("solution_type", ""), s.get("solution_type", "")),
            "الوحدة": s.get("unit", ""),
            "الكمية الحالية": s.get("current_quantity", 0),
            "الحد الأدنى": s.get("min_quantity", 0),
            "المخزن": s.get("warehouse_name", ""),
            "تاريخ الصلاحية": s.get("expiry_date", ""),
            "رقم الدفعة": s.get("batch_number", ""),
            "المورد": s.get("supplier_name", ""),
            "التكلفة/وحدة": s.get("cost_per_unit", 0),
            "الحالة": "نشط" if s.get("status") == "active" else "غير نشط"
        })
    
    df = pd.DataFrame(data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='المحاليل', index=False)
        
        workbook = writer.book
        worksheet = writer.sheets['المحاليل']
        
        header_fill = PatternFill(start_color='6A1B9A', end_color='6A1B9A', fill_type='solid')
        header_font = Font(bold=True, color='FFFFFF')
        
        for cell in worksheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
        
        for column in worksheet.columns:
            max_length = max(len(str(cell.value or "")) for cell in column)
            worksheet.column_dimensions[column[0].column_letter].width = min(max_length + 2, 50)
    
    output.seek(0)
    
    filename = f"solutions_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
