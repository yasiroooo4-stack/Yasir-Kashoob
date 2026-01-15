"""
Driver Schedule Routes - مسارات جدول السائقين الشهري
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from database import db
from models.all_models import DriverSchedule, DriverScheduleBase
from routes.base import get_current_user, require_role, log_activity
import uuid

router = APIRouter(prefix="/driver-schedule", tags=["Driver Schedule"])

# مراكز التجميع
COLLECTION_CENTERS = ["زيك", "حجيف", "غدو", "طاقة", "ثمريت", "مرباط"]


@router.get("/centers")
async def get_collection_centers(current_user: dict = Depends(get_current_user)):
    """الحصول على قائمة مراكز التجميع"""
    return COLLECTION_CENTERS


@router.get("/drivers")
async def get_drivers(current_user: dict = Depends(get_current_user)):
    """الحصول على قائمة السائقين من الموظفين"""
    # البحث عن الموظفين بوظيفة سائق
    drivers = await db.hr_employees.find({
        "$or": [
            {"job_title": {"$regex": "سائق", "$options": "i"}},
            {"job_title": {"$regex": "driver", "$options": "i"}},
            {"department": {"$regex": "النقل", "$options": "i"}},
            {"department": {"$regex": "transport", "$options": "i"}},
        ],
        "status": "active"
    }, {"_id": 0, "id": 1, "name": 1, "job_title": 1, "phone": 1}).to_list(100)
    
    return drivers


@router.get("/trucks")
async def get_trucks(current_user: dict = Depends(get_current_user)):
    """الحصول على قائمة الشاحنات"""
    # البحث عن الشاحنات من جدول المركبات
    trucks = await db.vehicles.find({
        "vehicle_type": {"$in": ["truck", "tanker", "شاحنة", "صهريج"]},
        "status": "active"
    }, {"_id": 0}).to_list(50)
    
    # إذا لم توجد شاحنات مسجلة، إرجاع قائمة افتراضية
    if not trucks:
        return [
            {"id": "truck-1", "plate_number": "1234 أ ب", "type": "صهريج"},
            {"id": "truck-2", "plate_number": "5678 ج د", "type": "صهريج"},
            {"id": "truck-3", "plate_number": "9012 هـ و", "type": "شاحنة"},
        ]
    
    return trucks


@router.get("/customers")
async def get_customer_companies(current_user: dict = Depends(get_current_user)):
    """الحصول على قائمة شركات العملاء"""
    customers = await db.customers.find(
        {"is_active": True},
        {"_id": 0, "id": 1, "name": 1, "company_name": 1, "address": 1}
    ).to_list(100)
    
    return customers


@router.get("/schedules")
async def get_driver_schedules(
    month: Optional[str] = None,  # YYYY-MM
    driver_id: Optional[str] = None,
    status: Optional[str] = None,
    center: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    الحصول على جدول السائقين
    month: الشهر بصيغة YYYY-MM (إذا لم يحدد، الشهر الحالي)
    """
    if not month:
        month = datetime.now().strftime("%Y-%m")
    
    query = {
        "schedule_date": {"$regex": f"^{month}"}
    }
    
    if driver_id:
        query["driver_id"] = driver_id
    if status:
        query["status"] = status
    if center:
        query["collection_centers"] = center
    
    schedules = await db.driver_schedules.find(query, {"_id": 0}).sort("schedule_date", 1).to_list(1000)
    
    return schedules


