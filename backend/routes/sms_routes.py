"""
SMS Routes - مسارات الرسائل النصية
Oman SMS Providers Integration:
- Omantel (via iSmart SMS / D7 Networks)
- SMSala
- SMS.to
- Twilio
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import secrets
import uuid
import httpx
import logging
import os
import urllib.parse
import json

from database import db

router = APIRouter(prefix="/api", tags=["SMS"])


async def send_sms_oman(phone: str, message: str) -> dict:
    """
    إرسال رسالة SMS عبر مزودي خدمة SMS في عُمان
    Supported Providers:
    - ismart: iSmart SMS (Omantel partner)
    - smsala: SMSala
    - smsto: SMS.to
    - d7networks: D7 Networks
    - twilio: Twilio
    """
    try:
        sms_settings = await db.system_settings.find_one({"type": "sms"}, {"_id": 0})
        
        if not sms_settings:
            return {
                "success": False,
                "error": "إعدادات SMS غير موجودة",
                "providers": ["ismart", "smsala", "smsto", "d7networks"],
                "note": "اختر مزود خدمة SMS من القائمة"
            }
        
        provider = sms_settings.get("provider", "ismart")
        api_url = sms_settings.get("api_url", "")
        api_key = sms_settings.get("api_key", "")
        username = sms_settings.get("username", "")
        password = sms_settings.get("password", "")
        sender_id = sms_settings.get("sender_id", "MAROOJ")
        
        # Clean phone number for Oman (+968)
        phone = phone.replace("+", "").replace(" ", "").replace("-", "")
        if phone.startswith("00968"):
            phone = phone[2:]  # Remove 00
        elif phone.startswith("00"):
            phone = phone[2:]
        elif not phone.startswith("968") and len(phone) == 8:
            phone = "968" + phone  # Add Oman code
        
        logging.info(f"Sending SMS to {phone} via {provider}")
        
        async with httpx.AsyncClient(timeout=30, verify=False) as client:
            try:
                result = None
                
                # ============ iSmart SMS (Omantel Partner) ============
                if provider == "ismart":
                    if not api_url:
                        api_url = "https://www.ismartsms.net/aboraborb/sms_http_post_url.aspx"
                    
                    data = {
                        "id": username,
                        "pass": password,
                        "mobile": phone,
                        "msg": message,
                        "sid": sender_id,
                        "type": "0"  # 0=Text, 1=Unicode
                    }
                    response = await client.post(api_url, data=data)
                    result = response.text.strip()
                    
                    # iSmart returns: OK, ERR:xxx
                    if "OK" in result.upper():
                        return {"success": True, "response": result, "provider": "iSmart SMS"}
                    else:
                        return {"success": False, "error": result, "provider": "iSmart SMS"}
                
                # ============ SMSala ============
                elif provider == "smsala":
                    if not api_url:
                        api_url = "https://api.smsala.com/api/SendSMS"
                    
                    params = {
                        "api_id": api_key or username,
                        "api_password": password,
                        "sms_type": "T",  # T=Text
                        "encoding": "T",  # T=Text, U=Unicode
                        "sender_id": sender_id,
                        "phonenumber": phone,
                        "textmessage": message
                    }
                    response = await client.get(api_url, params=params)
                    result = response.text.strip()
                    
                    if "1701" in result or "success" in result.lower():
                        return {"success": True, "response": result, "provider": "SMSala"}
                    else:
                        return {"success": False, "error": result, "provider": "SMSala"}
                
                # ============ SMS.to ============
                elif provider == "smsto":
                    if not api_url:
                        api_url = "https://api.sms.to/sms/send"
                    
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "message": message,
                        "to": phone,
                        "sender_id": sender_id,
                        "bypass_optout": True
                    }
                    response = await client.post(api_url, json=payload, headers=headers)
                    result = response.json() if response.status_code == 200 else response.text
                    
                    if response.status_code == 200:
                        return {"success": True, "response": result, "provider": "SMS.to"}
                    else:
                        return {"success": False, "error": str(result), "provider": "SMS.to"}
                
                # ============ D7 Networks ============
                elif provider == "d7networks":
                    if not api_url:
                        api_url = "https://api.d7networks.com/messages/v1/send"
                    
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "messages": [{
                            "channel": "sms",
                            "recipients": [phone],
                            "content": message,
                            "msg_type": "text",
                            "data_coding": "text"
                        }],
                        "message_globals": {
                            "originator": sender_id,
                            "report_url": ""
                        }
                    }
                    response = await client.post(api_url, json=payload, headers=headers)
                    
                    if response.status_code in [200, 201, 202]:
                        return {"success": True, "response": response.json(), "provider": "D7 Networks"}
                    else:
                        return {"success": False, "error": response.text, "provider": "D7 Networks"}
                
                # ============ Twilio ============
                elif provider == "twilio":
                    account_sid = username
                    auth_token = password
                    if not api_url:
                        api_url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
                    
                    data = {
                        "To": f"+{phone}",
                        "From": sender_id,
                        "Body": message
                    }
                    response = await client.post(
                        api_url, 
                        data=data,
                        auth=(account_sid, auth_token)
                    )
                    
                    if response.status_code in [200, 201]:
                        return {"success": True, "response": response.json(), "provider": "Twilio"}
                    else:
                        return {"success": False, "error": response.text, "provider": "Twilio"}
                
                # ============ Generic HTTP API ============
                else:
                    data = {
                        "username": username,
                        "password": password,
                        "sender": sender_id,
                        "mobile": phone,
                        "message": message
                    }
                    response = await client.post(api_url, data=data)
                    result = response.text.strip()
                    
                    success_indicators = ["success", "sent", "1", "ok", "true", "accepted"]
                    if any(ind in result.lower() for ind in success_indicators):
                        return {"success": True, "response": result}
                    else:
                        return {"success": False, "error": result}
                        
            except httpx.ConnectError as e:
                return {
                    "success": False,
                    "error": "تعذر الاتصال بخادم SMS",
                    "details": str(e),
                    "suggestions": [
                        "تأكد من صحة رابط API",
                        "تحقق من اتصال الإنترنت"
                    ]
                }
            except httpx.TimeoutException:
                return {"success": False, "error": "انتهت مهلة الاتصال"}
                
    except Exception as e:
        logging.error(f"SMS send error: {e}")
        return {"success": False, "error": str(e)}


# Available SMS Providers for Oman
SMS_PROVIDERS = {
    "ismart": {
        "name": "iSmart SMS",
        "name_ar": "آي سمارت SMS",
        "description": "شريك Omantel الرسمي للرسائل النصية",
        "website": "https://ismartsms.net",
        "phone": "+968 24151020",
        "fields": ["username", "password", "sender_id"],
        "default_url": "https://www.ismartsms.net/aboraborb/sms_http_post_url.aspx"
    },
    "smsala": {
        "name": "SMSala",
        "name_ar": "إس إم إس علا",
        "description": "خدمة رسائل نصية بأسعار تنافسية",
        "website": "https://smsala.com",
        "fields": ["api_key", "password", "sender_id"],
        "default_url": "https://api.smsala.com/api/SendSMS"
    },
    "smsto": {
        "name": "SMS.to",
        "name_ar": "SMS.to",
        "description": "بوابة SMS عالمية",
        "website": "https://sms.to",
        "fields": ["api_key", "sender_id"],
        "default_url": "https://api.sms.to/sms/send"
    },
    "d7networks": {
        "name": "D7 Networks",
        "name_ar": "D7 نتوركس",
        "description": "منصة اتصالات سحابية",
        "website": "https://d7networks.com",
        "fields": ["api_key", "sender_id"],
        "default_url": "https://api.d7networks.com/messages/v1/send"
    },
    "twilio": {
        "name": "Twilio",
        "name_ar": "تويليو",
        "description": "منصة اتصالات عالمية",
        "website": "https://twilio.com",
        "fields": ["username", "password", "sender_id"],
        "note": "username = Account SID, password = Auth Token"
    }
}


@router.get("/sms/providers")
async def get_sms_providers():
    """Get list of available SMS providers for Oman"""
    return {
        "providers": SMS_PROVIDERS,
        "recommended": "ismart",
        "note": "iSmart SMS هو الشريك الرسمي لـ Omantel"
    }


# Test SMS endpoint
@router.post("/sms/test")
async def test_sms_connection():
    """اختبار الاتصال بخادم SMS"""
    sms_settings = await db.system_settings.find_one({"type": "sms"}, {"_id": 0})
    
    if not sms_settings:
        return {
            "connected": False, 
            "error": "إعدادات SMS غير موجودة",
            "providers": list(SMS_PROVIDERS.keys())
        }
    
    provider = sms_settings.get("provider", "ismart")
    api_url = sms_settings.get("api_url", "")
    
    if not api_url and provider in SMS_PROVIDERS:
        api_url = SMS_PROVIDERS[provider].get("default_url", "")
    
    try:
        async with httpx.AsyncClient(timeout=10, verify=False) as client:
            # Just check if the host is reachable
            test_url = api_url.split("/api")[0] if "/api" in api_url else api_url.rsplit("/", 1)[0]
            response = await client.get(test_url)
            return {
                "connected": response.status_code < 500,
                "status_code": response.status_code,
                "provider": provider,
                "api_url": api_url
            }
    except Exception as e:
        return {"connected": False, "error": str(e), "provider": provider}


# Note: These routes are defined in server.py for now
# They will be migrated here once the auth dependencies are properly extracted
