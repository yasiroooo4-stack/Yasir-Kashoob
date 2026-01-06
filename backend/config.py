"""
Application Configuration - إعدادات التطبيق
"""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# JWT Configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'milk-erp-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Email Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'mail.almoroojdairy.om')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL', 'noreply@almoroojdairy.om')

# Default collection centers (مراكز التجميع الافتراضية)
DEFAULT_CENTERS = [
    {"name": "حجيف", "code": "HAJIF", "address": "عُمان", "is_active": True},
    {"name": "زيك", "code": "ZEEK", "address": "عُمان", "is_active": True},
    {"name": "غدو", "code": "GHADU", "address": "عُمان", "is_active": True},
]
