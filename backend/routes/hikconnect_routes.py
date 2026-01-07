"""
Hik-Connect Integration Routes - نظام الكاميرات المتكامل
Complete Hikvision Cloud & Local Integration
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import httpx
import asyncio
import logging
import base64
import io

from database import db
from routes.base import get_current_user, require_role, log_activity

router = APIRouter(prefix="/api/hikconnect", tags=["Hik-Connect"])

# ==================== MODELS ====================

class HikConnectCredentials(BaseModel):
    host: str  # IP or hostname (e.g., 192.168.1.64 or cloud URL)
    port: int = 80  # HTTP port for ISAPI
    username: str
    password: str
    rtsp_port: int = 554
    device_name: Optional[str] = None

class DeviceInfo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    host: str
    port: int = 80
    rtsp_port: int = 554
    username: str
    password: str  # Encrypted in production
    device_type: str = "NVR"  # NVR, DVR, IPC
    model: Optional[str] = None
    serial_number: Optional[str] = None
    firmware_version: Optional[str] = None
    channels_count: int = 0
    is_online: bool = False
    last_check: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CameraChannel(BaseModel):
    id: str
    device_id: str
    channel_number: int
    name: str
    is_enabled: bool = True
    is_online: bool = False
    resolution: Optional[str] = None
    video_codec: Optional[str] = None
    rtsp_url: Optional[str] = None
    snapshot_url: Optional[str] = None

class StreamRequest(BaseModel):
    device_id: str
    channel: int = 1
    stream_type: str = "main"  # main, sub

class PlaybackRequest(BaseModel):
    device_id: str
    channel: int = 1
    start_time: str
    end_time: str

class MotionEvent(BaseModel):
    device_id: str
    channel: int
    event_type: str
    timestamp: str
    snapshot_base64: Optional[str] = None
    metadata: Optional[dict] = None

# ==================== HELPER FUNCTIONS ====================

async def get_isapi_client(host: str, port: int, username: str, password: str):
    """Create ISAPI HTTP client with digest auth"""
    return httpx.AsyncClient(
        base_url=f"http://{host}:{port}",
        auth=httpx.DigestAuth(username, password),
        timeout=30,
        verify=False
    )

async def check_device_online(device: dict) -> bool:
    """Check if device is online"""
    try:
        async with await get_isapi_client(
            device['host'], device['port'], 
            device['username'], device['password']
        ) as client:
            response = await client.get("/ISAPI/System/deviceInfo")
            return response.status_code == 200
    except:
        return False

# ==================== DEVICE MANAGEMENT ====================

@router.post("/devices/connect")
async def connect_device(
    credentials: HikConnectCredentials,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Connect and register a new Hikvision device"""
    try:
        async with await get_isapi_client(
            credentials.host, credentials.port,
            credentials.username, credentials.password
        ) as client:
            # Get device info
            device_response = await client.get("/ISAPI/System/deviceInfo")
            
            if device_response.status_code != 200:
                raise HTTPException(status_code=400, detail="فشل الاتصال - تحقق من البيانات")
            
            import xml.etree.ElementTree as ET
            root = ET.fromstring(device_response.text)
            ns = {"hik": "http://www.hikvision.com/ver20/XMLSchema"}
            
            # Extract device info
            device_name = root.find(".//hik:deviceName", ns)
            model = root.find(".//hik:model", ns)
            serial = root.find(".//hik:serialNumber", ns)
            firmware = root.find(".//hik:firmwareVersion", ns)
            device_type = root.find(".//hik:deviceType", ns)
            
            # Get channels count
            channels_response = await client.get("/ISAPI/Streaming/channels")
            channels_count = 8  # Default
            if channels_response.status_code == 200:
                channels_root = ET.fromstring(channels_response.text)
                channels = channels_root.findall(".//hik:StreamingChannel", ns)
                channels_count = len(channels) // 2  # Main + Sub streams
            
            # Create device record
            device = DeviceInfo(
                name=credentials.device_name or (device_name.text if device_name is not None else "Hikvision Device"),
                host=credentials.host,
                port=credentials.port,
                rtsp_port=credentials.rtsp_port,
                username=credentials.username,
                password=credentials.password,
                device_type=device_type.text if device_type is not None else "NVR",
                model=model.text if model is not None else None,
                serial_number=serial.text if serial is not None else None,
                firmware_version=firmware.text if firmware is not None else None,
                channels_count=channels_count,
                is_online=True,
                last_check=datetime.now(timezone.utc).isoformat()
            )
            
            # Save to database
            await db.hikconnect_devices.update_one(
                {"host": credentials.host},
                {"$set": device.model_dump()},
                upsert=True
            )
            
            # Log activity
            await log_activity(
                user_id=current_user["id"],
                user_name=current_user["full_name"],
                action="connect_hikconnect_device",
                details=f"تم ربط جهاز: {device.name} ({credentials.host})"
            )
            
            # Also save channels
            for i in range(1, channels_count + 1):
                channel = CameraChannel(
                    id=f"{device.id}-ch{i}",
                    device_id=device.id,
                    channel_number=i,
                    name=f"كاميرا {i}",
                    is_enabled=True,
                    is_online=True,
                    rtsp_url=f"rtsp://{credentials.username}:{credentials.password}@{credentials.host}:{credentials.rtsp_port}/Streaming/Channels/{i}01",
                    snapshot_url=f"http://{credentials.host}:{credentials.port}/ISAPI/Streaming/channels/{i}01/picture"
                )
                await db.hikconnect_channels.update_one(
                    {"id": channel.id},
                    {"$set": channel.model_dump()},
                    upsert=True
                )
            
            return {
                "success": True,
                "message": "تم الاتصال بنجاح",
                "device": device.model_dump(),
                "channels_count": channels_count
            }
            
    except httpx.ConnectError:
        raise HTTPException(status_code=400, detail="فشل الاتصال - تحقق من عنوان IP")
    except httpx.TimeoutException:
        raise HTTPException(status_code=400, detail="انتهت مهلة الاتصال")
    except Exception as e:
        logging.error(f"Device connection error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"خطأ: {str(e)}")

@router.get("/devices")
async def get_devices(current_user: dict = Depends(get_current_user)):
    """Get all connected devices"""
    devices = await db.hikconnect_devices.find({}, {"_id": 0, "password": 0}).to_list(100)
    return devices

@router.get("/devices/{device_id}")
async def get_device(device_id: str, current_user: dict = Depends(get_current_user)):
    """Get device details"""
    device = await db.hikconnect_devices.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="الجهاز غير موجود")
    return device

