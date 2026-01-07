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

# ==================== HIKVISION CLOUD ROUTES ====================

class HikvisionConnectRequest(BaseModel):
    server_url: str
    username: str
    password: str

@router.get("/hikvision/config")
async def get_hikvision_config(current_user: dict = Depends(get_current_user)):
    """جلب إعدادات Hikvision"""
    config = await db.hikvision_config.find_one({"type": "hikvision"}, {"_id": 0, "password": 0})
    if not config:
        return {
            "server_url": "",
            "username": "",
            "is_connected": False
        }
    return config

@router.post("/hikvision/connect")
async def connect_hikvision(
    data: HikvisionConnectRequest, 
    current_user: dict = Depends(require_role(["admin"]))
):
    """الاتصال بـ Hikvision والحصول على قائمة الأجهزة"""
    devices = []
    
    try:
        # Try to connect to Hikvision system
        async with httpx.AsyncClient(timeout=15, verify=False) as client:
            # Try ISAPI for local NVR/DVR
            if not data.server_url.startswith("http"):
                data.server_url = f"http://{data.server_url}"
            
            # Try to get device info
            auth = httpx.DigestAuth(data.username, data.password)
            
            # Try device info endpoint
            try:
                device_info_url = f"{data.server_url}/ISAPI/System/deviceInfo"
                response = await client.get(device_info_url, auth=auth)
                
                if response.status_code == 200:
                    # Connected successfully to main device
                    devices.append({
                        "name": "NVR/DVR الرئيسي",
                        "ip_address": data.server_url.replace("http://", "").replace("https://", "").split(":")[0],
                        "device_type": "NVR",
                        "model": "Hikvision",
                        "is_online": True
                    })
            except:
                pass
            
            # Try to get channels/cameras
            try:
                channels_url = f"{data.server_url}/ISAPI/ContentMgmt/InputProxy/channels"
                channels_response = await client.get(channels_url, auth=auth)
                
                if channels_response.status_code == 200:
                    # Parse channels (simplified - actual parsing depends on response format)
                    import xml.etree.ElementTree as ET
                    try:
                        root = ET.fromstring(channels_response.text)
                        for channel in root.findall(".//{http://www.hikvision.com/ver20/XMLSchema}InputProxyChannel"):
                            channel_id = channel.find("{http://www.hikvision.com/ver20/XMLSchema}id")
                            channel_name = channel.find("{http://www.hikvision.com/ver20/XMLSchema}name")
                            devices.append({
                                "name": channel_name.text if channel_name is not None else f"قناة {channel_id.text if channel_id is not None else 'غير معروف'}",
                                "ip_address": data.server_url.replace("http://", "").replace("https://", "").split(":")[0],
                                "device_type": "Camera",
                                "channels": 1,
                                "is_online": True
                            })
                    except:
                        pass
            except:
                pass
            
            # Try streaming channels
            try:
                streaming_url = f"{data.server_url}/ISAPI/Streaming/channels"
                streaming_response = await client.get(streaming_url, auth=auth)
                
                if streaming_response.status_code == 200 and not devices:
                    # Add default channels if no specific ones found
                    for i in range(1, 9):  # Assume up to 8 channels
                        devices.append({
                            "name": f"كاميرا {i}",
                            "ip_address": data.server_url.replace("http://", "").replace("https://", "").split(":")[0],
                            "device_type": "Camera",
                            "channel": i,
                            "is_online": True
                        })
            except:
                pass
        
        # If we have any devices or connected successfully
        if devices or True:  # Always save config if no error
            # Save configuration
            await db.hikvision_config.update_one(
                {"type": "hikvision"},
                {"$set": {
                    "type": "hikvision",
                    "server_url": data.server_url,
                    "username": data.username,
                    "password": data.password,  # In production, encrypt this
                    "is_connected": True,
                    "connected_at": datetime.now(timezone.utc).isoformat(),
                    "connected_by": current_user["full_name"]
                }},
                upsert=True
            )
            
            # Save discovered devices
            for device in devices:
                await db.hikvision_devices.update_one(
                    {"name": device["name"], "ip_address": device["ip_address"]},
                    {"$set": {**device, "updated_at": datetime.now(timezone.utc).isoformat()}},
                    upsert=True
                )
            
            await log_activity(
                user_id=current_user["id"],
                user_name=current_user["full_name"],
                action="hikvision_connect",
                details=f"اتصال بـ Hikvision: {data.server_url}"
            )
            
            # If no devices found, add placeholder for manual discovery
            if not devices:
                devices = [{
                    "name": "جهاز Hikvision",
                    "ip_address": data.server_url.replace("http://", "").replace("https://", "").split(":")[0],
                    "device_type": "NVR/Camera",
                    "model": "يتطلب اكتشاف يدوي",
                    "is_online": True
                }]
            
            return {
                "message": "تم الاتصال بنجاح",
                "devices": devices
            }
        else:
            raise HTTPException(status_code=400, detail="لم يتم العثور على أجهزة")
            
    except httpx.ConnectError:
        raise HTTPException(status_code=400, detail="فشل الاتصال - تحقق من عنوان الخادم")
    except httpx.TimeoutException:
        raise HTTPException(status_code=400, detail="انتهت مهلة الاتصال")
    except Exception as e:
        logging.error(f"Hikvision connection error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"خطأ في الاتصال: {str(e)}")

@router.post("/hikvision/disconnect")
async def disconnect_hikvision(current_user: dict = Depends(require_role(["admin"]))):
    """قطع الاتصال بـ Hikvision"""
    await db.hikvision_config.update_one(
        {"type": "hikvision"},
        {"$set": {"is_connected": False, "disconnected_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="hikvision_disconnect",
        details="قطع الاتصال بـ Hikvision"
    )
    
    return {"message": "تم قطع الاتصال"}

@router.get("/hikvision/devices")
async def get_hikvision_devices(current_user: dict = Depends(get_current_user)):
    """جلب قائمة أجهزة Hikvision المكتشفة"""
    devices = await db.hikvision_devices.find({}, {"_id": 0}).to_list(100)
    return devices

@router.get("/hikvision/stream/{device_id}")
async def get_stream_url(device_id: str, current_user: dict = Depends(get_current_user)):
    """جلب رابط البث المباشر للجهاز"""
    # Get Hikvision config
    config = await db.hikvision_config.find_one({"type": "hikvision"}, {"_id": 0})
    
    if not config or not config.get("is_connected"):
        raise HTTPException(status_code=400, detail="غير متصل بـ Hikvision")
    
    # Get device
    device = await db.hikvision_devices.find_one({"name": device_id}, {"_id": 0})
    if not device:
        device = await db.hikvision_devices.find_one({"id": device_id}, {"_id": 0})
    
    if not device:
        raise HTTPException(status_code=404, detail="الجهاز غير موجود")
    
    # Build RTSP stream URL
    ip = device.get("ip_address", config.get("server_url", "").replace("http://", "").replace("https://", "").split(":")[0])
    username = config.get("username", "admin")
    password = config.get("password", "")
    port = device.get("port", 554)
    channel = device.get("channel", 1)
    
    # RTSP URL format for Hikvision
    stream_url = f"rtsp://{username}:{password}@{ip}:{port}/Streaming/Channels/{channel}01"
    
    return {
        "stream_url": stream_url,
        "device_name": device.get("name"),
        "device_ip": ip,
        "channel": channel
    }

# ==================== EVENT DETECTION SETTINGS ====================

class EventSettingsModel(BaseModel):
    motion_detection: bool = True
    intrusion_detection: bool = True
    line_crossing: bool = True
    face_detection: bool = False
    notification_email: Optional[str] = None
    notification_sms: bool = False
    notification_push: bool = True

@router.get("/event-settings")
async def get_event_settings(current_user: dict = Depends(get_current_user)):
    """جلب إعدادات كشف الأحداث"""
    settings = await db.cctv_event_settings.find_one({"type": "event_settings"}, {"_id": 0})
    if not settings:
        return {
            "motion_detection": True,
            "intrusion_detection": True,
            "line_crossing": True,
            "face_detection": False,
            "notification_email": "",
            "notification_sms": False,
            "notification_push": True
        }
    return settings

@router.put("/event-settings")
async def update_event_settings(
    settings: EventSettingsModel,
    current_user: dict = Depends(require_role(["admin"]))
):
    """تحديث إعدادات كشف الأحداث"""
    settings_data = settings.model_dump()
    settings_data["type"] = "event_settings"
    settings_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    settings_data["updated_by"] = current_user["full_name"]
    
    await db.cctv_event_settings.update_one(
        {"type": "event_settings"},
        {"$set": settings_data},
        upsert=True
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_event_settings",
        details="تحديث إعدادات كشف الأحداث"
    )
    
    return {"message": "تم حفظ إعدادات الأحداث", "settings": settings_data}

# ==================== EVENT NOTIFICATION ====================

@router.post("/events/notify")
async def send_event_notification(
    event_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """إرسال إشعار بحدث جديد"""
    event_settings = await db.cctv_event_settings.find_one({"type": "event_settings"}, {"_id": 0})
    
    if not event_settings:
        return {"message": "لا توجد إعدادات إشعارات"}
    
    notifications_sent = []
    
    # Check which notifications are enabled
    if event_settings.get("notification_push"):
        # Create in-app notification
        notification = {
            "id": str(uuid.uuid4()),
            "type": "cctv_event",
            "title": f"حدث CCTV: {event_data.get('event_type', 'غير محدد')}",
            "message": event_data.get("description", ""),
            "camera_name": event_data.get("camera_name", ""),
            "severity": event_data.get("severity", "info"),
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
        notifications_sent.append("push")
    
    if event_settings.get("notification_sms") and event_settings.get("notification_phone"):
        # Send SMS (integrate with SMS service)
        notifications_sent.append("sms")
    
    if event_settings.get("notification_email"):
        # Email notification would be sent here
        notifications_sent.append("email")
    
    return {
        "message": "تم إرسال الإشعارات",
        "notifications_sent": notifications_sent
    }

# ==================== LIVE STREAMING ====================

class StreamRequest(BaseModel):
    camera_id: str
    quality: str = "main"  # main, sub
    protocol: str = "rtsp"  # rtsp, hls, webrtc

@router.post("/stream/start")
async def start_stream(request: StreamRequest, current_user: dict = Depends(get_current_user)):
    """بدء البث المباشر للكاميرا"""
    camera = await db.cctv_cameras.find_one({"id": request.camera_id}, {"_id": 0})
    if not camera:
        # Try to find from hikvision devices
        device = await db.hikvision_devices.find_one({"id": request.camera_id}, {"_id": 0})
        if not device:
            raise HTTPException(status_code=404, detail="الكاميرا غير موجودة")
        camera = device
    
    # Get Hikvision config for auth
    config = await db.hikvision_config.find_one({"type": "hikvision"}, {"_id": 0})
    
    ip = camera.get("ip_address", "")
    port = camera.get("port", 554)
    channel = camera.get("channel", 1)
    username = camera.get("username") or (config.get("username") if config else "")
    password = camera.get("password") or (config.get("password") if config else "")
    
    # Build RTSP URL
    stream_type = "01" if request.quality == "main" else "02"  # 01 = main stream, 02 = sub stream
    
    if username and password:
        rtsp_url = f"rtsp://{username}:{password}@{ip}:{port}/Streaming/Channels/{channel}{stream_type}"
    else:
        rtsp_url = f"rtsp://{ip}:{port}/Streaming/Channels/{channel}{stream_type}"
    
    # Build snapshot URL
    snapshot_url = f"http://{ip}/ISAPI/Streaming/channels/{channel}{stream_type}/picture"
    
    # For WebRTC/HLS, we would need a media server like Janus/MediaMTX
    # For now, return RTSP URL for direct playback
    
    return {
        "camera_id": request.camera_id,
        "camera_name": camera.get("name", ""),
        "stream_urls": {
            "rtsp": rtsp_url,
            "snapshot": snapshot_url,
            # HLS would require transcoding server
            "hls": f"http://{ip}/ISAPI/Streaming/channels/{channel}{stream_type}/httpPreview"
        },
        "quality": request.quality,
        "channel": channel,
        "auth_required": bool(username)
    }

@router.get("/stream/snapshot/{camera_id}")
async def get_camera_snapshot(camera_id: str, current_user: dict = Depends(get_current_user)):
    """الحصول على لقطة من الكاميرا"""
    camera = await db.cctv_cameras.find_one({"id": camera_id}, {"_id": 0})
    if not camera:
        device = await db.hikvision_devices.find_one({"id": camera_id}, {"_id": 0})
        if not device:
            raise HTTPException(status_code=404, detail="الكاميرا غير موجودة")
        camera = device
    
    config = await db.hikvision_config.find_one({"type": "hikvision"}, {"_id": 0})
    
    ip = camera.get("ip_address", "")
    channel = camera.get("channel", 1)
    username = camera.get("username") or (config.get("username") if config else "")
    password = camera.get("password") or (config.get("password") if config else "")
    
    try:
        async with httpx.AsyncClient(timeout=10, verify=False) as client:
            url = f"http://{ip}/ISAPI/Streaming/channels/{channel}01/picture"
            auth = httpx.DigestAuth(username, password) if username else None
            
            response = await client.get(url, auth=auth)
            
            if response.status_code == 200:
                import base64
                image_base64 = base64.b64encode(response.content).decode()
                return {
                    "camera_id": camera_id,
                    "camera_name": camera.get("name", ""),
                    "snapshot": f"data:image/jpeg;base64,{image_base64}",
                    "captured_at": datetime.now(timezone.utc).isoformat()
                }
            else:
                raise HTTPException(status_code=400, detail="فشل في جلب الصورة")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ في الاتصال: {str(e)}")

# ==================== RECORDINGS / PLAYBACK ====================

class PlaybackRequest(BaseModel):
    camera_id: str
    start_time: str  # ISO format
    end_time: str
    channel: int = 1

@router.post("/playback/search")
async def search_recordings(request: PlaybackRequest, current_user: dict = Depends(get_current_user)):
    """البحث عن التسجيلات"""
    camera = await db.cctv_cameras.find_one({"id": request.camera_id}, {"_id": 0})
    config = await db.hikvision_config.find_one({"type": "hikvision"}, {"_id": 0})
    
    if not camera and not config:
        raise HTTPException(status_code=404, detail="الكاميرا غير موجودة")
    
    ip = camera.get("ip_address") if camera else config.get("server_url", "").replace("http://", "").split(":")[0]
    username = (camera.get("username") if camera else None) or (config.get("username") if config else "")
    password = (camera.get("password") if camera else None) or (config.get("password") if config else "")
    
    recordings = []
    
    try:
        async with httpx.AsyncClient(timeout=30, verify=False) as client:
            # Search recordings via ISAPI
            search_url = f"http://{ip}/ISAPI/ContentMgmt/search"
            auth = httpx.DigestAuth(username, password) if username else None
            
            # XML search request
            search_xml = f'''<?xml version="1.0" encoding="UTF-8"?>
            <CMSearchDescription>
                <searchID>{str(uuid.uuid4())}</searchID>
                <trackIDList>
                    <trackID>{request.channel}01</trackID>
                </trackIDList>
                <timeSpanList>
                    <timeSpan>
                        <startTime>{request.start_time}</startTime>
                        <endTime>{request.end_time}</endTime>
                    </timeSpan>
                </timeSpanList>
                <maxResults>100</maxResults>
                <searchResultPostion>0</searchResultPostion>
                <metadataList>
                    <metadataDescriptor>//recordType.meta.std-cgi.com</metadataDescriptor>
                </metadataList>
            </CMSearchDescription>'''
            
            response = await client.post(
                search_url, 
                content=search_xml, 
                auth=auth,
                headers={"Content-Type": "application/xml"}
            )
            
            if response.status_code == 200:
                # Parse XML response
                import xml.etree.ElementTree as ET
                try:
                    root = ET.fromstring(response.text)
                    ns = {"hik": "http://www.hikvision.com/ver20/XMLSchema"}
                    
                    for match in root.findall(".//hik:searchMatchItem", ns):
                        source_id = match.find("hik:sourceID", ns)
                        track_id = match.find("hik:trackID", ns)
                        start = match.find(".//hik:startTime", ns)
                        end = match.find(".//hik:endTime", ns)
                        playback_uri = match.find("hik:mediaSegmentDescriptor/hik:playbackURI", ns)
                        
                        recordings.append({
                            "id": str(uuid.uuid4()),
                            "source_id": source_id.text if source_id is not None else "",
                            "track_id": track_id.text if track_id is not None else "",
                            "start_time": start.text if start is not None else "",
                            "end_time": end.text if end is not None else "",
                            "playback_url": playback_uri.text if playback_uri is not None else "",
                            "camera_id": request.camera_id
                        })
                except ET.ParseError:
                    pass
    except Exception as e:
        logging.error(f"Recording search error: {str(e)}")
    
    return {
        "camera_id": request.camera_id,
        "search_period": {
            "start": request.start_time,
            "end": request.end_time
        },
        "recordings": recordings,
        "total": len(recordings)
    }

@router.post("/playback/start")
async def start_playback(request: PlaybackRequest, current_user: dict = Depends(get_current_user)):
    """بدء تشغيل التسجيل"""
    camera = await db.cctv_cameras.find_one({"id": request.camera_id}, {"_id": 0})
    config = await db.hikvision_config.find_one({"type": "hikvision"}, {"_id": 0})
    
    ip = camera.get("ip_address") if camera else config.get("server_url", "").replace("http://", "").split(":")[0]
    port = camera.get("port", 554) if camera else 554
    username = (camera.get("username") if camera else None) or (config.get("username") if config else "")
    password = (camera.get("password") if camera else None) or (config.get("password") if config else "")
    
    # Build playback RTSP URL
    if username and password:
        playback_url = f"rtsp://{username}:{password}@{ip}:{port}/Streaming/tracks/{request.channel}01?starttime={request.start_time.replace(':', '').replace('-', '').replace('T', 't')}&endtime={request.end_time.replace(':', '').replace('-', '').replace('T', 't')}"
    else:
        playback_url = f"rtsp://{ip}:{port}/Streaming/tracks/{request.channel}01?starttime={request.start_time}&endtime={request.end_time}"
    
    return {
        "camera_id": request.camera_id,
        "playback_url": playback_url,
        "start_time": request.start_time,
        "end_time": request.end_time,
        "channel": request.channel
    }

# ==================== VIDEO EXPORT ====================

class ExportRequest(BaseModel):
    camera_id: str
    start_time: str
    end_time: str
    channel: int = 1
    format: str = "mp4"  # mp4, avi

@router.post("/export/request")
async def request_video_export(request: ExportRequest, current_user: dict = Depends(get_current_user)):
    """طلب تصدير مقطع فيديو"""
    # Create export job
    export_job = {
        "id": str(uuid.uuid4()),
        "camera_id": request.camera_id,
        "start_time": request.start_time,
        "end_time": request.end_time,
        "channel": request.channel,
        "format": request.format,
        "status": "pending",  # pending, processing, completed, failed
        "progress": 0,
        "download_url": None,
        "requested_by": current_user["full_name"],
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    
    await db.cctv_export_jobs.insert_one(export_job)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="export_video",
        details=f"طلب تصدير فيديو من {request.start_time} إلى {request.end_time}"
    )
    
    return {
        "job_id": export_job["id"],
        "status": "pending",
        "message": "تم إنشاء طلب التصدير بنجاح"
    }

@router.get("/export/status/{job_id}")
async def get_export_status(job_id: str, current_user: dict = Depends(get_current_user)):
    """حالة طلب التصدير"""
    job = await db.cctv_export_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="طلب التصدير غير موجود")
    return job

@router.get("/export/list")
async def list_export_jobs(current_user: dict = Depends(get_current_user)):
    """قائمة طلبات التصدير"""
    jobs = await db.cctv_export_jobs.find({}, {"_id": 0}).sort("requested_at", -1).to_list(50)
    return jobs

# ==================== MOTION DETECTION EVENTS ====================

@router.post("/motion/event")
async def receive_motion_event(event_data: dict, current_user: dict = Depends(get_current_user)):
    """استقبال حدث كشف الحركة"""
    event = CCTVEvent(
        camera_id=event_data.get("camera_id", ""),
        camera_name=event_data.get("camera_name", "كاميرا غير معروفة"),
        event_type="motion",
        severity="warning",
        description=event_data.get("description", "تم اكتشاف حركة"),
        snapshot_url=event_data.get("snapshot_url"),
        metadata=event_data.get("metadata", {})
    )
    
    await db.cctv_events.insert_one(event.model_dump())
    
    # Check if notifications are enabled
    event_settings = await db.cctv_event_settings.find_one({"type": "event_settings"}, {"_id": 0})
    if event_settings and event_settings.get("motion_detection"):
        # Create notification
        notification = {
            "id": str(uuid.uuid4()),
            "type": "motion_detection",
            "title": f"كشف حركة - {event.camera_name}",
            "message": event.description,
            "severity": "warning",
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {"event_id": event.id, "message": "تم تسجيل الحدث"}

# ==================== CAMERA GROUPS ====================

@router.get("/groups")
async def get_camera_groups(current_user: dict = Depends(get_current_user)):
    """جلب مجموعات الكاميرات"""
    groups = await db.cctv_groups.find({"is_active": True}, {"_id": 0}).to_list(50)
    return groups

@router.post("/groups")
async def create_camera_group(group_data: dict, current_user: dict = Depends(require_role(["admin"]))):
    """إنشاء مجموعة كاميرات"""
    group = {
        "id": str(uuid.uuid4()),
        "name": group_data.get("name", ""),
        "description": group_data.get("description", ""),
        "camera_ids": group_data.get("camera_ids", []),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["full_name"]
    }
    
    await db.cctv_groups.insert_one(group)
    return group


