"""
Milk Collection Center ERP - Main Server
نظام ERP لمركز تجميع الحليب - الخادم الرئيسي

This is the refactored version with modular imports
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path

# Core imports
from database import db, client
from config import DEFAULT_CENTERS, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_HOURS
from config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL

# Route base utilities
from routes.base import (
    security, hash_password, verify_password, create_access_token,
    get_current_user, require_role, log_activity, send_email, update_treasury
)

# Import all models
from models.all_models import *

# Additional imports needed by routes
from typing import List, Optional
from enum import Enum
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import io
import secrets
import aiosmtplib
import httpx
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Try to import LLM chat, but don't fail if not available
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    logging.warning("emergentintegrations not available - AI features disabled")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="Milk Collection Center ERP")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Email config
SMTP_USE_SSL = os.environ.get('SMTP_USE_SSL', 'false').lower() == 'true'

@app.on_event("startup")
async def startup_event():
    """Initialize default collection centers on startup"""
    try:
        for center_data in DEFAULT_CENTERS:
            existing = await db.collection_centers.find_one({"code": center_data["code"]})
            if not existing:
                center = CollectionCenter(**center_data)
                await db.collection_centers.insert_one(center.model_dump())
                logging.info(f"Created default center: {center_data['name']}")
            else:
                logging.info(f"Center already exists: {center_data['name']}")
    except Exception as e:
        logging.error(f"Error initializing default centers: {e}")


# ==================== EMAIL HELPER ====================

async def send_password_reset_email(email: str, token: str, full_name: str):
    """Send password reset email"""
    reset_link = f"{os.environ.get('FRONTEND_URL', 'https://dairymanage-erp.preview.emergentagent.com')}/reset-password?token={token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #8B4513, #D2691E); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #8B4513; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>المروج للألبان</h1>
            </div>
            <div class="content">
                <h2>مرحباً {full_name}</h2>
                <p>تم طلب استرجاع كلمة المرور لحسابك في نظام المروج للألبان.</p>
                <p>اضغط على الزر أدناه لإعادة تعيين كلمة المرور:</p>
                <p style="text-align: center;">
                    <a href="{reset_link}" class="button">إعادة تعيين كلمة المرور</a>
                </p>
                <p><strong>ملاحظة:</strong> هذا الرابط صالح لمدة ساعة واحدة فقط.</p>
                <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.</p>
            </div>
            <div class="footer">
                <p>© 2025 المروج للألبان - جميع الحقوق محفوظة</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(email, "إعادة تعيين كلمة المرور - المروج للألبان", html_content)


# ==================== WORK HOURS HELPER ====================

def calculate_work_hours(check_in: str, check_out: str) -> tuple:
    """Calculate total work hours and overtime hours"""
    try:
        check_in_time = datetime.strptime(check_in, "%H:%M")
        check_out_time = datetime.strptime(check_out, "%H:%M")
        
        if check_out_time < check_in_time:
            check_out_time = check_out_time.replace(day=check_out_time.day + 1)
        
        total_minutes = (check_out_time - check_in_time).seconds // 60
        total_hours = total_minutes / 60
        overtime_hours = max(0, total_hours - 8)
        
        return round(total_hours, 2), round(overtime_hours, 2)
    except Exception as e:
        logging.error(f"Error calculating work hours: {e}")
        return 0.0, 0.0


# ==================== EMPLOYEE WORK LOCATION HELPER ====================

async def get_employee_work_location(employee_id: str) -> str:
    """Get employee work location"""
    employee = await db.hr_employees.find_one({"id": employee_id}, {"_id": 0, "work_location": 1})
    return employee.get("work_location", "غير محدد") if employee else "غير محدد"


