"""
Auth Routes - مسارات المصادقة
"""
from fastapi import APIRouter, HTTPException, Depends, Form
from typing import List
from datetime import datetime, timezone, timedelta
import secrets
import os
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from database import db
from config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL
from auth import hash_password, verify_password, create_access_token, get_current_user, log_activity
from models.all_models import (
    UserCreate, UserUpdate, PasswordChange, User, UserLogin, Token,
    PasswordResetToken, CollectionCenter, CollectionCenterCreate
)

router = APIRouter(prefix="/api", tags=["Auth"])

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
        import logging
        logging.error(f"Error sending email: {e}")
        return False


async def send_password_reset_email(email: str, token: str, full_name: str):
    """Send password reset email"""
    reset_link = f"{os.environ.get('FRONTEND_URL', 'https://milk-manager-17.preview.emergentagent.com')}/reset-password?token={token}"
    
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


@router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    user = User(**user_data.model_dump(exclude={"password"}))
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    
    token = create_access_token({"sub": user.id, "role": user.role})
    return Token(
        access_token=token,
        token_type="bearer",
        user={"id": user.id, "username": user.username, "email": user.email, "full_name": user.full_name, "role": user.role}
    )


@router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    import logging
    user = await db.users.find_one({"username": credentials.username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if not verify_password(credentials.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    # Get user permissions from user_permissions table
    user_permissions = []
    employee_id = user.get("employee_id")
    logging.info(f"Login: user={credentials.username}, employee_id={employee_id}")
    
    if employee_id:
        granted_permissions = await db.user_permissions.find(
            {"employee_id": employee_id, "is_active": True},
            {"_id": 0, "permission": 1}
        ).to_list(100)
        user_permissions = [g["permission"] for g in granted_permissions]
        logging.info(f"Login: granted_permissions count={len(granted_permissions)}, permissions={user_permissions}")
    
    # Also get permissions from hr_employees if linked
    if employee_id:
        employee = await db.hr_employees.find_one({"id": employee_id}, {"_id": 0, "permissions": 1, "department": 1})
        if employee:
            # Add permissions from employee record
            user_permissions.extend(employee.get("permissions", []))
            user["department"] = employee.get("department")
    
    # Remove duplicates
    user_permissions = list(set(user_permissions))
    logging.info(f"Login: final permissions={user_permissions}")
    
    # Log login activity
    await log_activity(
        user_id=user["id"],
        user_name=user["full_name"],
        action="login",
        details="تسجيل دخول",
        center_id=user.get("center_id"),
        center_name=user.get("center_name")
    )
    
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return Token(
        access_token=token,
        token_type="bearer",
        user={
            "id": user["id"], 
            "username": user["username"], 
            "email": user["email"], 
            "full_name": user["full_name"], 
            "role": user["role"],
            "center_id": user.get("center_id"),
            "center_name": user.get("center_name"),
            "phone": user.get("phone"),
            "avatar_url": user.get("avatar_url"),
            "department": user.get("department"),
            "employee_id": employee_id,
            "permissions": user_permissions
        }
    )


@router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


@router.put("/auth/profile")
async def update_profile(profile_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    if update_dict:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_dict})
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return updated_user


@router.put("/auth/password")
async def change_password(password_data: PasswordChange, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]})
    if not verify_password(password_data.current_password, user.get("password", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_password_hash = hash_password(password_data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password": new_password_hash}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="change_password",
        details="تغيير كلمة المرور"
    )
    
    return {"message": "Password changed successfully"}


@router.post("/auth/forgot-password")
async def forgot_password(email: str = Form(...)):
    """Request password reset"""
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        return {"message": "If an account exists with this email, a reset link has been sent"}
    
    # Generate reset token
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    
    reset_token = PasswordResetToken(
        user_id=user["id"],
        email=email,
        token=token,
        expires_at=expires_at
    )
    
    # Invalidate any existing tokens for this user
    await db.password_reset_tokens.update_many(
        {"user_id": user["id"], "used": False},
        {"$set": {"used": True}}
    )
    
    # Save new token
    await db.password_reset_tokens.insert_one(reset_token.model_dump())
    
    # Send email
    email_sent = await send_password_reset_email(email, token, user["full_name"])
    
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send reset email. Please try again later.")
    
    return {"message": "If an account exists with this email, a reset link has been sent"}


@router.post("/auth/reset-password")
async def reset_password(token: str = Form(...), new_password: str = Form(...)):
    """Reset password using token"""
    reset_token = await db.password_reset_tokens.find_one(
        {"token": token, "used": False},
        {"_id": 0}
    )
    
    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if token is expired
    expires_at = datetime.fromisoformat(reset_token["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update password
    new_password_hash = hash_password(new_password)
    await db.users.update_one(
        {"id": reset_token["user_id"]},
        {"$set": {"password": new_password_hash}}
    )
    
    # Mark token as used
    await db.password_reset_tokens.update_one(
        {"token": token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}


@router.get("/auth/verify-reset-token")
async def verify_reset_token(token: str):
    """Verify if reset token is valid"""
    reset_token = await db.password_reset_tokens.find_one(
        {"token": token, "used": False},
        {"_id": 0}
    )
    
    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    expires_at = datetime.fromisoformat(reset_token["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    return {"valid": True, "email": reset_token["email"]}


# ==================== CENTERS ROUTES ====================

@router.get("/centers", response_model=List[CollectionCenter])
async def get_centers(current_user: dict = Depends(get_current_user)):
    centers = await db.collection_centers.find({"is_active": True}, {"_id": 0}).to_list(100)
    return centers


@router.post("/centers", response_model=CollectionCenter)
async def create_center(center_data: CollectionCenterCreate, current_user: dict = Depends(get_current_user)):
    # Check admin role
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await db.collection_centers.find_one({"code": center_data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Center with this code already exists")
    
    center = CollectionCenter(**center_data.model_dump())
    await db.collection_centers.insert_one(center.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_center",
        entity_type="center",
        entity_id=center.id,
        entity_name=center.name
    )
    
    return center


@router.put("/centers/{center_id}", response_model=CollectionCenter)
async def update_center(center_id: str, center_data: CollectionCenterCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await db.collection_centers.find_one({"id": center_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Center not found")
    
    await db.collection_centers.update_one(
        {"id": center_id},
        {"$set": center_data.model_dump()}
    )
    
    updated = await db.collection_centers.find_one({"id": center_id}, {"_id": 0})
    return updated


@router.delete("/centers/{center_id}")
async def delete_center(center_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await db.collection_centers.find_one({"id": center_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Center not found")
    
    # Check for linked suppliers or milk receptions
    suppliers_count = await db.suppliers.count_documents({"center_id": center_id})
    if suppliers_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"لا يمكن حذف المركز - يوجد {suppliers_count} موردين مرتبطين به"
        )
    
    await db.collection_centers.delete_one({"id": center_id})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="delete_center",
        entity_type="center",
        entity_id=center_id,
        entity_name=existing.get("name")
    )
    
    return {"message": "Center deleted successfully"}


# ==================== ACTIVITY LOGS ====================

@router.get("/activity-logs")
async def get_activity_logs(
    limit: int = 50,
    entity_type: str = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs
