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


# ==================== EMPLOYEE LOGIN & GPS ATTENDANCE ====================

@router.post("/employee-login")
async def employee_login_for_tracking(data: dict):
    """
    تسجيل دخول الموظف للتتبع باستخدام رقم الهاتف أو الرقم الوظيفي
    """
    phone = data.get("phone")
    employee_code = data.get("employee_code")
    
    if not phone and not employee_code:
        raise HTTPException(status_code=400, detail="يرجى إدخال رقم الهاتف أو الرقم الوظيفي")
    
    # Find employee
    query = {}
    if phone:
        # Try multiple phone field variations
        query = {"$or": [
            {"phone": phone},
            {"mobile": phone},
            {"phone_number": phone},
            {"contact_phone": phone}
        ]}
    elif employee_code:
        query = {"$or": [
            {"employee_code": employee_code},
            {"code": employee_code},
            {"emp_code": employee_code}
        ]}
    
    employee = await db.hr_employees.find_one(query, {"_id": 0})
    
    if not employee:
        raise HTTPException(status_code=404, detail="لم يتم العثور على الموظف")
    
    # Get today's attendance
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_attendance = await db.hr_attendance.find_one({
        "employee_id": employee.get("id"),
        "date": today
    }, {"_id": 0})
    
    return {
        "employee": {
            "id": employee.get("id"),
            "name": employee.get("name"),
            "employee_code": employee.get("employee_code"),
            "department": employee.get("department"),
            "position": employee.get("position"),
            "phone": employee.get("phone"),
            "photo_url": employee.get("photo_url"),
            "work_location": employee.get("work_location")
        },
        "today_attendance": today_attendance
    }


