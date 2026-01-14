"""
Permissions Routes - مسارات الصلاحيات
نظام صلاحيات هرمي للأقسام والموظفين
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timezone
from database import db
from models.all_models import (
    DEPARTMENTS, 
    AVAILABLE_PERMISSIONS, 
    UserPermissionGrant
)
from routes.base import get_current_user, require_role, log_activity

router = APIRouter(prefix="/permissions", tags=["Permissions"])

# الصلاحيات الافتراضية لكل قسم
DEFAULT_DEPARTMENT_PERMISSIONS = {
    "الموارد البشرية": [
        "hr_employees_view", "hr_employees_edit", 
        "hr_attendance_view", "hr_attendance_edit",
        "hr_leaves_view", "hr_leaves_approve",
        "hr_payroll_view", "hr_payroll_edit", "hr_payroll_approve_hr",
        "reports_view", "reports_operational"
    ],
    "المالية": [
        "treasury_view", "treasury_transactions",
        "suppliers_payment", "customers_receipt",
        "hr_payroll_view", "hr_payroll_approve_finance",
        "reports_view", "reports_financial", "reports_export"
    ],
    "المشتريات والمبيعات": [
        "suppliers_view", "suppliers_create", "suppliers_edit",
        "customers_view", "customers_create", "customers_edit",
        "sales_view", "sales_create", "sales_edit",
        "purchases_view", "purchases_create", "purchases_edit", "purchases_approve",
        "inventory_view", "reports_view"
    ],
    "العمليات": [
        "milk_reception_view", "milk_reception_create", "milk_reception_edit",
        "operations_view", "operations_edit", "operations_reports",
        "suppliers_view", "inventory_view", "inventory_edit",
        "reports_view", "reports_operational"
    ],
    "المشاريع": [
        "projects_view", "projects_create", "projects_edit", "projects_delete",
        "reports_view", "reports_operational"
    ],
    "التسويق": [
        "customers_view", "reports_view"
    ],
    "القانون": [
        "legal_contracts_view", "legal_contracts_create", "legal_contracts_edit",
        "legal_cases_view", "legal_cases_create", "legal_cases_edit",
        "reports_view", "hr_employees_view"
    ],
    "تقنية المعلومات": [
        "settings_view", "settings_edit", "users_manage", "permissions_grant",
        "reports_view", "reports_export"
    ],
    "الإدارة العامة": [
        "hr_payroll_approve_gm", "permissions_grant",
        "reports_view", "reports_financial", "reports_operational", "reports_export"
    ]
}


@router.get("/departments")
async def get_departments(current_user: dict = Depends(get_current_user)):
    """الحصول على قائمة الأقسام"""
    return {"departments": DEPARTMENTS}


@router.get("/available")
async def get_available_permissions(current_user: dict = Depends(get_current_user)):
    """الحصول على قائمة الصلاحيات المتاحة"""
    # تجميع الصلاحيات حسب الفئة
    categories = {
        "استلام الحليب": [p for p in AVAILABLE_PERMISSIONS if p.startswith("milk_")],
        "الموردين": [p for p in AVAILABLE_PERMISSIONS if p.startswith("suppliers_")],
        "العملاء": [p for p in AVAILABLE_PERMISSIONS if p.startswith("customers_")],
        "المبيعات": [p for p in AVAILABLE_PERMISSIONS if p.startswith("sales_")],
        "التقارير": [p for p in AVAILABLE_PERMISSIONS if p.startswith("reports_")],
        "الموارد البشرية": [p for p in AVAILABLE_PERMISSIONS if p.startswith("hr_")],
        "المخزون": [p for p in AVAILABLE_PERMISSIONS if p.startswith("inventory_")],
        "الخزينة": [p for p in AVAILABLE_PERMISSIONS if p.startswith("treasury_")],
        "القانون": [p for p in AVAILABLE_PERMISSIONS if p.startswith("legal_")],
        "المشاريع": [p for p in AVAILABLE_PERMISSIONS if p.startswith("projects_")],
        "العمليات": [p for p in AVAILABLE_PERMISSIONS if p.startswith("operations_")],
        "المشتريات": [p for p in AVAILABLE_PERMISSIONS if p.startswith("purchases_")],
        "إدارة المخازن": [p for p in AVAILABLE_PERMISSIONS if p.startswith("warehouse_")],
        "النظام": [p for p in AVAILABLE_PERMISSIONS if p.startswith("settings_") or p.startswith("users_") or p.startswith("permissions_")],
    }
    return {"permissions": AVAILABLE_PERMISSIONS, "categories": categories}


@router.get("/department/{department}")
async def get_department_permissions(department: str, current_user: dict = Depends(get_current_user)):
    """الحصول على صلاحيات قسم معين"""
    if department not in DEPARTMENTS:
        raise HTTPException(status_code=404, detail="القسم غير موجود")
    
    permissions = DEFAULT_DEPARTMENT_PERMISSIONS.get(department, [])
    return {"department": department, "permissions": permissions}


@router.get("/user/{employee_id}")
async def get_user_permissions(employee_id: str, current_user: dict = Depends(get_current_user)):
    """الحصول على صلاحيات موظف معين"""
    employee = await db.hr_employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    
    # الصلاحيات من الدور
    role_permissions = []
    role = employee.get("role", "employee")
    department = employee.get("department", "")
    position = employee.get("position", "")
    
    # المدير العام له كل الصلاحيات
    if "المدير العام" in position or role == "admin":
        role_permissions = AVAILABLE_PERMISSIONS.copy()
    # مدير القسم له صلاحيات قسمه + منح الصلاحيات
    elif "مدير" in position:
        role_permissions = DEFAULT_DEPARTMENT_PERMISSIONS.get(department, []).copy()
        role_permissions.append("permissions_grant")
    # المشرف له صلاحيات محدودة
    elif "مشرف" in position:
        dept_perms = DEFAULT_DEPARTMENT_PERMISSIONS.get(department, [])
        # المشرف يحصل على صلاحيات العرض والإنشاء فقط (بدون الحذف والإعدادات)
        role_permissions = [p for p in dept_perms if "view" in p or "create" in p]
    else:
        # الموظف العادي - صلاحيات محدودة جداً
        role_permissions = [p for p in DEFAULT_DEPARTMENT_PERMISSIONS.get(department, []) if "view" in p]
    
    # الصلاحيات الممنوحة خصيصاً
    granted_permissions = await db.user_permissions.find(
        {"employee_id": employee_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    granted_list = [g["permission"] for g in granted_permissions]
    
    # DEBUG
    import logging
    logging.info(f"Employee {employee_id}: DB grants = {granted_permissions}, granted_list = {granted_list}")
    
    # الصلاحيات المحظورة
    denied_permissions = employee.get("denied_permissions", [])
    
    # دمج الصلاحيات مع استثناء المحظورة
    all_permissions = list(set(role_permissions + granted_list) - set(denied_permissions))
    
    return {
        "employee_id": employee_id,
        "employee_name": employee.get("name"),
        "role": role,
        "department": department,
        "position": position,
        "role_permissions": role_permissions,
        "granted_permissions": granted_list,
        "denied_permissions": denied_permissions,
        "all_permissions": all_permissions
    }


@router.post("/grant")
async def grant_permission(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """منح صلاحية لموظف"""
    employee_id = data.get("employee_id")
    permission = data.get("permission")
    expires_at = data.get("expires_at")
    
    if not employee_id or not permission:
        raise HTTPException(status_code=400, detail="يرجى تحديد الموظف والصلاحية")
    
    if permission not in AVAILABLE_PERMISSIONS:
        raise HTTPException(status_code=400, detail="صلاحية غير صالحة")
    
    # التحقق من أن المستخدم الحالي لديه صلاحية منح الصلاحيات
    user_perms = await get_user_permissions_helper(current_user["id"])
    if "permissions_grant" not in user_perms and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية منح الصلاحيات")
    
    # الحصول على بيانات الموظف
    employee = await db.hr_employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    
    # التحقق من عدم وجود نفس الصلاحية
    existing = await db.user_permissions.find_one({
        "employee_id": employee_id, 
        "permission": permission,
        "is_active": True
    })
    if existing:
        raise HTTPException(status_code=400, detail="الصلاحية ممنوحة مسبقاً")
    
    # إنشاء سجل الصلاحية
    grant = UserPermissionGrant(
        employee_id=employee_id,
        employee_name=employee.get("name", ""),
        permission=permission,
        granted_by=current_user["id"],
        granted_by_name=current_user.get("full_name", ""),
        expires_at=expires_at
    )
    
    await db.user_permissions.insert_one(grant.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user.get("full_name", ""),
        action="grant_permission",
        entity_type="permission",
        entity_id=grant.id,
        entity_name=f"{employee.get('name')} - {permission}",
        details=f"منح صلاحية {permission} للموظف {employee.get('name')}"
    )
    
    return {"message": "تم منح الصلاحية بنجاح", "grant": grant.model_dump()}


@router.delete("/revoke/{grant_id}")
async def revoke_permission(grant_id: str, current_user: dict = Depends(get_current_user)):
    """إلغاء صلاحية ممنوحة"""
    # التحقق من صلاحية المستخدم
    user_perms = await get_user_permissions_helper(current_user["id"])
    if "permissions_grant" not in user_perms and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية إلغاء الصلاحيات")
    
    grant = await db.user_permissions.find_one({"id": grant_id}, {"_id": 0})
    if not grant:
        raise HTTPException(status_code=404, detail="الصلاحية غير موجودة")
    
    await db.user_permissions.update_one(
        {"id": grant_id},
        {"$set": {"is_active": False}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user.get("full_name", ""),
        action="revoke_permission",
        entity_type="permission",
        entity_id=grant_id,
        entity_name=f"{grant.get('employee_name')} - {grant.get('permission')}",
        details=f"إلغاء صلاحية {grant.get('permission')} من الموظف {grant.get('employee_name')}"
    )
    
    return {"message": "تم إلغاء الصلاحية بنجاح"}


@router.post("/deny/{employee_id}")
async def deny_permission(
    employee_id: str,
    permission: str,
    current_user: dict = Depends(get_current_user)
):
    """حظر صلاحية معينة من موظف (حتى لو كانت من القسم)"""
    # التحقق من صلاحية المستخدم
    user_perms = await get_user_permissions_helper(current_user["id"])
    if "permissions_grant" not in user_perms and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية تعديل الصلاحيات")
    
    employee = await db.hr_employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    
    # إضافة الصلاحية إلى قائمة الصلاحيات المحظورة
    denied_permissions = employee.get("denied_permissions", [])
    if permission not in denied_permissions:
        denied_permissions.append(permission)
        await db.hr_employees.update_one(
            {"id": employee_id},
            {"$set": {"denied_permissions": denied_permissions}}
        )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user.get("full_name", ""),
        action="deny_permission",
        entity_type="permission",
        entity_id=employee_id,
        entity_name=f"{employee.get('name')} - {permission}",
        details=f"حظر صلاحية {permission} من الموظف {employee.get('name')}"
    )
    
    return {"message": "تم حظر الصلاحية بنجاح"}


@router.delete("/deny/{employee_id}/{permission}")
async def remove_permission_denial(
    employee_id: str,
    permission: str,
    current_user: dict = Depends(get_current_user)
):
    """إزالة حظر صلاحية معينة"""
    user_perms = await get_user_permissions_helper(current_user["id"])
    if "permissions_grant" not in user_perms and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية تعديل الصلاحيات")
    
    employee = await db.hr_employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    
    denied_permissions = employee.get("denied_permissions", [])
    if permission in denied_permissions:
        denied_permissions.remove(permission)
        await db.hr_employees.update_one(
            {"id": employee_id},
            {"$set": {"denied_permissions": denied_permissions}}
        )
    
    return {"message": "تم إزالة حظر الصلاحية"}


@router.get("/check/{permission}")
async def check_permission(permission: str, current_user: dict = Depends(get_current_user)):
    """التحقق من صلاحية المستخدم الحالي"""
    user_perms = await get_user_permissions_helper(current_user["id"])
    has_permission = permission in user_perms or current_user.get("role") == "admin"
    return {"permission": permission, "has_permission": has_permission}


async def get_user_permissions_helper(user_id: str) -> List[str]:
    """Helper function to get user permissions"""
    employee = await db.hr_employees.find_one({"id": user_id}, {"_id": 0})
    if not employee:
        return []
    
    role = employee.get("role", "employee")
    department = employee.get("department", "")
    position = employee.get("position", "")
    
    role_permissions = []
    
    if "المدير العام" in position or role == "admin":
        role_permissions = AVAILABLE_PERMISSIONS.copy()
    elif "مدير" in position:
        role_permissions = DEFAULT_DEPARTMENT_PERMISSIONS.get(department, []).copy()
        role_permissions.append("permissions_grant")
    elif "مشرف" in position:
        dept_perms = DEFAULT_DEPARTMENT_PERMISSIONS.get(department, [])
        role_permissions = [p for p in dept_perms if "view" in p or "create" in p]
    else:
        role_permissions = [p for p in DEFAULT_DEPARTMENT_PERMISSIONS.get(department, []) if "view" in p]
    
    # الصلاحيات الممنوحة
    granted = await db.user_permissions.find(
        {"employee_id": user_id, "is_active": True},
        {"_id": 0, "permission": 1}
    ).to_list(100)
    
    granted_list = [g["permission"] for g in granted]
    
    return list(set(role_permissions + granted_list))
