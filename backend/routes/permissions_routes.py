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
        "لوحة التحكم": [p for p in AVAILABLE_PERMISSIONS if p.startswith("dashboard_")],
        "التحليلات": [p for p in AVAILABLE_PERMISSIONS if p.startswith("analysis_")],
        "التقارير": [p for p in AVAILABLE_PERMISSIONS if p.startswith("reports_")],
        "استلام الحليب": [p for p in AVAILABLE_PERMISSIONS if p.startswith("milk_")],
        "الموردين": [p for p in AVAILABLE_PERMISSIONS if p.startswith("suppliers_")],
        "بوابة الموردين": [p for p in AVAILABLE_PERMISSIONS if p.startswith("supplier_portal_")],
        "العملاء": [p for p in AVAILABLE_PERMISSIONS if p.startswith("customers_")],
        "المبيعات": [p for p in AVAILABLE_PERMISSIONS if p.startswith("sales_")],
        "الموارد البشرية": [p for p in AVAILABLE_PERMISSIONS if p.startswith("hr_")],
        "المخزون": [p for p in AVAILABLE_PERMISSIONS if p.startswith("inventory_")],
        "الخزينة": [p for p in AVAILABLE_PERMISSIONS if p.startswith("treasury_")],
        "المالية": [p for p in AVAILABLE_PERMISSIONS if p.startswith("finance_")],
        "القانون": [p for p in AVAILABLE_PERMISSIONS if p.startswith("legal_")],
        "المشاريع": [p for p in AVAILABLE_PERMISSIONS if p.startswith("projects_")],
        "العمليات": [p for p in AVAILABLE_PERMISSIONS if p.startswith("operations_")],
        "المشتريات": [p for p in AVAILABLE_PERMISSIONS if p.startswith("purchases_")],
        "التسويق": [p for p in AVAILABLE_PERMISSIONS if p.startswith("marketing_")],
        "إدارة المخازن": [p for p in AVAILABLE_PERMISSIONS if p.startswith("warehouse_")],
        "الموافقات": [p for p in AVAILABLE_PERMISSIONS if p.startswith("approvals_")],
        "المهام": [p for p in AVAILABLE_PERMISSIONS if p.startswith("tasks_")],
        "النظام": [p for p in AVAILABLE_PERMISSIONS if p.startswith("settings_") or p.startswith("users_") or p.startswith("permissions_")],
    }
    
    # Sort permissions within each category for better display
    for key in categories:
        categories[key] = sorted(categories[key])
    
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
    
    # لا توجد صلاحيات تلقائية - فقط الصلاحيات الممنوحة يدوياً
    role_permissions = []
    role = employee.get("role", "employee")
    department = employee.get("department", "")
    position = employee.get("position", "")
    
    # الصلاحيات الممنوحة خصيصاً من جدول user_permissions
    granted_permissions = await db.user_permissions.find(
        {"employee_id": employee_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    granted_list = [g["permission"] for g in granted_permissions]
    
    # إعداد قائمة الصلاحيات مع الـ ID للإلغاء
    permission_grants = [{"id": g["id"], "permission": g["permission"]} for g in granted_permissions]
    
    # DEBUG
    import logging
    logging.info(f"Employee {employee_id}: DB grants = {len(granted_permissions)}, granted_list = {len(granted_list)}")
    
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
        "permission_grants": permission_grants,
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


@router.post("/sync")
async def sync_permissions(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """مزامنة صلاحيات الموظف من صفحة الموارد البشرية"""
    employee_id = data.get("employee_id")
    new_permissions = data.get("permissions", [])
    
    # التحقق من صلاحية المستخدم
    user_perms = await get_user_permissions_helper(current_user["id"])
    if "permissions_grant" not in user_perms and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية تعديل الصلاحيات")
    
    employee = await db.hr_employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    
    # الحصول على الصلاحيات الممنوحة الحالية
    current_grants = await db.user_permissions.find(
        {"employee_id": employee_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    current_permissions = [g["permission"] for g in current_grants]
    
    # تحديد الصلاحيات التي يجب إضافتها والتي يجب إلغاؤها
    permissions_to_add = [p for p in new_permissions if p not in current_permissions]
    permissions_to_remove = [p for p in current_permissions if p not in new_permissions]
    
    # إضافة الصلاحيات الجديدة
    import uuid
    for permission in permissions_to_add:
        grant = UserPermissionGrant(
            id=str(uuid.uuid4()),
            employee_id=employee_id,
            employee_name=employee.get("name"),
            permission=permission,
            granted_by=current_user["id"],
            granted_by_name=current_user.get("full_name", ""),
            granted_at=datetime.now(timezone.utc).isoformat(),
            is_active=True
        )
        await db.user_permissions.insert_one(grant.model_dump())
    
    # إلغاء الصلاحيات المحذوفة
    for permission in permissions_to_remove:
        await db.user_permissions.update_many(
            {"employee_id": employee_id, "permission": permission, "is_active": True},
            {"$set": {"is_active": False}}
        )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user.get("full_name", ""),
        action="sync_permissions",
        entity_type="permission",
        entity_id=employee_id,
        entity_name=employee.get("name"),
        details=f"مزامنة صلاحيات الموظف: +{len(permissions_to_add)} / -{len(permissions_to_remove)}"
    )
    
    return {
        "message": "تم مزامنة الصلاحيات بنجاح",
        "added": permissions_to_add,
        "removed": permissions_to_remove
    }


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
    
    # صلاحيات إدارة النظام - فقط لمن لديه role: admin
    SYSTEM_ADMIN_PERMISSIONS = ["permissions_grant", "users_manage", "settings_edit"]
    
    role_permissions = []
    
    # مسؤول النظام (role: admin) يحصل على جميع الصلاحيات
    if role == "admin":
        role_permissions = AVAILABLE_PERMISSIONS.copy()
    # المدير العام يحصل على جميع الصلاحيات ما عدا إدارة النظام
    elif "المدير العام" in position:
        role_permissions = [p for p in AVAILABLE_PERMISSIONS if p not in SYSTEM_ADMIN_PERMISSIONS]
    elif "مدير" in position:
        role_permissions = DEFAULT_DEPARTMENT_PERMISSIONS.get(department, []).copy()
        # المدراء العاديون لا يحصلون على صلاحية منح الصلاحيات تلقائياً
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
