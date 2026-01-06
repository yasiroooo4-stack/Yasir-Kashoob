"""
Utility Functions - الأدوات المساعدة المشتركة
"""
import os
import logging
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone

from config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL

SMTP_USE_SSL = os.environ.get('SMTP_USE_SSL', 'false').lower() == 'true'


async def send_email(to_email: str, subject: str, html_content: str):
    """Send email using SMTP"""
    try:
        message = MIMEMultipart("alternative")
        message["From"] = SMTP_FROM_EMAIL
        message["To"] = to_email
        message["Subject"] = subject
        
        html_part = MIMEText(html_content, "html", "utf-8")
        message.attach(html_part)
        
        if SMTP_USE_SSL or SMTP_PORT == 465:
            await aiosmtplib.send(
                message,
                hostname=SMTP_HOST,
                port=SMTP_PORT,
                username=SMTP_USER,
                password=SMTP_PASSWORD,
                use_tls=True
            )
        else:
            await aiosmtplib.send(
                message,
                hostname=SMTP_HOST,
                port=SMTP_PORT,
                username=SMTP_USER,
                password=SMTP_PASSWORD,
                start_tls=True
            )
        return True
    except Exception as e:
        logging.error(f"Error sending email: {e}")
        return False


def calculate_work_hours(check_in: str, check_out: str) -> tuple:
    """Calculate total work hours and overtime hours"""
    try:
        check_in_time = datetime.strptime(check_in, "%H:%M")
        check_out_time = datetime.strptime(check_out, "%H:%M")
        
        # Handle overnight shifts
        if check_out_time < check_in_time:
            check_out_time = check_out_time.replace(day=check_out_time.day + 1)
        
        total_minutes = (check_out_time - check_in_time).seconds // 60
        total_hours = total_minutes / 60
        
        # Standard work is 8 hours
        overtime_hours = max(0, total_hours - 8)
        
        return round(total_hours, 2), round(overtime_hours, 2)
    except Exception as e:
        logging.error(f"Error calculating work hours: {e}")
        return 0.0, 0.0


# System background images
SYSTEM_BACKGROUNDS = [
    {"id": "bg1", "url": "https://customer-assets.emergentagent.com/job_agrodairy/artifacts/368sq9v2_12.jpg", "name": "خلفية 1"},
    {"id": "bg2", "url": "https://customer-assets.emergentagent.com/job_agrodairy/artifacts/41nbrw0w_2.jpg", "name": "خلفية 2"},
    {"id": "bg3", "url": "https://customer-assets.emergentagent.com/job_agrodairy/artifacts/ftlid6jo_4.jpg", "name": "خلفية 3"},
    {"id": "bg4", "url": "https://customer-assets.emergentagent.com/job_agrodairy/artifacts/o1tpk5s2_6.jpg", "name": "خلفية 4"},
    {"id": "bg5", "url": "https://customer-assets.emergentagent.com/job_agrodairy/artifacts/roy1cp0e_10.jpg", "name": "خلفية 5"},
]


# Department permissions mapping
DEPARTMENT_PERMISSIONS = {
    "admin": ["all"],
    "purchasing": ["suppliers", "feed", "payments"],
    "finance": ["payments", "treasury", "reports"],
    "milk_reception": ["milk_receptions", "suppliers", "inventory"],
    "hr": ["employees", "attendance", "leave", "expense"],
    "it": ["users", "devices", "settings"],
    "sales": ["customers", "sales", "marketing"],
    "legal": ["contracts", "cases", "consultations"],
    "operations": ["daily_operations", "equipment", "maintenance", "vehicles"],
    "projects": ["projects", "tasks", "milestones"]
}


AVAILABLE_PERMISSIONS = [
    "suppliers", "milk_receptions", "customers", "sales", "inventory",
    "payments", "treasury", "reports", "employees", "attendance",
    "leave", "expense", "users", "devices", "settings",
    "feed", "marketing", "legal", "operations", "projects"
]