@router.get("/schedules/by-date/{date}")
async def get_schedules_by_date(
    date: str,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على جدول يوم محدد"""
    schedules = await db.driver_schedules.find(
        {"schedule_date": date},
        {"_id": 0}
    ).sort("start_time", 1).to_list(100)
    
    return schedules


@router.get("/schedules/calendar")
async def get_schedules_calendar(
    month: str,  # YYYY-MM
    current_user: dict = Depends(get_current_user)
):
    """
    الحصول على جدول الشهر بتنسيق التقويم
    يُرجع مصفوفة تحتوي على كل يوم ورحلاته
    """
    schedules = await db.driver_schedules.find(
        {"schedule_date": {"$regex": f"^{month}"}},
        {"_id": 0}
    ).to_list(1000)
    
    # تجميع حسب اليوم
    calendar = {}
    for sch in schedules:
        date = sch["schedule_date"]
        if date not in calendar:
            calendar[date] = []
        calendar[date].append(sch)
    
    return calendar


@router.post("/schedules")
async def create_driver_schedule(
    data: DriverScheduleBase,
    current_user: dict = Depends(get_current_user)
):
    """إنشاء جدولة جديدة لسائق"""
    schedule = DriverSchedule(
        **data.model_dump(),
        created_by=current_user["id"],
        created_by_name=current_user.get("full_name", "")
    )
    
    await db.driver_schedules.insert_one(schedule.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user.get("full_name", ""),
        action="create_driver_schedule",
        entity_type="driver_schedule",
        entity_id=schedule.id,
        entity_name=f"{data.driver_name} - {data.schedule_date}",
        details=f"جدولة سائق: {data.driver_name} للتاريخ {data.schedule_date}"
    )
    
    return schedule.model_dump()


@router.post("/schedules/bulk")
async def create_bulk_schedules(
    schedules: List[DriverScheduleBase],
    current_user: dict = Depends(get_current_user)
):
    """إنشاء جدولات متعددة دفعة واحدة"""
    created = []
    for data in schedules:
        schedule = DriverSchedule(
            **data.model_dump(),
            created_by=current_user["id"],
            created_by_name=current_user.get("full_name", "")
        )
        await db.driver_schedules.insert_one(schedule.model_dump())
        created.append(schedule.model_dump())
    
    return {"message": f"تم إنشاء {len(created)} جدولة بنجاح", "schedules": created}


@router.put("/schedules/{schedule_id}")
async def update_driver_schedule(
    schedule_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """تحديث جدولة سائق"""
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    data["updated_by"] = current_user["id"]
    data["updated_by_name"] = current_user.get("full_name", "")
    
    result = await db.driver_schedules.update_one(
        {"id": schedule_id},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="الجدولة غير موجودة")
    
    schedule = await db.driver_schedules.find_one({"id": schedule_id}, {"_id": 0})
    return schedule


@router.post("/schedules/{schedule_id}/reassign")
async def reassign_driver_schedule(
    schedule_id: str,
    new_driver_id: str,
    new_driver_name: str,
    reason: str,
    current_user: dict = Depends(get_current_user)
):
    """
    إعادة تعيين الجدولة لسائق آخر (في حالة الغياب)
    """
    # الحصول على الجدولة الحالية
    schedule = await db.driver_schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="الجدولة غير موجودة")
    
    # تحديث الجدولة
    update_data = {
        "original_driver_id": schedule["driver_id"],
        "original_driver_name": schedule["driver_name"],
        "driver_id": new_driver_id,
        "driver_name": new_driver_name,
        "reassignment_reason": reason,
        "status": "reassigned",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user["id"],
        "updated_by_name": current_user.get("full_name", "")
    }
    
    await db.driver_schedules.update_one(
        {"id": schedule_id},
        {"$set": update_data}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user.get("full_name", ""),
        action="reassign_driver_schedule",
        entity_type="driver_schedule",
        entity_id=schedule_id,
        entity_name=f"{schedule['driver_name']} -> {new_driver_name}",
        details=f"إعادة تعيين من {schedule['driver_name']} إلى {new_driver_name} - السبب: {reason}"
    )
    
    updated = await db.driver_schedules.find_one({"id": schedule_id}, {"_id": 0})
    return updated


@router.delete("/schedules/{schedule_id}")
async def delete_driver_schedule(
    schedule_id: str,
    current_user: dict = Depends(get_current_user)
):
    """حذف جدولة"""
    result = await db.driver_schedules.delete_one({"id": schedule_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الجدولة غير موجودة")
    
    return {"message": "تم حذف الجدولة بنجاح"}


@router.get("/schedules/summary/{month}")
async def get_monthly_summary(
    month: str,  # YYYY-MM
    current_user: dict = Depends(get_current_user)
):
    """
    ملخص الشهر
    عدد الرحلات لكل سائق، إجمالي الكميات، إلخ
    """
    schedules = await db.driver_schedules.find(
        {"schedule_date": {"$regex": f"^{month}"}},
        {"_id": 0}
    ).to_list(1000)
    
    # تجميع حسب السائق
    driver_summary = {}
    center_summary = {}
    customer_summary = {}
    
    total_trips = len(schedules)
    total_expected = 0
    total_actual = 0
    completed_trips = 0
    reassigned_trips = 0
    
    for sch in schedules:
        driver_id = sch.get("driver_id")
        driver_name = sch.get("driver_name")
        
        if driver_id not in driver_summary:
            driver_summary[driver_id] = {
                "driver_id": driver_id,
                "driver_name": driver_name,
                "trips_count": 0,
                "expected_quantity": 0,
                "actual_quantity": 0,
                "completed": 0,
                "reassigned_to": 0,
                "reassigned_from": 0
            }
        
        driver_summary[driver_id]["trips_count"] += 1
        driver_summary[driver_id]["expected_quantity"] += sch.get("expected_quantity", 0)
        driver_summary[driver_id]["actual_quantity"] += sch.get("actual_quantity", 0) or 0
        
        if sch.get("status") == "completed":
            driver_summary[driver_id]["completed"] += 1
            completed_trips += 1
        
        if sch.get("original_driver_id"):
            reassigned_trips += 1
            driver_summary[driver_id]["reassigned_to"] += 1
            # تحديث السائق الأصلي
            orig_id = sch.get("original_driver_id")
            if orig_id in driver_summary:
                driver_summary[orig_id]["reassigned_from"] += 1
        
        # مراكز التجميع
        for center in sch.get("collection_centers", []):
            if center not in center_summary:
                center_summary[center] = {"trips": 0, "quantity": 0}
            center_summary[center]["trips"] += 1
            center_summary[center]["quantity"] += sch.get("expected_quantity", 0)
        
        # العملاء
        customer = sch.get("customer_company", "")
        if customer:
            if customer not in customer_summary:
                customer_summary[customer] = {"trips": 0, "quantity": 0}
            customer_summary[customer]["trips"] += 1
            customer_summary[customer]["quantity"] += sch.get("expected_quantity", 0)
        
        total_expected += sch.get("expected_quantity", 0)
        total_actual += sch.get("actual_quantity", 0) or 0
    
    return {
        "month": month,
        "total_trips": total_trips,
        "completed_trips": completed_trips,
        "reassigned_trips": reassigned_trips,
        "total_expected_quantity": total_expected,
        "total_actual_quantity": total_actual,
        "drivers": list(driver_summary.values()),
        "centers": center_summary,
        "customers": customer_summary
    }


@router.post("/schedules/copy-week")
async def copy_week_schedule(
    source_week_start: str,  # YYYY-MM-DD (يوم الأحد)
    target_week_start: str,  # YYYY-MM-DD
    current_user: dict = Depends(get_current_user)
):
    """
    نسخ جدول أسبوع كامل لأسبوع آخر
    مفيد لتكرار الجداول الأسبوعية
    """
    # حساب نهاية الأسبوع المصدر
    source_start = datetime.strptime(source_week_start, "%Y-%m-%d")
    source_end = source_start + timedelta(days=6)
    
    # جلب جدول الأسبوع المصدر
    schedules = await db.driver_schedules.find({
        "schedule_date": {
            "$gte": source_week_start,
            "$lte": source_end.strftime("%Y-%m-%d")
        }
    }, {"_id": 0}).to_list(500)
    
    if not schedules:
        raise HTTPException(status_code=404, detail="لا يوجد جدول في الأسبوع المحدد")
    
    # حساب الفرق بين الأسبوعين
    target_start = datetime.strptime(target_week_start, "%Y-%m-%d")
    days_diff = (target_start - source_start).days
    
    # نسخ الجداول مع تعديل التاريخ
    created = []
    for sch in schedules:
        old_date = datetime.strptime(sch["schedule_date"], "%Y-%m-%d")
        new_date = old_date + timedelta(days=days_diff)
        
        new_schedule = DriverSchedule(
            driver_id=sch["driver_id"],
            driver_name=sch["driver_name"],
            schedule_date=new_date.strftime("%Y-%m-%d"),
            start_time=sch.get("start_time"),
            end_time=sch.get("end_time"),
            collection_centers=sch.get("collection_centers", []),
            customer_company=sch.get("customer_company", ""),
            customer_id=sch.get("customer_id"),
            truck_number=sch.get("truck_number", ""),
            truck_id=sch.get("truck_id"),
            expected_quantity=sch.get("expected_quantity", 0),
            status="scheduled",
            notes=sch.get("notes"),
            created_by=current_user["id"],
            created_by_name=current_user.get("full_name", "")
        )
        
        await db.driver_schedules.insert_one(new_schedule.model_dump())
        created.append(new_schedule.model_dump())
    
    return {
        "message": f"تم نسخ {len(created)} جدولة من أسبوع {source_week_start} إلى {target_week_start}",
        "created_count": len(created)
    }
