"""
Base utilities for routes - الأدوات الأساسية للمسارات
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import os
import logging
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from database import db
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_HOURS, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL

security = HTTPBearer()
SMTP_USE_SSL = os.environ.get('SMTP_USE_SSL', 'false').lower() == 'true'


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker


async def log_activity(user_id: str, user_name: str, action: str, entity_type: str = None, 
                       entity_id: str = None, entity_name: str = None, details: str = None,
                       center_id: str = None, center_name: str = None):
    from models.all_models import ActivityLog
    activity = ActivityLog(
        user_id=user_id,
        user_name=user_name,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        details=details,
        center_id=center_id,
        center_name=center_name
    )
    await db.activity_logs.insert_one(activity.model_dump())


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


async def update_treasury(transaction_type: str, amount: float, source_type: str, description: str, 
                         source_id: str = None, user_id: str = None, user_name: str = None):
    """Update treasury balance and create transaction record"""
    from models.all_models import TreasuryTransaction
    
    # Get current balance
    treasury = await db.treasury.find_one({}, {"_id": 0})
    current_balance = treasury.get("current_balance", 0) if treasury else 0
    
    # Calculate new balance
    if transaction_type == "deposit":
        new_balance = current_balance + amount
    else:  # withdrawal
        new_balance = current_balance - amount
    
    # Create transaction
    transaction = TreasuryTransaction(
        transaction_type=transaction_type,
        amount=amount,
        source_type=source_type,
        source_id=source_id,
        description=description,
        balance_after=new_balance,
        created_by=user_id,
        created_by_name=user_name
    )
    
    await db.treasury_transactions.insert_one(transaction.model_dump())
    
    # Update treasury balance
    await db.treasury.update_one(
        {},
        {
            "$set": {
                "current_balance": new_balance,
                "last_updated": datetime.now(timezone.utc).isoformat()
            },
            "$inc": {
                "total_deposits" if transaction_type == "deposit" else "total_withdrawals": amount
            }
        },
        upsert=True
    )
    
    return new_balance
