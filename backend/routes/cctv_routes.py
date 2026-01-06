"""
CCTV System Routes - مسارات نظام الكاميرات
Hikvision Integration
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import httpx
import logging

from database import db
from routes.base import get_current_user, require_role, log_activity

router = APIRouter(prefix="/api/cctv", tags=["CCTV"])

# ==================== MODELS ====================

class CCTVCamera(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    ip_address: str
    port: int = 554
    username: Optional[str] = None
    password: Optional[str] = None
    channel: int = 1
    location: Optional[str] = None
    camera_type: str = "hikvision"  # hikvision, dahua, generic
    stream_url: Optional[str] = None
    snapshot_url: Optional[str] = None
    is_active: bool = True
    is_online: bool = False
    last_check: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CCTVCameraCreate(BaseModel):
    name: str
    ip_address: str
    port: int = 554
    username: Optional[str] = None
    password: Optional[str] = None
    channel: int = 1
    location: Optional[str] = None
    camera_type: str = "hikvision"

class CCTVEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    camera_id: str
    camera_name: str
    event_type: str  # motion, alarm, line_crossing, intrusion, face_detection
    severity: str = "info"  # info, warning, critical
    description: str
    snapshot_url: Optional[str] = None
    video_url: Optional[str] = None
    metadata: Optional[dict] = None
    is_acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CCTVAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    camera_id: str
    camera_name: str
    alert_type: str  # offline, motion, tampering, storage_full
    message: str
    severity: str = "warning"
    is_resolved: bool = False
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CCTVSettings(BaseModel):
    dairy_system_url: Optional[str] = None
    dairy_api_key: Optional[str] = None
    auto_sync_enabled: bool = False
    sync_interval: int = 60  # minutes
    motion_detection_enabled: bool = True
    alert_email: Optional[str] = None
    retention_days: int = 30

# ==================== CAMERA ROUTES ====================

@router.get("/cameras")
async def get_cameras(current_user: dict = Depends(get_current_user)):
    """جلب قائمة الكاميرات"""
    cameras = await db.cctv_cameras.find({"is_active": True}, {"_id": 0}).to_list(100)
    return cameras

@router.get("/cameras/{camera_id}")
async def get_camera(camera_id: str, current_user: dict = Depends(get_current_user)):
    """جلب تفاصيل كاميرا"""
    camera = await db.cctv_cameras.find_one({"id": camera_id}, {"_id": 0})
    if not camera:
        raise HTTPException(status_code=404, detail="الكاميرا غير موجودة")
    return camera

@router.post("/cameras")
async def create_camera(camera_data: CCTVCameraCreate, current_user: dict = Depends(require_role(["admin"]))):
    """إضافة كاميرا جديدة"""
    camera = CCTVCamera(**camera_data.model_dump())
    
    # Generate stream URLs for Hikvision
    if camera_data.camera_type == "hikvision":
        auth = f"{camera_data.username}:{camera_data.password}@" if camera_data.username else ""
        camera.stream_url = f"rtsp://{auth}{camera_data.ip_address}:{camera_data.port}/Streaming/Channels/{camera_data.channel}01"
        camera.snapshot_url = f"http://{camera_data.ip_address}/ISAPI/Streaming/channels/{camera_data.channel}01/picture"
    
    await db.cctv_cameras.insert_one(camera.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_camera",
        entity_type="cctv_camera",
        entity_id=camera.id,
        entity_name=camera.name,
        details=f"إضافة كاميرا: {camera.name} ({camera_data.ip_address})"
    )
    
    return camera

@router.put("/cameras/{camera_id}")
async def update_camera(camera_id: str, camera_data: CCTVCameraCreate, current_user: dict = Depends(require_role(["admin"]))):
    """تحديث كاميرا"""
    existing = await db.cctv_cameras.find_one({"id": camera_id})
    if not existing:
        raise HTTPException(status_code=404, detail="الكاميرا غير موجودة")
    
    update_dict = camera_data.model_dump()
    
    # Regenerate stream URLs
    if camera_data.camera_type == "hikvision":
        auth = f"{camera_data.username}:{camera_data.password}@" if camera_data.username else ""
        update_dict["stream_url"] = f"rtsp://{auth}{camera_data.ip_address}:{camera_data.port}/Streaming/Channels/{camera_data.channel}01"
        update_dict["snapshot_url"] = f"http://{camera_data.ip_address}/ISAPI/Streaming/channels/{camera_data.channel}01/picture"
    
    await db.cctv_cameras.update_one({"id": camera_id}, {"$set": update_dict})
    
    updated = await db.cctv_cameras.find_one({"id": camera_id}, {"_id": 0})
    return updated

@router.delete("/cameras/{camera_id}")
async def delete_camera(camera_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """حذف كاميرا"""
    existing = await db.cctv_cameras.find_one({"id": camera_id})
    if not existing:
        raise HTTPException(status_code=404, detail="الكاميرا غير موجودة")
    
    await db.cctv_cameras.update_one({"id": camera_id}, {"$set": {"is_active": False}})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="delete_camera",
        entity_type="cctv_camera",
        entity_id=camera_id,
        entity_name=existing.get("name"),
        details=f"حذف كاميرا: {existing.get('name')}"
    )
    
    return {"message": "تم حذف الكاميرا بنجاح"}

@router.post("/cameras/{camera_id}/check-status")
async def check_camera_status(camera_id: str, current_user: dict = Depends(get_current_user)):
    """فحص حالة الكاميرا"""
    camera = await db.cctv_cameras.find_one({"id": camera_id}, {"_id": 0})
    if not camera:
        raise HTTPException(status_code=404, detail="الكاميرا غير موجودة")
    
    is_online = False
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            # Try to connect to camera
            url = f"http://{camera['ip_address']}/ISAPI/System/deviceInfo"
            auth = None
            if camera.get("username"):
                auth = (camera["username"], camera.get("password", ""))
            
            response = await client.get(url, auth=auth)
            is_online = response.status_code == 200
    except Exception as e:
        logging.error(f"Camera check failed: {e}")
        is_online = False
    
    # Update camera status
    await db.cctv_cameras.update_one(
        {"id": camera_id},
        {"$set": {
            "is_online": is_online,
            "last_check": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create alert if offline
    if not is_online:
        alert = CCTVAlert(
            camera_id=camera_id,
            camera_name=camera["name"],
            alert_type="offline",
            message=f"الكاميرا {camera['name']} غير متصلة",
            severity="critical"
        )
        await db.cctv_alerts.insert_one(alert.model_dump())
    
    return {"camera_id": camera_id, "is_online": is_online, "checked_at": datetime.now(timezone.utc).isoformat()}

@router.post("/cameras/check-all")
async def check_all_cameras(current_user: dict = Depends(get_current_user)):
    """فحص حالة جميع الكاميرات"""
    cameras = await db.cctv_cameras.find({"is_active": True}, {"_id": 0}).to_list(100)
    results = []
    
    for camera in cameras:
        is_online = False
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                url = f"http://{camera['ip_address']}/ISAPI/System/deviceInfo"
                auth = None
                if camera.get("username"):
                    auth = (camera["username"], camera.get("password", ""))
                
                response = await client.get(url, auth=auth)
                is_online = response.status_code == 200
        except:
            is_online = False
        
        await db.cctv_cameras.update_one(
            {"id": camera["id"]},
            {"$set": {"is_online": is_online, "last_check": datetime.now(timezone.utc).isoformat()}}
        )
        
        results.append({"camera_id": camera["id"], "name": camera["name"], "is_online": is_online})
    
    return {"checked": len(results), "results": results}

# ==================== EVENTS ROUTES ====================

@router.get("/events")
async def get_events(
    camera_id: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """جلب سجل الأحداث"""
    query = {}
    if camera_id:
        query["camera_id"] = camera_id
    if event_type:
        query["event_type"] = event_type
    
    events = await db.cctv_events.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return events

@router.post("/events")
async def create_event(
    camera_id: str,
    event_type: str,
    description: str,
    severity: str = "info",
    metadata: Optional[dict] = None,
    current_user: dict = Depends(get_current_user)
):
    """تسجيل حدث جديد"""
    camera = await db.cctv_cameras.find_one({"id": camera_id}, {"_id": 0})
    if not camera:
        raise HTTPException(status_code=404, detail="الكاميرا غير موجودة")
    
    event = CCTVEvent(
        camera_id=camera_id,
        camera_name=camera["name"],
        event_type=event_type,
        severity=severity,
        description=description,
        metadata=metadata
    )
    
    await db.cctv_events.insert_one(event.model_dump())
    return event

@router.put("/events/{event_id}/acknowledge")
async def acknowledge_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """تأكيد استلام الحدث"""
    result = await db.cctv_events.update_one(
        {"id": event_id},
        {"$set": {
            "is_acknowledged": True,
            "acknowledged_by": current_user["full_name"],
            "acknowledged_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="الحدث غير موجود")
    
    return {"message": "تم تأكيد استلام الحدث"}

# ==================== ALERTS ROUTES ====================

@router.get("/alerts")
async def get_alerts(
    is_resolved: Optional[bool] = None,
    severity: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """جلب التنبيهات"""
    query = {}
    if is_resolved is not None:
        query["is_resolved"] = is_resolved
    if severity:
        query["severity"] = severity
    
    alerts = await db.cctv_alerts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return alerts

@router.put("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    """حل التنبيه"""
    result = await db.cctv_alerts.update_one(
        {"id": alert_id},
        {"$set": {
            "is_resolved": True,
            "resolved_by": current_user["full_name"],
            "resolved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="التنبيه غير موجود")
    
    return {"message": "تم حل التنبيه"}

# ==================== SETTINGS ROUTES ====================

@router.get("/settings")
async def get_cctv_settings(current_user: dict = Depends(require_role(["admin"]))):
    """جلب إعدادات CCTV"""
    settings = await db.cctv_settings.find_one({"type": "cctv_config"}, {"_id": 0})
    if not settings:
        return CCTVSettings().model_dump()
    return settings

@router.put("/settings")
async def update_cctv_settings(settings: CCTVSettings, current_user: dict = Depends(require_role(["admin"]))):
    """تحديث إعدادات CCTV"""
    settings_dict = settings.model_dump()
    settings_dict["type"] = "cctv_config"
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    settings_dict["updated_by"] = current_user["full_name"]
    
    await db.cctv_settings.update_one(
        {"type": "cctv_config"},
        {"$set": settings_dict},
        upsert=True
    )
    
    return {"message": "تم تحديث الإعدادات بنجاح"}

# ==================== DASHBOARD STATS ====================

@router.get("/dashboard")
async def get_cctv_dashboard(current_user: dict = Depends(get_current_user)):
    """إحصائيات لوحة CCTV"""
    # Count cameras
    total_cameras = await db.cctv_cameras.count_documents({"is_active": True})
    online_cameras = await db.cctv_cameras.count_documents({"is_active": True, "is_online": True})
    
    # Count unresolved alerts
    unresolved_alerts = await db.cctv_alerts.count_documents({"is_resolved": False})
    critical_alerts = await db.cctv_alerts.count_documents({"is_resolved": False, "severity": "critical"})
    
    # Today's events
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_events = await db.cctv_events.count_documents({"created_at": {"$regex": f"^{today}"}})
    
    # Recent events
    recent_events = await db.cctv_events.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    # Recent alerts
    recent_alerts = await db.cctv_alerts.find({"is_resolved": False}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "cameras": {
            "total": total_cameras,
            "online": online_cameras,
            "offline": total_cameras - online_cameras
        },
        "alerts": {
            "unresolved": unresolved_alerts,
            "critical": critical_alerts
        },
        "events": {
            "today": today_events
        },
        "recent_events": recent_events,
        "recent_alerts": recent_alerts
    }

# ==================== INTEGRATION ROUTES ====================

@router.post("/integration/test-connection")
async def test_dairy_connection(current_user: dict = Depends(require_role(["admin"]))):
    """اختبار الاتصال بنظام الألبان"""
    settings = await db.cctv_settings.find_one({"type": "cctv_config"}, {"_id": 0})
    
    if not settings or not settings.get("dairy_system_url"):
        raise HTTPException(status_code=400, detail="لم يتم تكوين رابط نظام الألبان")
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"{settings['dairy_system_url']}/api/")
            if response.status_code == 200:
                return {"status": "success", "message": "تم الاتصال بنظام الألبان بنجاح", "connected": True}
            else:
                return {"status": "error", "message": f"فشل الاتصال: {response.status_code}", "connected": False}
    except Exception as e:
        return {"status": "error", "message": str(e), "connected": False}

@router.get("/integration/sync-status")
async def get_sync_status(current_user: dict = Depends(get_current_user)):
    """حالة المزامنة مع نظام الألبان"""
    settings = await db.cctv_settings.find_one({"type": "cctv_config"}, {"_id": 0})
    cameras_count = await db.cctv_cameras.count_documents({"is_active": True})
    events_today = await db.cctv_events.count_documents({"created_at": {"$regex": f"^{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"}})
    
    return {
        "status": "active" if settings and settings.get("auto_sync_enabled") else "inactive",
        "last_check": datetime.now(timezone.utc).isoformat(),
        "cctv_system": {
            "cameras": cameras_count,
            "events_today": events_today
        },
        "dairy_system": {
            "connected": bool(settings and settings.get("dairy_system_url")),
            "url": settings.get("dairy_system_url") if settings else None
        }
    }