@router.delete("/devices/{device_id}")
async def delete_device(device_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Delete a device"""
    device = await db.hikconnect_devices.find_one({"id": device_id})
    if not device:
        raise HTTPException(status_code=404, detail="الجهاز غير موجود")
    
    await db.hikconnect_devices.delete_one({"id": device_id})
    await db.hikconnect_channels.delete_many({"device_id": device_id})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="delete_hikconnect_device",
        details=f"تم حذف جهاز: {device.get('name')}"
    )
    
    return {"message": "تم حذف الجهاز بنجاح"}

@router.post("/devices/{device_id}/refresh")
async def refresh_device_status(device_id: str, current_user: dict = Depends(get_current_user)):
    """Refresh device status"""
    device = await db.hikconnect_devices.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="الجهاز غير موجود")
    
    is_online = await check_device_online(device)
    
    await db.hikconnect_devices.update_one(
        {"id": device_id},
        {"$set": {
            "is_online": is_online,
            "last_check": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"device_id": device_id, "is_online": is_online}

# ==================== CHANNELS ====================

@router.get("/devices/{device_id}/channels")
async def get_device_channels(device_id: str, current_user: dict = Depends(get_current_user)):
    """Get all channels for a device"""
    channels = await db.hikconnect_channels.find(
        {"device_id": device_id}, 
        {"_id": 0, "password": 0}
    ).to_list(100)
    return channels

@router.put("/channels/{channel_id}")
async def update_channel(
    channel_id: str, 
    name: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Update channel name"""
    await db.hikconnect_channels.update_one(
        {"id": channel_id},
        {"$set": {"name": name}}
    )
    return {"message": "تم تحديث اسم الكاميرا"}

# ==================== LIVE STREAMING ====================

@router.post("/stream/info")
async def get_stream_info(request: StreamRequest, current_user: dict = Depends(get_current_user)):
    """Get streaming URLs for a channel"""
    device = await db.hikconnect_devices.find_one({"id": request.device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="الجهاز غير موجود")
    
    stream_code = "01" if request.stream_type == "main" else "02"
    
    rtsp_url = f"rtsp://{device['username']}:{device['password']}@{device['host']}:{device.get('rtsp_port', 554)}/Streaming/Channels/{request.channel}{stream_code}"
    http_preview = f"http://{device['host']}:{device['port']}/ISAPI/Streaming/channels/{request.channel}{stream_code}/httpPreview"
    snapshot_url = f"http://{device['host']}:{device['port']}/ISAPI/Streaming/channels/{request.channel}{stream_code}/picture"
    
    return {
        "device_id": request.device_id,
        "channel": request.channel,
        "stream_type": request.stream_type,
        "urls": {
            "rtsp": rtsp_url,
            "http_preview": http_preview,
            "snapshot": snapshot_url
        },
        "player_instructions": {
            "vlc": f"افتح VLC > Media > Open Network Stream > {rtsp_url}",
            "hik_connect": "استخدم تطبيق Hik-Connect للمشاهدة المباشرة"
        }
    }

@router.get("/stream/snapshot/{device_id}/{channel}")
async def get_live_snapshot(
    device_id: str, 
    channel: int = 1,
    current_user: dict = Depends(get_current_user)
):
    """Get live snapshot from camera"""
    device = await db.hikconnect_devices.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="الجهاز غير موجود")
    
    try:
        async with await get_isapi_client(
            device['host'], device['port'],
            device['username'], device['password']
        ) as client:
            response = await client.get(f"/ISAPI/Streaming/channels/{channel}01/picture")
            
            if response.status_code == 200:
                image_base64 = base64.b64encode(response.content).decode()
                return {
                    "device_id": device_id,
                    "channel": channel,
                    "snapshot": f"data:image/jpeg;base64,{image_base64}",
                    "captured_at": datetime.now(timezone.utc).isoformat()
                }
            else:
                raise HTTPException(status_code=400, detail="فشل في جلب الصورة")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ في الاتصال: {str(e)}")

@router.get("/stream/snapshot-raw/{device_id}/{channel}")
async def get_snapshot_raw(
    device_id: str,
    channel: int = 1,
    current_user: dict = Depends(get_current_user)
):
    """Get raw snapshot image"""
    device = await db.hikconnect_devices.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="الجهاز غير موجود")
    
    try:
        async with await get_isapi_client(
            device['host'], device['port'],
            device['username'], device['password']
        ) as client:
            response = await client.get(f"/ISAPI/Streaming/channels/{channel}01/picture")
            
            if response.status_code == 200:
                return StreamingResponse(
                    io.BytesIO(response.content),
                    media_type="image/jpeg",
                    headers={"Content-Disposition": f"inline; filename=snapshot_ch{channel}.jpg"}
                )
            else:
                raise HTTPException(status_code=400, detail="فشل في جلب الصورة")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ: {str(e)}")

