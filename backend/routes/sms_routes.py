"""
SMS Routes - مسارات الرسائل النصية
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import secrets
import uuid
import httpx
import logging
import os

from database import db

# Import auth dependencies - we'll get these from server.py for now
# until full refactoring is complete

router = APIRouter(prefix="/api", tags=["SMS"])


async def send_sms_tamimah(phone: str, message: str) -> dict:
    """
    إرسال رسالة SMS عبر Tamimah SMS
    Tamimah SMS API Integration for Oman
    """
    try:
        sms_settings = await db.system_settings.find_one({"type": "sms"}, {"_id": 0})
        
        api_url = sms_settings.get("api_url") if sms_settings else os.environ.get("SMS_API_URL")
        username = sms_settings.get("username") if sms_settings else os.environ.get("SMS_USERNAME")
        password = sms_settings.get("password") if sms_settings else os.environ.get("SMS_PASSWORD")
        sender_id = sms_settings.get("sender_id") if sms_settings else os.environ.get("SMS_SENDER_ID", "MAROOJ")
        
        if not all([api_url, username, password]):
            return {
                "success": False,
                "error": "إعدادات SMS غير مكتملة - يرجى إضافة بيانات Tamimah SMS الصحيحة",
                "note": "تواصل مع دعم Tamimah للحصول على رابط API الصحيح"
            }
        
        # Clean phone number (ensure it starts with 968 for Oman)
        phone = phone.replace("+", "").replace(" ", "").replace("-", "")
        if phone.startswith("00968"):
            phone = phone[2:]
        elif not phone.startswith("968"):
            phone = "968" + phone
        
        # Send SMS via Tamimah API
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                response = await client.post(
                    api_url,
                    data={
                        "username": username,
                        "password": password,
                        "sender": sender_id,
                        "mobile": phone,
                        "message": message,
                        "type": "text"
                    }
                )
                
                if response.status_code == 200:
                    result = response.text
                    if "success" in result.lower() or "sent" in result.lower() or result.startswith("1"):
                        return {"success": True, "response": result}
                    else:
                        return {"success": False, "error": f"رد من Tamimah: {result}"}
                else:
                    return {"success": False, "error": f"خطأ HTTP {response.status_code}: {response.text}"}
            
            except httpx.ConnectError:
                return {
                    "success": False, 
                    "error": "تعذر الاتصال بخادم Tamimah SMS - تأكد من صحة رابط API",
                    "note": "رابط API قد يكون غير صحيح. تواصل مع دعم Tamimah للحصول على الرابط الصحيح"
                }
            except httpx.TimeoutException:
                return {
                    "success": False,
                    "error": "انتهت مهلة الاتصال - الخادم لا يستجيب"
                }
                
    except Exception as e:
        error_msg = str(e)
        logging.error(f"SMS send error: {e}")
        
        if "Name or service not known" in error_msg or "Errno -2" in error_msg:
            return {
                "success": False, 
                "error": "رابط API غير صحيح أو الخادم غير موجود",
                "note": "يرجى التواصل مع دعم Tamimah SMS للحصول على رابط API الصحيح"
            }
        
        return {"success": False, "error": error_msg}


# Note: These routes are defined in server.py for now
# They will be migrated here once the auth dependencies are properly extracted
