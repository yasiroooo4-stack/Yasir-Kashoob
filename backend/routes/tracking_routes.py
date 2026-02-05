"""
Employee Tracking Routes - مسارات تتبع الموظفين
نظام GPS لتتبع مواقع الموظفين في الوقت الفعلي
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from math import radians, cos, sin, asin, sqrt
import uuid
import os
import base64

router = APIRouter(prefix="/api/tracking", tags=["Employee Tracking"])

# Database reference (will be set from main server)
db = None

# Directory for verification photos
VERIFICATION_PHOTOS_DIR = "/app/backend/uploads/verification_photos"
os.makedirs(VERIFICATION_PHOTOS_DIR, exist_ok=True)

def set_database(database):
    global db
    db = database


def haversine(lon1, lat1, lon2, lat2):
    """
    Calculate the great circle distance in meters between two points 
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    # Radius of earth in meters
    r = 6371000
    return c * r


async def get_tracking_settings():
    """Get tracking settings from database"""
    settings = await db.tracking_settings.find_one({})
    if not settings:
        # Default settings
        default_settings = {
            "id": str(uuid.uuid4()),
            "enabled": True,
            "update_interval_seconds": 60,
            "work_radius_meters": 500,
            "alert_on_exit": True,
            "work_locations": [],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.tracking_settings.insert_one(default_settings)
        return default_settings
    return settings


async def check_within_work_range(lat: float, lng: float, settings: dict) -> tuple:
    """
    Check if location is within work range
    Returns: (is_within_range, distance_from_nearest, nearest_location_name)
    """
    work_locations = settings.get("work_locations", [])
    default_radius = settings.get("work_radius_meters", 500)
    
    if not work_locations:
        return True, 0, None
    
    min_distance = float('inf')
    nearest_location = None
    is_within = False
    
    for loc in work_locations:
        loc_lat = loc.get("lat") or loc.get("latitude")
        loc_lng = loc.get("lng") or loc.get("longitude")
        if loc_lat and loc_lng:
            distance = haversine(lng, lat, loc_lng, loc_lat)
            radius = loc.get("radius", default_radius)
            
            if distance < min_distance:
                min_distance = distance
                nearest_location = loc.get("name", "مقر العمل")
            
            if distance <= radius:
                is_within = True
    
    return is_within, min_distance, nearest_location


# ==================== LOCATION UPDATES ====================

@router.post("/location")
async def update_employee_location(location_data: dict):
    """
    تحديث موقع الموظف - يستدعيها هاتف الموظف
    """
    employee_id = location_data.get("employee_id")
    latitude = location_data.get("latitude")
    longitude = location_data.get("longitude")
    accuracy = location_data.get("accuracy")
    
    if not employee_id or latitude is None or longitude is None:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Get employee info
    employee = await db.hr_employees.find_one({"id": employee_id})
    if not employee:
        # Try by employee_code
        employee = await db.hr_employees.find_one({"employee_code": employee_id})
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get settings and check work range
    settings = await get_tracking_settings()
    is_within, distance, location_name = await check_within_work_range(latitude, longitude, settings)
    
    # Create location record
    location_record = {
        "id": str(uuid.uuid4()),
        "employee_id": employee.get("id"),
        "employee_name": employee.get("name", ""),
        "employee_code": employee.get("employee_code", ""),
        "phone": employee.get("phone", ""),
        "latitude": latitude,
        "longitude": longitude,
        "accuracy": accuracy,
        "distance_from_work": round(distance, 2) if distance else 0,
        "is_within_range": is_within,
        "work_location_name": location_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Save to history
    await db.employee_locations.insert_one(location_record)
    
    # Update current location (upsert)
    await db.employee_current_locations.update_one(
        {"employee_id": employee.get("id")},
        {"$set": location_record},
        upsert=True
    )
    
    # Check if exited work range and create alert
    if settings.get("alert_on_exit") and not is_within:
        # Check if already has unread exit alert
        existing_alert = await db.tracking_alerts.find_one({
            "employee_id": employee.get("id"),
            "alert_type": "exit_range",
            "is_dismissed": False,
            "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}
        })
        
        if not existing_alert:
            alert = {
                "id": str(uuid.uuid4()),
                "employee_id": employee.get("id"),
                "employee_name": employee.get("name", ""),
                "employee_code": employee.get("employee_code", ""),
                "alert_type": "exit_range",
                "message": f"الموظف {employee.get('name')} خرج من نطاق العمل. المسافة: {round(distance)} متر",
                "latitude": latitude,
                "longitude": longitude,
                "distance_from_work": round(distance, 2),
                "is_read": False,
                "is_dismissed": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.tracking_alerts.insert_one(alert)
    
    return {
        "success": True,
        "is_within_range": is_within,
        "distance_from_work": round(distance, 2) if distance else 0,
        "work_location": location_name
    }


@router.get("/employees")
async def get_tracked_employees():
    """
    جلب مواقع جميع الموظفين المتصلين - للمدير
    """
    # Get current locations (last 5 minutes)
    five_minutes_ago = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    
    locations = await db.employee_current_locations.find({
        "created_at": {"$gte": five_minutes_ago}
    }).to_list(1000)
    
    # Remove MongoDB _id
    for loc in locations:
        loc.pop("_id", None)
    
    return locations


@router.get("/employees/all")
async def get_all_employees_with_phones():
    """
    جلب جميع الموظفين مع أرقام هواتفهم - للمدير
    """
    employees = await db.hr_employees.find(
        {"status": {"$ne": "terminated"}},
        {"_id": 0, "id": 1, "name": 1, "employee_code": 1, "phone": 1, "department": 1, "position": 1}
    ).to_list(1000)
    
    # Get current locations
    current_locations = {
        loc["employee_id"]: loc 
        async for loc in db.employee_current_locations.find({})
    }
    
    for emp in employees:
        loc = current_locations.get(emp.get("id"))
        if loc:
            emp["last_location"] = {
                "latitude": loc.get("latitude"),
                "longitude": loc.get("longitude"),
                "distance_from_work": loc.get("distance_from_work"),
                "is_within_range": loc.get("is_within_range"),
                "last_updated": loc.get("created_at")
            }
        else:
            emp["last_location"] = None
    
    return employees


@router.get("/history/{employee_id}")
async def get_employee_location_history(
    employee_id: str,
    date: Optional[str] = None,
    limit: int = 100
):
    """
    جلب سجل تحركات موظف معين
    """
    query = {"employee_id": employee_id}
    
    if date:
        # Filter by date
        start = f"{date}T00:00:00"
        end = f"{date}T23:59:59"
        query["created_at"] = {"$gte": start, "$lte": end}
    
    locations = await db.employee_locations.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return locations


# ==================== SETTINGS ====================

@router.get("/settings")
async def get_settings():
    """جلب إعدادات التتبع"""
    settings = await get_tracking_settings()
    settings.pop("_id", None)
    return settings


@router.put("/settings")
async def update_settings(settings_data: dict, user_id: str = None):
    """تحديث إعدادات التتبع"""
    current = await get_tracking_settings()
    
    update_data = {
        "enabled": settings_data.get("enabled", current.get("enabled", True)),
        "update_interval_seconds": settings_data.get("update_interval_seconds", current.get("update_interval_seconds", 60)),
        "work_radius_meters": settings_data.get("work_radius_meters", current.get("work_radius_meters", 500)),
        "alert_on_exit": settings_data.get("alert_on_exit", current.get("alert_on_exit", True)),
        "work_locations": settings_data.get("work_locations", current.get("work_locations", [])),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user_id
    }
    
    await db.tracking_settings.update_one(
        {"id": current.get("id")},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "تم تحديث الإعدادات بنجاح"}


@router.post("/settings/work-location")
async def add_work_location(location_data: dict):
    """إضافة موقع عمل جديد"""
    settings = await get_tracking_settings()
    work_locations = settings.get("work_locations", [])
    
    new_location = {
        "id": str(uuid.uuid4()),
        "name": location_data.get("name", "موقع العمل"),
        "lat": location_data.get("lat") or location_data.get("latitude"),
        "lng": location_data.get("lng") or location_data.get("longitude"),
        "radius": location_data.get("radius", settings.get("work_radius_meters", 500)),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    work_locations.append(new_location)
    
    await db.tracking_settings.update_one(
        {"id": settings.get("id")},
        {"$set": {"work_locations": work_locations, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "location": new_location}


@router.delete("/settings/work-location/{location_id}")
async def delete_work_location(location_id: str):
    """حذف موقع عمل"""
    settings = await get_tracking_settings()
    work_locations = [loc for loc in settings.get("work_locations", []) if loc.get("id") != location_id]
    
    await db.tracking_settings.update_one(
        {"id": settings.get("id")},
        {"$set": {"work_locations": work_locations, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "تم حذف الموقع بنجاح"}


# ==================== ALERTS ====================

@router.get("/alerts")
async def get_alerts(unread_only: bool = False, limit: int = 50):
    """جلب التنبيهات"""
    query = {"is_dismissed": False}
    if unread_only:
        query["is_read"] = False
    
    alerts = await db.tracking_alerts.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return alerts


@router.get("/alerts/count")
async def get_unread_alerts_count():
    """عدد التنبيهات غير المقروءة"""
    count = await db.tracking_alerts.count_documents({
        "is_read": False,
        "is_dismissed": False
    })
    return {"count": count}


@router.put("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: str):
    """تحديد التنبيه كمقروء"""
    await db.tracking_alerts.update_one(
        {"id": alert_id},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}


@router.put("/alerts/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str):
    """تجاهل التنبيه"""
    await db.tracking_alerts.update_one(
        {"id": alert_id},
        {"$set": {"is_dismissed": True, "dismissed_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}


@router.delete("/alerts/clear")
async def clear_all_alerts():
    """حذف جميع التنبيهات المقروءة"""
    await db.tracking_alerts.delete_many({"is_read": True})
    return {"success": True, "message": "تم حذف التنبيهات المقروءة"}


# ==================== PHOTO VERIFICATION ====================

@router.post("/verify-photo")
async def upload_verification_photo(
    photo: UploadFile = File(...),
    employee_id: str = Form(...),
    timestamp: str = Form(None)
):
    """
    رفع صورة التحقق من الموظف
    """
    try:
        # Get employee info
        employee = await db.hr_employees.find_one({"id": employee_id})
        if not employee:
            employee = await db.hr_employees.find_one({"employee_code": employee_id})
        
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Create filename
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"{employee.get('employee_code', employee_id)}_{date_str}.jpg"
        filepath = os.path.join(VERIFICATION_PHOTOS_DIR, filename)
        
        # Save photo
        contents = await photo.read()
        with open(filepath, "wb") as f:
            f.write(contents)
        
        # Save verification record
        verification_record = {
            "id": str(uuid.uuid4()),
            "employee_id": employee.get("id"),
            "employee_name": employee.get("name"),
            "employee_code": employee.get("employee_code"),
            "photo_filename": filename,
            "photo_path": filepath,
            "timestamp": timestamp or datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.tracking_verifications.insert_one(verification_record)
        
        return {
            "success": True,
            "message": "تم حفظ صورة التحقق بنجاح",
            "filename": filename
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save photo: {str(e)}")


@router.get("/verifications/{employee_id}")
async def get_employee_verifications(employee_id: str, limit: int = 10):
    """
    جلب سجل صور التحقق لموظف
    """
    verifications = await db.tracking_verifications.find(
        {"employee_id": employee_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return verifications


# ==================== REQUEST LOCATION ====================

@router.post("/request-location/{employee_id}")
async def request_employee_location(employee_id: str):
    """
    طلب موقع موظف - يرسل إشعار للموظف
    في المستقبل يمكن ربطه بـ SMS أو Push Notification
    """
    employee = await db.hr_employees.find_one({"id": employee_id})
    if not employee:
        employee = await db.hr_employees.find_one({"employee_code": employee_id})
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Create location request record
    request_record = {
        "id": str(uuid.uuid4()),
        "employee_id": employee.get("id"),
        "employee_name": employee.get("name"),
        "employee_phone": employee.get("phone"),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.location_requests.insert_one(request_record)
    
    # Generate tracking link for employee
    tracking_link = f"/employee-tracking?id={employee.get('id')}"
    
    return {
        "success": True,
        "message": f"تم إرسال طلب الموقع إلى {employee.get('name')}",
        "phone": employee.get("phone"),
        "tracking_link": tracking_link
    }


# ==================== REPORTS ====================

@router.get("/reports/attendance-by-location")
async def get_attendance_by_location_report(date: Optional[str] = None):
    """
    تقرير الحضور بالموقع
    """
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    start = f"{date}T00:00:00"
    end = f"{date}T23:59:59"
    
    # Get all location records for the date
    locations = await db.employee_locations.find({
        "created_at": {"$gte": start, "$lte": end}
    }).to_list(10000)
    
    # Group by employee
    employee_data = {}
    for loc in locations:
        emp_id = loc.get("employee_id")
        if emp_id not in employee_data:
            employee_data[emp_id] = {
                "employee_id": emp_id,
                "employee_name": loc.get("employee_name"),
                "employee_code": loc.get("employee_code"),
                "total_updates": 0,
                "within_range_count": 0,
                "outside_range_count": 0,
                "first_location_time": loc.get("created_at"),
                "last_location_time": loc.get("created_at"),
                "max_distance": 0
            }
        
        data = employee_data[emp_id]
        data["total_updates"] += 1
        
        if loc.get("is_within_range"):
            data["within_range_count"] += 1
        else:
            data["outside_range_count"] += 1
        
        distance = loc.get("distance_from_work", 0)
        if distance > data["max_distance"]:
            data["max_distance"] = distance
        
        if loc.get("created_at") > data["last_location_time"]:
            data["last_location_time"] = loc.get("created_at")
    
    return {
        "date": date,
        "employees": list(employee_data.values()),
        "total_employees_tracked": len(employee_data)
    }