# ==================== RECORDINGS / PLAYBACK ====================

@router.post("/playback/search")
async def search_recordings(request: PlaybackRequest, current_user: dict = Depends(get_current_user)):
    """Search for recordings"""
    device = await db.hikconnect_devices.find_one({"id": request.device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="الجهاز غير موجود")
    
    recordings = []
    
    try:
        async with await get_isapi_client(
            device['host'], device['port'],
            device['username'], device['password']
        ) as client:
            # Search recordings via ISAPI
            search_xml = f'''<?xml version="1.0" encoding="UTF-8"?>
            <CMSearchDescription>
                <searchID>{str(uuid.uuid4())}</searchID>
                <trackIDList>
                    <trackID>{request.channel}01</trackID>
                </trackIDList>
                <timeSpanList>
                    <timeSpan>
                        <startTime>{request.start_time}Z</startTime>
                        <endTime>{request.end_time}Z</endTime>
                    </timeSpan>
                </timeSpanList>
                <maxResults>100</maxResults>
                <searchResultPostion>0</searchResultPostion>
            </CMSearchDescription>'''
            
            response = await client.post(
                "/ISAPI/ContentMgmt/search",
                content=search_xml,
                headers={"Content-Type": "application/xml"}
            )
            
            if response.status_code == 200:
                import xml.etree.ElementTree as ET
                try:
                    root = ET.fromstring(response.text)
                    ns = {"hik": "http://www.hikvision.com/ver20/XMLSchema"}
                    
                    for match in root.findall(".//hik:searchMatchItem", ns):
                        start = match.find(".//hik:startTime", ns)
                        end = match.find(".//hik:endTime", ns)
                        playback_uri = match.find(".//hik:playbackURI", ns)
                        
                        recordings.append({
                            "id": str(uuid.uuid4()),
                            "start_time": start.text if start is not None else "",
                            "end_time": end.text if end is not None else "",
                            "playback_url": playback_uri.text if playback_uri is not None else "",
                            "channel": request.channel,
                            "device_id": request.device_id
                        })
                except:
                    pass
                    
    except Exception as e:
        logging.error(f"Recording search error: {str(e)}")
    
    return {
        "device_id": request.device_id,
        "channel": request.channel,
        "search_period": {
            "start": request.start_time,
            "end": request.end_time
        },
        "recordings": recordings,
        "total": len(recordings)
    }

@router.post("/playback/url")
async def get_playback_url(request: PlaybackRequest, current_user: dict = Depends(get_current_user)):
    """Get playback RTSP URL"""
    device = await db.hikconnect_devices.find_one({"id": request.device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="الجهاز غير موجود")
    
    # Format times for RTSP URL
    start_formatted = request.start_time.replace("-", "").replace(":", "").replace("T", "t")
    end_formatted = request.end_time.replace("-", "").replace(":", "").replace("T", "t")
    
    playback_url = f"rtsp://{device['username']}:{device['password']}@{device['host']}:{device.get('rtsp_port', 554)}/Streaming/tracks/{request.channel}01?starttime={start_formatted}z&endtime={end_formatted}z"
    
    return {
        "device_id": request.device_id,
        "channel": request.channel,
        "playback_url": playback_url,
        "start_time": request.start_time,
        "end_time": request.end_time,
        "instructions": "استخدم VLC Player لتشغيل الرابط"
    }

# ==================== EVENTS & ALERTS ====================

@router.get("/events")
async def get_events(
    device_id: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get motion detection events"""
    query = {}
    if device_id:
        query["device_id"] = device_id
    if event_type:
        query["event_type"] = event_type
    
    events = await db.hikconnect_events.find(
        query, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return events

@router.post("/events/motion")
async def receive_motion_event(event: MotionEvent, current_user: dict = Depends(get_current_user)):
    """Receive and store motion detection event"""
    event_record = {
        "id": str(uuid.uuid4()),
        "device_id": event.device_id,
        "channel": event.channel,
        "event_type": event.event_type,
        "timestamp": event.timestamp,
        "snapshot": event.snapshot_base64,
        "metadata": event.metadata,
        "is_acknowledged": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.hikconnect_events.insert_one(event_record)
    
    # Create notification
    notification = {
        "id": str(uuid.uuid4()),
        "type": "motion_detection",
        "title": f"كشف حركة - كاميرا {event.channel}",
        "message": f"تم اكتشاف حركة في {event.timestamp}",
        "device_id": event.device_id,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {"event_id": event_record["id"], "message": "تم تسجيل الحدث"}

@router.post("/events/{event_id}/acknowledge")
async def acknowledge_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """Acknowledge an event"""
    await db.hikconnect_events.update_one(
        {"id": event_id},
        {"$set": {
            "is_acknowledged": True,
            "acknowledged_by": current_user["full_name"],
            "acknowledged_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "تم تأكيد الحدث"}

# ==================== DEVICE STATUS MONITORING ====================

@router.get("/status/all")
async def get_all_devices_status(current_user: dict = Depends(get_current_user)):
    """Get status of all devices"""
    devices = await db.hikconnect_devices.find({}, {"_id": 0, "password": 0}).to_list(100)
    
    status_results = []
    for device in devices:
        is_online = await check_device_online(device)
        
        # Update status in DB
        await db.hikconnect_devices.update_one(
            {"id": device["id"]},
            {"$set": {
                "is_online": is_online,
                "last_check": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        status_results.append({
            "device_id": device["id"],
            "name": device["name"],
            "host": device["host"],
            "is_online": is_online,
            "channels_count": device.get("channels_count", 0)
        })
    
    online_count = sum(1 for s in status_results if s["is_online"])
    
    return {
        "total_devices": len(status_results),
        "online": online_count,
        "offline": len(status_results) - online_count,
        "devices": status_results,
        "checked_at": datetime.now(timezone.utc).isoformat()
    }

# ==================== PTZ CONTROL ====================

@router.post("/ptz/{device_id}/{channel}")
async def ptz_control(
    device_id: str,
    channel: int,
    action: str,  # up, down, left, right, zoom_in, zoom_out, stop
    speed: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Control PTZ camera"""
    device = await db.hikconnect_devices.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="الجهاز غير موجود")
    
    ptz_commands = {
        "up": "UP",
        "down": "DOWN", 
        "left": "LEFT",
        "right": "RIGHT",
        "zoom_in": "ZOOM_IN",
        "zoom_out": "ZOOM_OUT",
        "stop": "STOP"
    }
    
    if action not in ptz_commands:
        raise HTTPException(status_code=400, detail="أمر PTZ غير صالح")
    
    try:
        async with await get_isapi_client(
            device['host'], device['port'],
            device['username'], device['password']
        ) as client:
            ptz_xml = f'''<?xml version="1.0" encoding="UTF-8"?>
            <PTZData>
                <pan>{speed if action in ['left', 'right'] else 0}</pan>
                <tilt>{speed if action in ['up', 'down'] else 0}</tilt>
                <zoom>{speed if action in ['zoom_in', 'zoom_out'] else 0}</zoom>
            </PTZData>'''
            
            endpoint = f"/ISAPI/PTZCtrl/channels/{channel}/continuous"
            if action == "stop":
                endpoint = f"/ISAPI/PTZCtrl/channels/{channel}/continuous"
                ptz_xml = '''<?xml version="1.0" encoding="UTF-8"?>
                <PTZData><pan>0</pan><tilt>0</tilt><zoom>0</zoom></PTZData>'''
            
            response = await client.put(
                endpoint,
                content=ptz_xml,
                headers={"Content-Type": "application/xml"}
            )
            
            if response.status_code in [200, 204]:
                return {"message": f"تم تنفيذ أمر PTZ: {action}"}
            else:
                raise HTTPException(status_code=400, detail="فشل في تنفيذ الأمر")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ: {str(e)}")

# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def get_hikconnect_dashboard(current_user: dict = Depends(get_current_user)):
    """Get Hik-Connect dashboard statistics"""
    devices = await db.hikconnect_devices.find({}, {"_id": 0, "password": 0}).to_list(100)
    events_today = await db.hikconnect_events.count_documents({
        "created_at": {"$regex": f"^{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"}
    })
    
    online_count = sum(1 for d in devices if d.get("is_online"))
    total_channels = sum(d.get("channels_count", 0) for d in devices)
    
    return {
        "devices": {
            "total": len(devices),
            "online": online_count,
            "offline": len(devices) - online_count
        },
        "channels": {
            "total": total_channels
        },
        "events": {
            "today": events_today
        },
        "last_update": datetime.now(timezone.utc).isoformat()
    }