@router.post("/gps-attendance")
async def record_gps_attendance(data: dict):
    """
    تسجيل الحضور/الانصراف تلقائياً بناءً على GPS
    يُستدعى عند دخول/خروج الموظف من نطاق العمل
    """
    employee_id = data.get("employee_id")
    action = data.get("action")  # "check_in" or "check_out"
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    date = data.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    selfie_photo = data.get("selfie_photo")  # Base64 encoded selfie
    mock_gps_info = data.get("mock_gps_info")  # Mock GPS detection info
    wifi_ssid = data.get("wifi_ssid")  # WiFi SSID for WiFi-based attendance
    attendance_method = data.get("attendance_method", "gps")  # "gps" or "wifi"
    
    if not employee_id or not action:
        raise HTTPException(status_code=400, detail="بيانات ناقصة")
    
    # Check for mock GPS
    if mock_gps_info and mock_gps_info.get("is_mock"):
        # Log the mock GPS attempt
        await db.gps_security_logs.insert_one({
            "id": str(uuid.uuid4()),
            "employee_id": employee_id,
            "date": date,
            "type": "mock_gps_detected",
            "details": mock_gps_info,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        raise HTTPException(status_code=403, detail="تم رصد موقع وهمي (Mock GPS). لا يمكن تسجيل الحضور. يرجى إيقاف تطبيقات تزوير الموقع.")
    
    # Get employee
    employee = await db.hr_employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    
    # Save selfie photo if provided
    selfie_url = None
    if selfie_photo:
        try:
            photo_filename = f"{employee_id}_{date}_{action}_{uuid.uuid4().hex[:8]}.jpg"
            photo_path = os.path.join(VERIFICATION_PHOTOS_DIR, photo_filename)
            
            # Remove base64 header if present
            if "," in selfie_photo:
                selfie_photo = selfie_photo.split(",")[1]
            
            photo_bytes = base64.b64decode(selfie_photo)
            with open(photo_path, "wb") as f:
                f.write(photo_bytes)
            selfie_url = f"/api/tracking/verification-photo/{photo_filename}"
        except Exception as e:
            print(f"Error saving selfie: {e}")
    
    # Get or create today's attendance record
    attendance = await db.hr_attendance.find_one({
        "employee_id": employee_id,
        "date": date
    })
    
    now = datetime.now(timezone.utc).isoformat()
    
    if action == "check_in":
        if attendance and attendance.get("check_in"):
            # Already has check-in - check if it was GPS or fingerprint
            if attendance.get("check_in_method") == "gps":
                # Already checked in via GPS
                return {"success": False, "message": "تم تسجيل الحضور عبر GPS مسبقاً", "check_in_time": attendance.get("check_in")}
            
            # Has fingerprint check-in - add GPS data alongside it
            gps_update = {
                "gps_check_in": now,
                "check_in_method": attendance_method,
                "check_in_location_lat": latitude,
                "check_in_location_lng": longitude,
                "gps_approval_status": "pending",
                "gps_approval_requested_at": now,
                "has_gps_tracking": True,
                "updated_at": now
            }
            if selfie_url:
                gps_update["check_in_selfie_url"] = selfie_url
            if wifi_ssid:
                gps_update["check_in_wifi_ssid"] = wifi_ssid
            if mock_gps_info:
                gps_update["mock_gps_check"] = mock_gps_info
                
            await db.hr_attendance.update_one(
                {"employee_id": employee_id, "date": date},
                {"$set": gps_update}
            )
            return {
                "success": True, 
                "message": "تم إضافة تتبع GPS على سجل البصمة - بانتظار موافقة المسؤول", 
                "check_in_time": now,
                "requires_approval": True
            }
        
        gps_data = {
            "check_in": now,
            "check_in_method": attendance_method,
            "check_in_location_lat": latitude,
            "check_in_location_lng": longitude,
            "gps_approval_status": "pending",
            "gps_approval_requested_at": now,
            "updated_at": now
        }
        if selfie_url:
            gps_data["check_in_selfie_url"] = selfie_url
        if wifi_ssid:
            gps_data["check_in_wifi_ssid"] = wifi_ssid
        if mock_gps_info:
            gps_data["mock_gps_check"] = mock_gps_info
            
        if attendance:
            # Update existing record (no check_in yet)
            await db.hr_attendance.update_one(
                {"employee_id": employee_id, "date": date},
                {"$set": gps_data}
            )
        else:
            # Create new attendance record - GPS attendance requires approval
            attendance_record = {
                "id": str(uuid.uuid4()),
                "employee_id": employee_id,
                "employee_name": employee.get("name"),
                "employee_code": employee.get("employee_code"),
                "date": date,
                "check_in": now,
                "check_out": None,
                "check_in_method": attendance_method,
                "check_out_method": None,
                "check_in_location_lat": latitude,
                "check_in_location_lng": longitude,
                "gps_approval_status": "pending",
                "gps_approval_requested_at": now,
                "status": "pending_gps_approval",
                "created_at": now,
                "updated_at": now
            }
            if selfie_url:
                attendance_record["check_in_selfie_url"] = selfie_url
            if wifi_ssid:
                attendance_record["check_in_wifi_ssid"] = wifi_ssid
            if mock_gps_info:
                attendance_record["mock_gps_check"] = mock_gps_info
            await db.hr_attendance.insert_one(attendance_record)
        
        return {
            "success": True, 
            "message": "تم تسجيل الحضور - بانتظار موافقة المسؤول", 
            "check_in_time": now,
            "requires_approval": True
        }
    
    elif action == "check_out":
        if not attendance or (not attendance.get("check_in") and not attendance.get("gps_check_in")):
            raise HTTPException(status_code=400, detail="لم يتم تسجيل الحضور بعد")
        
        if attendance.get("check_out_method") == "gps":
            return {"success": False, "message": "تم تسجيل الانصراف عبر GPS مسبقاً", "check_out_time": attendance.get("check_out") or attendance.get("gps_check_out")}
        
        # Calculate working hours from the earliest check-in
        check_in_str = attendance.get("gps_check_in") or attendance.get("check_in")
        try:
            if "T" in check_in_str:
                check_in_time = datetime.fromisoformat(check_in_str.replace('Z', '+00:00'))
            else:
                # Simple time format like "07:53" - combine with date
                today_str = attendance.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
                check_in_time = datetime.fromisoformat(f"{today_str}T{check_in_str}:00+00:00")
        except:
            check_in_time = datetime.now(timezone.utc)
        
        check_out_time = datetime.now(timezone.utc)
        working_hours = (check_out_time - check_in_time).total_seconds() / 3600
        
        update_data = {
            "check_out_method": "gps",
            "check_out_location_lat": latitude,
            "check_out_location_lng": longitude,
            "gps_checkout_approval_status": "pending",
            "updated_at": now
        }
        
        # If already has a fingerprint check_out, store GPS separately
        if attendance.get("check_out") and attendance.get("check_out_method") != "gps":
            update_data["gps_check_out"] = now
            update_data["gps_working_hours"] = round(working_hours, 2)
        else:
            update_data["check_out"] = now
            update_data["working_hours"] = round(working_hours, 2)
        
        await db.hr_attendance.update_one(
            {"employee_id": employee_id, "date": date},
            {"$set": update_data}
        )
        
        return {
            "success": True, 
            "message": "تم تسجيل الانصراف - بانتظار موافقة المسؤول", 
            "check_out_time": now, 
            "working_hours": round(working_hours, 2),
            "requires_approval": True
        }
    
    else:
        raise HTTPException(status_code=400, detail="الإجراء غير صحيح")


@router.get("/gps-attendance/pending")
async def get_pending_gps_attendance():
    """
    جلب طلبات الحضور GPS المعلقة التي تحتاج موافقة
    """
    pending = await db.hr_attendance.find({
        "$or": [
            {"gps_approval_status": "pending"},
            {"gps_checkout_approval_status": "pending"}
        ]
    }, {"_id": 0}).sort("date", -1).to_list(100)
    
    return pending


@router.post("/gps-attendance/approve")
async def approve_gps_attendance(data: dict):
    """
    موافقة على طلب حضور GPS
    """
    attendance_id = data.get("attendance_id")
    approval_type = data.get("type")  # "check_in" or "check_out"
    approved = data.get("approved", True)
    approved_by = data.get("approved_by")
    rejection_reason = data.get("rejection_reason")
    
    if not attendance_id or not approval_type:
        raise HTTPException(status_code=400, detail="بيانات ناقصة")
    
    now = datetime.now(timezone.utc).isoformat()
    
    if approval_type == "check_in":
        update_data = {
            "gps_approval_status": "approved" if approved else "rejected",
            "gps_approved_by": approved_by,
            "gps_approved_at": now,
            "status": "present" if approved else "gps_rejected",
            "updated_at": now
        }
        if not approved:
            update_data["gps_rejection_reason"] = rejection_reason
    else:  # check_out
        update_data = {
            "gps_checkout_approval_status": "approved" if approved else "rejected",
            "gps_checkout_approved_by": approved_by,
            "gps_checkout_approved_at": now,
            "updated_at": now
        }
        if not approved:
            update_data["gps_checkout_rejection_reason"] = rejection_reason
    
    result = await db.hr_attendance.update_one(
        {"id": attendance_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="سجل الحضور غير موجود")
    
    return {
        "success": True,
        "message": "تمت الموافقة بنجاح" if approved else "تم الرفض"
    }


@router.get("/verification-photo/{filename}")
async def get_verification_photo(filename: str):
    """خدمة صور التحقق (السيلفي)"""
    from fastapi.responses import FileResponse
    photo_path = os.path.join(VERIFICATION_PHOTOS_DIR, filename)
    if not os.path.exists(photo_path):
        raise HTTPException(status_code=404, detail="الصورة غير موجودة")
    return FileResponse(photo_path, media_type="image/jpeg")


@router.get("/wifi-settings")
async def get_wifi_settings():
    """جلب إعدادات شبكات WiFi المعتمدة"""
    settings = await db.tracking_wifi_settings.find_one({}, {"_id": 0})
    if not settings:
        default = {
            "id": str(uuid.uuid4()),
            "enabled": True,
            "networks": [],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.tracking_wifi_settings.insert_one(default)
        return default
    return settings


@router.post("/wifi-settings")
async def update_wifi_settings(data: dict):
    """تحديث إعدادات شبكات WiFi"""
    networks = data.get("networks", [])
    enabled = data.get("enabled", True)
    
    now = datetime.now(timezone.utc).isoformat()
    await db.tracking_wifi_settings.update_one(
        {},
        {"$set": {
            "enabled": enabled,
            "networks": networks,
            "updated_at": now
        }},
        upsert=True
    )
    return {"success": True, "message": "تم تحديث إعدادات WiFi"}


@router.get("/security-logs")
async def get_security_logs():
    """جلب سجلات الأمان (محاولات التلاعب)"""
    logs = await db.gps_security_logs.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return logs


# ==================== LOCATION UPDATES ====================

async def record_location_attendance(employee: dict, is_within: bool, timestamp: str):
    """
    تسجيل دخول/خروج الموظف من موقع العمل في سجل الحضور
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    employee_id = employee.get("id")
    
    # Get or create today's location attendance record
    location_attendance = await db.location_attendance.find_one({
        "employee_id": employee_id,
        "date": today
    })
    
    if not location_attendance:
        # Create new record
        location_attendance = {
            "id": str(uuid.uuid4()),
            "employee_id": employee_id,
            "employee_name": employee.get("name"),
            "employee_code": employee.get("employee_code"),
            "date": today,
            "location_check_in": None,  # وقت دخول الموقع
            "location_check_out": None,  # وقت خروج الموقع
            "total_time_at_location": 0,  # إجمالي وقت التواجد بالثواني
            "current_session_start": None,  # بداية الجلسة الحالية
            "is_currently_at_location": False,
            "sessions": [],  # قائمة بجلسات الدخول والخروج
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.location_attendance.insert_one(location_attendance)
    
    # Get current state
    was_at_location = location_attendance.get("is_currently_at_location", False)
    
    if is_within and not was_at_location:
        # Employee entered work location
        update_data = {
            "is_currently_at_location": True,
            "current_session_start": timestamp,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Set first check-in if not set
        if not location_attendance.get("location_check_in"):
            update_data["location_check_in"] = timestamp
        
        await db.location_attendance.update_one(
            {"id": location_attendance.get("id")},
            {"$set": update_data}
        )
        
        return {"event": "check_in", "time": timestamp}
    
    elif not is_within and was_at_location:
        # Employee left work location
        session_start = location_attendance.get("current_session_start")
        session_duration = 0
        
        if session_start:
            try:
                start_time = datetime.fromisoformat(session_start.replace("Z", "+00:00"))
                end_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                session_duration = int((end_time - start_time).total_seconds())
            except:
                pass
        
        # Add session to history
        new_session = {
            "check_in": session_start,
            "check_out": timestamp,
            "duration_seconds": session_duration
        }
        
        # Calculate new total time
        new_total_time = location_attendance.get("total_time_at_location", 0) + session_duration
        
        await db.location_attendance.update_one(
            {"id": location_attendance.get("id")},
            {
                "$set": {
                    "is_currently_at_location": False,
                    "current_session_start": None,
                    "location_check_out": timestamp,
                    "total_time_at_location": new_total_time,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {"sessions": new_session}
            }
        )
        
        return {"event": "check_out", "time": timestamp, "session_duration": session_duration}
    
    return {"event": "none", "is_at_location": is_within}


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
    
    timestamp = datetime.now(timezone.utc).isoformat()
    
    # Record location-based attendance
    attendance_event = await record_location_attendance(employee, is_within, timestamp)
    
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
        "attendance_event": attendance_event.get("event"),
        "created_at": timestamp
    }
    
    # Save to history
    await db.employee_locations.insert_one(location_record)
    
    # Update current location (upsert) - exclude _id and id to avoid immutable field error
    current_location_data = {k: v for k, v in location_record.items() if k not in ["_id", "id"]}
    await db.employee_current_locations.update_one(
        {"employee_id": employee.get("id")},
        {"$set": current_location_data},
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
                "created_at": timestamp
            }
            await db.tracking_alerts.insert_one(alert)
    
    return {
        "success": True,
        "is_within_range": is_within,
        "distance_from_work": round(distance, 2) if distance else 0,
        "work_location": location_name
    }


@router.get("/employees")
async def get_tracked_employees(include_attendance: bool = False, date: Optional[str] = None):
    """
    جلب مواقع جميع الموظفين المتصلين - للمدير
    include_attendance: إذا كان True، يتم تضمين الموظفين الحاضرين في البصمة أيضاً
    """
    # Get current locations (last 5 minutes)
    five_minutes_ago = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    
    locations = await db.employee_current_locations.find({
        "created_at": {"$gte": five_minutes_ago}
    }).to_list(1000)
    
    # Remove MongoDB _id
    for loc in locations:
        loc.pop("_id", None)
        
        # Get employee photo
        employee = await db.hr_employees.find_one(
            {"id": loc.get("employee_id")},
            {"_id": 0, "photo_url": 1, "signature_url": 1, "civil_id": 1, "national_id": 1}
        )
        if employee:
            loc["photo_url"] = employee.get("photo_url")
            loc["civil_id"] = employee.get("civil_id") or employee.get("national_id")
        
        loc["source"] = "gps"  # مصدر الموقع: GPS
    
    # If include_attendance is True, also include employees who checked in today via fingerprint
    if include_attendance:
        today = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        # Get employees who have attendance today
        attendance_records = await db.hr_attendance.find({
            "date": today,
            "check_in": {"$ne": None}
        }).to_list(1000)
        
        # Get the IDs of employees already in GPS locations
        gps_employee_ids = {loc.get("employee_id") for loc in locations}
        
        for att in attendance_records:
            employee_id = att.get("employee_id")
            
            # Skip if already in GPS list
            if employee_id in gps_employee_ids:
                continue
            
            # Get employee details with work location
            employee = await db.hr_employees.find_one(
                {"id": employee_id},
                {"_id": 0, "id": 1, "name": 1, "employee_code": 1, "photo_url": 1, 
                 "civil_id": 1, "national_id": 1, "work_location_lat": 1, "work_location_lng": 1,
                 "department": 1, "position": 1}
            )
            
            if employee:
                # Try to get location from work_location or tracking settings
                lat = employee.get("work_location_lat")
                lng = employee.get("work_location_lng")
                
                # If no employee-specific location, try to get from work locations
                if not lat or not lng:
                    settings = await get_tracking_settings()
                    work_locations = settings.get("work_locations", [])
                    if work_locations:
                        # Use first work location as default
                        default_loc = work_locations[0]
                        lat = default_loc.get("lat") or default_loc.get("latitude")
                        lng = default_loc.get("lng") or default_loc.get("longitude")
                
                if lat and lng:
                    locations.append({
                        "employee_id": employee_id,
                        "employee_name": employee.get("name"),
                        "employee_code": employee.get("employee_code"),
                        "latitude": lat,
                        "longitude": lng,
                        "is_within_range": True,
                        "distance_from_work": 0,
                        "created_at": att.get("check_in"),
                        "photo_url": employee.get("photo_url"),
                        "civil_id": employee.get("civil_id") or employee.get("national_id"),
                        "source": "attendance",  # مصدر الموقع: البصمة
                        "check_in_time": att.get("check_in"),
                        "attendance_status": "present"
                    })
    
    return locations


@router.get("/employees/attendance-based")
async def get_attendance_based_employees(date: Optional[str] = None):
    """
    جلب الموظفين الحاضرين في نظام البصمة مع مواقعهم
    يعرض الموظفين الذين سجلوا حضورهم اليوم في نظام البصمة
    الموقع يعتمد على موقع جهاز البصمة + حالة GPS
    """
    today = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get employees who have attendance today
    attendance_records = await db.hr_attendance.find({
        "date": today,
        "check_in": {"$ne": None}
    }).to_list(1000)
    
    # Get tracking settings for work locations
    settings = await get_tracking_settings()
    work_locations = settings.get("work_locations", [])
    
    # Get fingerprint devices with their locations
    fingerprint_devices = await db.fingerprint_devices.find({}).to_list(100)
    device_locations = {}
    for device in fingerprint_devices:
        device_ip = device.get("ip") or device.get("ip_address")
        if device_ip:
            device_locations[device_ip] = {
                "name": device.get("name"),
                "location": device.get("location"),
                "id": device.get("id")
            }
    
    # Helper function to normalize Arabic text for comparison
    def normalize_arabic(text):
        if not text:
            return ""
        text = text.replace("إ", "ا").replace("أ", "ا").replace("آ", "ا").replace("ء", "")
        return text.strip().lower()
    
    # Create a mapping of normalized names to work locations
    work_location_map = {}
    for wl in work_locations:
        normalized_name = normalize_arabic(wl.get("name", ""))
        work_location_map[normalized_name] = wl
    
    # Get current GPS locations (last 10 minutes for more coverage)
    ten_minutes_ago = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    gps_locations = await db.employee_current_locations.find({
        "created_at": {"$gte": ten_minutes_ago}
    }).to_list(1000)
    
    # Create GPS location map by employee_id
    gps_map = {}
    for loc in gps_locations:
        gps_map[loc.get("employee_id")] = loc
    
    employees_on_map = []
    
    for att in attendance_records:
        employee_id = att.get("employee_id")
        device_ip = att.get("device_ip")
        check_in_location = att.get("check_in_location")
        
        # Get employee details
        employee = await db.hr_employees.find_one(
            {"id": employee_id},
            {"_id": 0, "id": 1, "name": 1, "employee_code": 1, "photo_url": 1, 
             "civil_id": 1, "national_id": 1, "work_location_lat": 1, "work_location_lng": 1,
             "department": 1, "position": 1, "work_location": 1, "phone": 1}
        )
        
        if not employee:
            continue
        
        # Determine location - Priority:
        # 1. GPS location (if available)
        # 2. Fingerprint device location
        # 3. Employee's assigned work_location
        
        lat = None
        lng = None
        location_name = "غير محدد"
        location_source = "unknown"
        is_within_geofence = None
        gps_status = "no_gps"  # no_gps, inside, outside
        
        # Check if employee has GPS location
        gps_data = gps_map.get(employee_id)
        if gps_data:
            lat = gps_data.get("latitude")
            lng = gps_data.get("longitude")
            location_source = "gps"
            is_within_geofence = gps_data.get("is_within_range", False)
            gps_status = "inside" if is_within_geofence else "outside"
            location_name = "GPS تتبع"
        
        # If no GPS, use fingerprint device location
        if not lat or not lng:
            # Try to get location from fingerprint device
            if device_ip and device_ip in device_locations:
                device_info = device_locations[device_ip]
                device_location_name = device_info.get("location")
                normalized_device_loc = normalize_arabic(device_location_name)
                
                if normalized_device_loc in work_location_map:
                    wl = work_location_map[normalized_device_loc]
                    lat = wl.get("lat") or wl.get("latitude")
                    lng = wl.get("lng") or wl.get("longitude")
                    location_name = wl.get("name")
                    location_source = "fingerprint_device"
                    gps_status = "no_gps"
            
            # Try check_in_location from attendance record
            elif check_in_location:
                normalized_loc = normalize_arabic(check_in_location)
                if normalized_loc in work_location_map:
                    wl = work_location_map[normalized_loc]
                    lat = wl.get("lat") or wl.get("latitude")
                    lng = wl.get("lng") or wl.get("longitude")
                    location_name = wl.get("name")
                    location_source = "attendance_location"
                    gps_status = "no_gps"
        
        # Fallback to employee's assigned work_location
        if not lat or not lng:
            emp_location = normalize_arabic(employee.get("work_location", ""))
            if emp_location in work_location_map:
                wl = work_location_map[emp_location]
                lat = wl.get("lat") or wl.get("latitude")
                lng = wl.get("lng") or wl.get("longitude")
                location_name = wl.get("name")
                location_source = "employee_assigned"
                gps_status = "no_gps"
        
        # Last fallback - use first work location
        if (not lat or not lng) and work_locations:
            wl = work_locations[0]
            lat = wl.get("lat") or wl.get("latitude")
            lng = wl.get("lng") or wl.get("longitude")
            location_name = wl.get("name", "مقر العمل")
            location_source = "default"
            gps_status = "no_gps"
        
        if lat and lng:
            # Add small offset if multiple employees at same location
            import math
            offset_index = len([e for e in employees_on_map if e.get("work_location_name") == location_name])
            if offset_index > 0 and gps_status == "no_gps":
                grid_cols = 5
                row = offset_index // grid_cols
                col = offset_index % grid_cols
                lat_offset = row * 0.0008
                lng_offset = (col - 2) * 0.0008
                lat = float(lat) + lat_offset
                lng = float(lng) + lng_offset
            
            # Determine marker color based on status
            # Green: inside geofence OR checked in (no checkout)
            # Red: outside geofence OR checked out
            # Gray: no GPS, just fingerprint location
            has_checked_out = att.get("check_out") is not None
            
            if gps_status == "outside":
                marker_color = "red"
                status_text = "خارج النطاق"
            elif gps_status == "inside":
                marker_color = "green"
                status_text = "داخل النطاق"
            elif has_checked_out:
                marker_color = "red"
                status_text = "انصرف"
            else:
                marker_color = "blue"  # Present via fingerprint, no GPS
                status_text = "حاضر (بصمة)"
            
            employees_on_map.append({
                "employee_id": employee_id,
                "employee_name": employee.get("name"),
                "employee_code": employee.get("employee_code"),
                "latitude": float(lat),
                "longitude": float(lng),
                "is_within_range": gps_status == "inside" or (gps_status == "no_gps" and not has_checked_out),
                "distance_from_work": gps_data.get("distance_from_work", 0) if gps_data else 0,
                "created_at": att.get("check_in"),
                "photo_url": employee.get("photo_url"),
                "civil_id": employee.get("civil_id") or employee.get("national_id"),
                "department": employee.get("department"),
                "position": employee.get("position"),
                "phone": employee.get("phone"),
                "source": "attendance",
                "location_source": location_source,
                "check_in_time": att.get("check_in"),
                "check_out_time": att.get("check_out"),
                "attendance_status": "checked_out" if has_checked_out else "present",
                "work_location_name": location_name,
                "gps_status": gps_status,
                "marker_color": marker_color,
                "status_text": status_text,
                "device_ip": device_ip
            })
    
    return employees_on_map


@router.get("/employees/all")
async def get_all_employees_with_phones():
    """
    جلب جميع الموظفين مع أرقام هواتفهم - للمدير
    """
    employees = await db.hr_employees.find(
        {"status": {"$ne": "terminated"}},
        {"_id": 0, "id": 1, "name": 1, "employee_code": 1, "phone": 1, "department": 1, "position": 1, "photo_url": 1, "civil_id": 1, "national_id": 1}
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
        
        # Add civil_id field
        emp["civil_id"] = emp.get("civil_id") or emp.get("national_id")
    
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
        "wifi_ssid": location_data.get("wifi_ssid", ""),
        "wifi_password": location_data.get("wifi_password", ""),
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


@router.put("/settings/work-location/{location_id}/wifi")
async def update_location_wifi(location_id: str, data: dict):
    """تحديث إعدادات WiFi لموقع عمل"""
    settings = await get_tracking_settings()
    work_locations = settings.get("work_locations", [])
    
    updated = False
    for loc in work_locations:
        if loc.get("id") == location_id:
            loc["wifi_ssid"] = data.get("wifi_ssid", "")
            loc["wifi_password"] = data.get("wifi_password", "")
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail="الموقع غير موجود")
    
    await db.tracking_settings.update_one(
        {"id": settings.get("id")},
        {"$set": {"work_locations": work_locations, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "تم تحديث إعدادات WiFi"}


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


# ==================== LOCATION ATTENDANCE ====================

@router.get("/location-attendance")
async def get_location_attendance(date: Optional[str] = None, employee_id: Optional[str] = None):
    """
    جلب سجل حضور الموقع
    """
    query = {}
    
    if date:
        query["date"] = date
    else:
        query["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    if employee_id:
        query["employee_id"] = employee_id
    
    records = await db.location_attendance.find(
        query,
        {"_id": 0}
    ).sort("employee_name", 1).to_list(1000)
    
    # Format durations
    for record in records:
        total_seconds = record.get("total_time_at_location", 0)
        
        # If currently at location, add current session time
        if record.get("is_currently_at_location") and record.get("current_session_start"):
            try:
                start = datetime.fromisoformat(record["current_session_start"].replace("Z", "+00:00"))
                now = datetime.now(timezone.utc)
                total_seconds += int((now - start).total_seconds())
            except:
                pass
        
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        record["total_time_formatted"] = f"{hours}:{minutes:02d}"
        record["total_time_hours"] = round(total_seconds / 3600, 2)
    
    return records


@router.get("/location-attendance/summary")
async def get_location_attendance_summary(
    start_date: str,
    end_date: str,
    employee_id: Optional[str] = None
):
    """
    ملخص حضور الموقع لفترة
    """
    query = {
        "date": {"$gte": start_date, "$lte": end_date}
    }
    
    if employee_id:
        query["employee_id"] = employee_id
    
    records = await db.location_attendance.find(
        query,
        {"_id": 0}
    ).to_list(10000)
    
    # Group by employee
    employee_summary = {}
    
    for record in records:
        emp_id = record.get("employee_id")
        if emp_id not in employee_summary:
            employee_summary[emp_id] = {
                "employee_id": emp_id,
                "employee_name": record.get("employee_name"),
                "employee_code": record.get("employee_code"),
                "total_days": 0,
                "total_time_seconds": 0,
                "days_present": [],
                "average_daily_hours": 0
            }
        
        employee_summary[emp_id]["total_days"] += 1
        employee_summary[emp_id]["total_time_seconds"] += record.get("total_time_at_location", 0)
        employee_summary[emp_id]["days_present"].append(record.get("date"))
    
    # Calculate averages and format
    for emp_id, data in employee_summary.items():
        total_hours = data["total_time_seconds"] / 3600
        data["total_time_hours"] = round(total_hours, 2)
        data["average_daily_hours"] = round(total_hours / data["total_days"], 2) if data["total_days"] > 0 else 0
        
        hours = data["total_time_seconds"] // 3600
        minutes = (data["total_time_seconds"] % 3600) // 60
        data["total_time_formatted"] = f"{hours}:{minutes:02d}"
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "employees": list(employee_summary.values()),
        "total_employees": len(employee_summary)
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
