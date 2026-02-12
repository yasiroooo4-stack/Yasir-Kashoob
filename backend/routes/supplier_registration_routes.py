"""
Supplier Registration Routes - مسارات تسجيل الموردين
نظام تسجيل الموردين الجدد
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
import os

router = APIRouter(prefix="/api/supplier-registration", tags=["Supplier Registration"])

# Database reference
db = None

# Directory for supplier documents
SUPPLIER_DOCS_DIR = "/app/backend/uploads/supplier_documents"
os.makedirs(SUPPLIER_DOCS_DIR, exist_ok=True)

def set_database(database):
    global db
    db = database


class SupplierRegistrationSettings(BaseModel):
    """إعدادات تسجيل الموردين"""
    is_open: bool = False
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    assigned_employee_id: Optional[str] = None
    assigned_employee_name: Optional[str] = None
    milk_types: List[str] = ["أبقار", "أغنام", "إبل"]
    max_quantity: Optional[int] = None
    require_documents: bool = True
    notes: Optional[str] = None


class SupplierRegistrationRequest(BaseModel):
    """طلب تسجيل مورد جديد"""
    civil_id: str
    phone: str
    name: str
    milk_type: str
    expected_quantity: float
    address: Optional[str] = None
    notes: Optional[str] = None


# ==================== REGISTRATION SETTINGS ====================

@router.get("/settings")
async def get_registration_settings():
    """جلب إعدادات التسجيل"""
    settings = await db.supplier_registration_settings.find_one({})
    if not settings:
        default_settings = {
            "id": str(uuid.uuid4()),
            "is_open": False,
            "start_date": None,
            "end_date": None,
            "assigned_employee_id": None,
            "assigned_employee_name": None,
            "milk_types": ["أبقار", "أغنام", "إبل"],
            "max_quantity": None,
            "require_documents": True,
            "notes": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.supplier_registration_settings.insert_one(default_settings)
        settings = default_settings
    
    settings.pop("_id", None)
    
    # Check if registration should be auto-closed based on date
    if settings.get("is_open") and settings.get("end_date"):
        end_date = datetime.fromisoformat(settings["end_date"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > end_date:
            await db.supplier_registration_settings.update_one(
                {"id": settings["id"]},
                {"$set": {"is_open": False}}
            )
            settings["is_open"] = False
    
    return settings


@router.put("/settings")
async def update_registration_settings(settings_data: dict):
    """تحديث إعدادات التسجيل"""
    current = await db.supplier_registration_settings.find_one({})
    if not current:
        current = {"id": str(uuid.uuid4())}
        await db.supplier_registration_settings.insert_one(current)
    
    update_data = {
        "is_open": settings_data.get("is_open", current.get("is_open", False)),
        "start_date": settings_data.get("start_date", current.get("start_date")),
        "end_date": settings_data.get("end_date", current.get("end_date")),
        "assigned_employee_id": settings_data.get("assigned_employee_id", current.get("assigned_employee_id")),
        "assigned_employee_name": settings_data.get("assigned_employee_name", current.get("assigned_employee_name")),
        "milk_types": settings_data.get("milk_types", current.get("milk_types", ["أبقار", "أغنام", "إبل"])),
        "max_quantity": settings_data.get("max_quantity", current.get("max_quantity")),
        "require_documents": settings_data.get("require_documents", current.get("require_documents", True)),
        "notes": settings_data.get("notes", current.get("notes")),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.supplier_registration_settings.update_one(
        {"id": current["id"]},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "تم تحديث الإعدادات بنجاح"}


@router.post("/settings/toggle")
async def toggle_registration(is_open: bool = None):
    """فتح/إغلاق التسجيل"""
    current = await db.supplier_registration_settings.find_one({})
    if not current:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    new_status = is_open if is_open is not None else not current.get("is_open", False)
    
    await db.supplier_registration_settings.update_one(
        {"id": current["id"]},
        {"$set": {"is_open": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "is_open": new_status}


# ==================== REGISTRATION REQUESTS ====================

@router.get("/check-status")
async def check_registration_status():
    """التحقق من حالة التسجيل (للصفحة العامة)"""
    settings = await get_registration_settings()
    
    is_open = settings.get("is_open", False)
    message = ""
    
    if not is_open:
        message = "التسجيل مغلق حالياً"
    elif settings.get("end_date"):
        end_date = datetime.fromisoformat(settings["end_date"].replace("Z", "+00:00"))
        remaining_days = (end_date - datetime.now(timezone.utc)).days
        if remaining_days > 0:
            message = f"التسجيل مفتوح - متبقي {remaining_days} يوم"
        elif remaining_days == 0:
            message = "آخر يوم للتسجيل"
    else:
        message = "التسجيل مفتوح"
    
    return {
        "is_open": is_open,
        "message": message,
        "milk_types": settings.get("milk_types", []),
        "end_date": settings.get("end_date")
    }


@router.post("/submit")
async def submit_registration(
    civil_id: str = Form(...),
    phone: str = Form(...),
    name: str = Form(...),
    milk_type: str = Form(...),
    expected_quantity: float = Form(...),
    address: str = Form(None),
    notes: str = Form(None),
    document: UploadFile = File(None)
):
    """تقديم طلب تسجيل مورد جديد"""
    # Check if registration is open
    settings = await get_registration_settings()
    if not settings.get("is_open"):
        raise HTTPException(status_code=400, detail="التسجيل مغلق حالياً")
    
    # Check if civil_id already registered
    existing = await db.supplier_registrations.find_one({"civil_id": civil_id})
    if existing:
        # Check if rejected and 24 hours passed
        if existing.get("status") == "rejected":
            rejected_at = existing.get("rejected_at")
            if rejected_at:
                try:
                    rejected_time = datetime.fromisoformat(rejected_at.replace("Z", "+00:00"))
                    hours_since_rejection = (datetime.now(timezone.utc) - rejected_time).total_seconds() / 3600
                    
                    if hours_since_rejection < 24:
                        remaining_hours = int(24 - hours_since_rejection)
                        raise HTTPException(
                            status_code=400, 
                            detail=f"تم رفض طلبك مسبقاً. يمكنك إعادة التسجيل بعد {remaining_hours} ساعة"
                        )
                    else:
                        # Allow re-registration after 24 hours - delete old record
                        await db.supplier_registrations.delete_one({"id": existing["id"]})
                except ValueError:
                    # If date parsing fails, allow re-registration
                    await db.supplier_registrations.delete_one({"id": existing["id"]})
            else:
                # No rejected_at date, allow re-registration
                await db.supplier_registrations.delete_one({"id": existing["id"]})
        elif existing.get("status") == "pending":
            raise HTTPException(status_code=400, detail="لديك طلب قيد المراجعة بالفعل")
        elif existing.get("status") == "approved":
            raise HTTPException(status_code=400, detail="هذا الرقم المدني مسجل ومقبول مسبقاً")
        else:
            raise HTTPException(status_code=400, detail="هذا الرقم المدني مسجل مسبقاً")
    
    # Generate registration number
    count = await db.supplier_registrations.count_documents({})
    reg_number = f"SUP-{datetime.now().year}-{str(count + 1).zfill(4)}"
    
    # Save document if provided
    document_path = None
    document_filename = None
    if document:
        ext = document.filename.split('.')[-1] if '.' in document.filename else 'pdf'
        document_filename = f"{reg_number}_{civil_id}.{ext}"
        document_path = os.path.join(SUPPLIER_DOCS_DIR, document_filename)
        
        contents = await document.read()
        with open(document_path, "wb") as f:
            f.write(contents)
    
    # Create registration record
    registration = {
        "id": str(uuid.uuid4()),
        "registration_number": reg_number,
        "civil_id": civil_id,
        "phone": phone,
        "name": name,
        "milk_type": milk_type,
        "expected_quantity": expected_quantity,
        "address": address,
        "notes": notes,
        "document_path": document_path,
        "document_filename": document_filename,
        "status": "pending",  # pending, approved, rejected
        "status_message": "قيد الإجراءات",
        "assigned_to": settings.get("assigned_employee_id"),
        "assigned_to_name": settings.get("assigned_employee_name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": None,
        "approved_at": None,
        "approved_by": None,
        "rejected_at": None,
        "rejected_by": None,
        "rejection_reason": None
    }
    
    await db.supplier_registrations.insert_one(registration)
    
    return {
        "success": True,
        "registration_number": reg_number,
        "message": "تم تقديم طلبك بنجاح. رقم الطلب: " + reg_number,
        "status": "pending"
    }


@router.get("/requests")
async def get_registration_requests(
    status: str = None,
    limit: int = 100
):
    """جلب طلبات التسجيل (للإدارة)"""
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.supplier_registrations.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return requests


@router.get("/requests/{registration_id}")
async def get_registration_request(registration_id: str):
    """جلب تفاصيل طلب تسجيل"""
    request = await db.supplier_registrations.find_one(
        {"$or": [{"id": registration_id}, {"registration_number": registration_id}]},
        {"_id": 0}
    )
    
    if not request:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    return request


@router.get("/check/{civil_id}")
async def check_registration_by_civil_id(civil_id: str):
    """التحقق من حالة التسجيل بالرقم المدني"""
    request = await db.supplier_registrations.find_one(
        {"civil_id": civil_id},
        {"_id": 0}
    )
    
    if not request:
        return {"found": False, "message": "لم يتم العثور على طلب بهذا الرقم المدني"}
    
    return {
        "found": True,
        "registration_number": request.get("registration_number"),
        "name": request.get("name"),
        "status": request.get("status"),
        "status_message": request.get("status_message"),
        "created_at": request.get("created_at")
    }


@router.put("/requests/{registration_id}/approve")
async def approve_registration(registration_id: str, approved_by: str = None, approved_by_name: str = None):
    """الموافقة على طلب تسجيل"""
    request = await db.supplier_registrations.find_one(
        {"$or": [{"id": registration_id}, {"registration_number": registration_id}]}
    )
    
    if not request:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # Create supplier record
    supplier = {
        "id": str(uuid.uuid4()),
        "code": request.get("registration_number"),
        "name": request.get("name"),
        "civil_id": request.get("civil_id"),
        "phone": request.get("phone"),
        "milk_type": request.get("milk_type"),
        "expected_quantity": request.get("expected_quantity"),
        "address": request.get("address"),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "registration_id": request.get("id")
    }
    
    await db.suppliers.insert_one(supplier)
    
    # Update registration status
    await db.supplier_registrations.update_one(
        {"id": request.get("id")},
        {"$set": {
            "status": "approved",
            "status_message": "تمت الموافقة",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": approved_by,
            "approved_by_name": approved_by_name,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "تمت الموافقة على الطلب وإضافة المورد",
        "supplier_id": supplier["id"]
    }


@router.put("/requests/{registration_id}/reject")
async def reject_registration(
    registration_id: str,
    rejection_reason: str = None,
    rejected_by: str = None,
    rejected_by_name: str = None
):
    """رفض طلب تسجيل"""
    request = await db.supplier_registrations.find_one(
        {"$or": [{"id": registration_id}, {"registration_number": registration_id}]}
    )
    
    if not request:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    await db.supplier_registrations.update_one(
        {"id": request.get("id")},
        {"$set": {
            "status": "rejected",
            "status_message": rejection_reason or "تم الرفض",
            "rejection_reason": rejection_reason,
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejected_by": rejected_by,
            "rejected_by_name": rejected_by_name,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "تم رفض الطلب"}


@router.get("/stats")
async def get_registration_stats():
    """إحصائيات التسجيل"""
    total = await db.supplier_registrations.count_documents({})
    pending = await db.supplier_registrations.count_documents({"status": "pending"})
    approved = await db.supplier_registrations.count_documents({"status": "approved"})
    rejected = await db.supplier_registrations.count_documents({"status": "rejected"})
    
    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected
    }


@router.delete("/requests/{registration_id}")
async def delete_registration_request(registration_id: str):
    """حذف طلب تسجيل"""
    # Find the request first
    request = await db.supplier_registrations.find_one(
        {"$or": [{"id": registration_id}, {"registration_number": registration_id}]}
    )
    
    if not request:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # Delete the request
    result = await db.supplier_registrations.delete_one({"id": request.get("id")})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=500, detail="فشل في حذف الطلب")
    
    # Delete associated document if exists
    if request.get("document_path"):
        try:
            document_path = request.get("document_path")
            if os.path.exists(document_path):
                os.remove(document_path)
        except:
            pass
    
    return {"success": True, "message": "تم حذف الطلب بنجاح"}
