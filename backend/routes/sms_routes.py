"""
SMS Routes - مسارات الرسائل النصية
Tamimah SMS / Yamamah SMS / Generic SMS API Integration for Oman
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import secrets
import uuid
import httpx
import logging
import os
import urllib.parse

from database import db

# Import auth dependencies - we'll get these from server.py for now
# until full refactoring is complete

router = APIRouter(prefix="/api", tags=["SMS"])


async def send_sms_tamimah(phone: str, message: str) -> dict:
    """
    إرسال رسالة SMS عبر Tamimah SMS أو مزود آخر
    Tamimah SMS / Yamamah / Generic SMS API Integration for Oman
    
    Supported API formats:
    1. Tamimah SMS (POST with form data)
    2. Yamamah SMS (POST/GET with params)
    3. Generic HTTP SMS API
    """
    try:
        sms_settings = await db.system_settings.find_one({"type": "sms"}, {"_id": 0})
        
        if not sms_settings:
            return {
                "success": False,
                "error": "إعدادات SMS غير موجودة",
                "note": "يرجى إضافة إعدادات SMS في إعدادات النظام"
            }
        
        api_url = sms_settings.get("api_url", "")
        username = sms_settings.get("username", "")
        password = sms_settings.get("password", "")
        sender_id = sms_settings.get("sender_id", "MAROOJ")
        api_type = sms_settings.get("api_type", "tamimah")  # tamimah, yamamah, generic
        
        if not all([api_url, username, password]):
            return {
                "success": False,
                "error": "إعدادات SMS غير مكتملة",
                "missing": {
                    "api_url": not bool(api_url),
                    "username": not bool(username),
                    "password": not bool(password)
                },
                "note": "تواصل مع مزود خدمة SMS للحصول على البيانات الصحيحة"
            }
        
        # Clean phone number for Oman (+968)
        phone = phone.replace("+", "").replace(" ", "").replace("-", "")
        if phone.startswith("00968"):
            phone = phone[2:]  # Remove 00
        elif phone.startswith("00"):
            phone = phone[2:]  # Remove 00 for other countries
        elif phone.startswith("968"):
            pass  # Already correct
        elif len(phone) == 8:
            phone = "968" + phone  # Add Oman code for 8-digit numbers
        
        logging.info(f"Sending SMS to {phone} via {api_type}")
        
        async with httpx.AsyncClient(timeout=30, verify=False) as client:
            try:
                # Different API formats based on provider
                if api_type == "yamamah":
                    # Yamamah SMS API format
                    params = {
                        "username": username,
                        "password": password,
                        "to": phone,
                        "message": message,
                        "sender": sender_id
                    }
                    response = await client.get(api_url, params=params)
                    
                elif api_type == "generic_get":
                    # Generic GET API with customizable params
                    params = {
                        sms_settings.get("param_user", "username"): username,
                        sms_settings.get("param_pass", "password"): password,
                        sms_settings.get("param_to", "to"): phone,
                        sms_settings.get("param_msg", "message"): message,
                        sms_settings.get("param_sender", "sender"): sender_id
                    }
                    response = await client.get(api_url, params=params)
                    
                else:
                    # Tamimah / Default POST format
                    data = {
                        "username": username,
                        "password": password,
                        "sender": sender_id,
                        "mobile": phone,
                        "message": message,
                        "type": "text"
                    }
                    response = await client.post(api_url, data=data)
                
                # Check response
                if response.status_code == 200:
                    result = response.text.strip()
                    logging.info(f"SMS API response: {result}")
                    
                    # Check for success indicators
                    success_indicators = ["success", "sent", "1", "ok", "true", "accepted"]
                    if any(indicator in result.lower() for indicator in success_indicators):
                        return {
                            "success": True, 
                            "response": result,
                            "phone": phone,
                            "sent_at": datetime.now(timezone.utc).isoformat()
                        }
                    else:
                        return {
                            "success": False, 
                            "error": f"رد من مزود SMS: {result}",
                            "note": "تحقق من صحة البيانات أو رصيد الحساب"
                        }
                else:
                    return {
                        "success": False, 
                        "error": f"خطأ HTTP {response.status_code}",
                        "response": response.text[:200]
                    }
            
            except httpx.ConnectError as e:
                logging.error(f"SMS connect error: {e}")
                return {
                    "success": False, 
                    "error": "تعذر الاتصال بخادم SMS",
                    "details": str(e),
                    "suggestions": [
                        "تأكد من صحة رابط API",
                        "تحقق من اتصال الإنترنت",
                        "تواصل مع مزود الخدمة للتحقق من الرابط"
                    ]
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
                "note": "يرجى التواصل مع دعم مزود SMS للحصول على رابط API الصحيح"
            }
        
        return {"success": False, "error": error_msg}


# Test SMS endpoint
@router.post("/sms/test")
async def test_sms_connection():
    """اختبار الاتصال بخادم SMS"""
    sms_settings = await db.system_settings.find_one({"type": "sms"}, {"_id": 0})
    
    if not sms_settings:
        return {"connected": False, "error": "إعدادات SMS غير موجودة"}
    
    api_url = sms_settings.get("api_url", "")
    
    try:
        async with httpx.AsyncClient(timeout=10, verify=False) as client:
            response = await client.get(api_url.replace("/send", "").replace("/SendSMS", ""))
            return {
                "connected": response.status_code < 500,
                "status_code": response.status_code,
                "api_url": api_url
            }
    except Exception as e:
        return {"connected": False, "error": str(e)}


# Note: These routes are defined in server.py for now
# They will be migrated here once the auth dependencies are properly extracted
