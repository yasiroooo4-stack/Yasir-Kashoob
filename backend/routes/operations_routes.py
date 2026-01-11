"""
Operations Module Routes - قسم العمليات
Includes: Daily Operations, Equipment, Maintenance, Incidents, Vehicles, Driver Tasks, Destination Companies
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from database import db
from models.all_models import (
    DailyOperation, DailyOperationCreate,
    Equipment, EquipmentCreate,
    MaintenanceRecord, MaintenanceRecordCreate,
    IncidentReport, IncidentReportCreate,
    Vehicle, VehicleCreate,
    DriverTask, DriverTaskCreate
)

# Import from base utilities to avoid circular imports
from routes.base import get_current_user, require_role, log_activity

router = APIRouter(prefix="/api/operations", tags=["Operations"])


# ==================== DAILY OPERATIONS (العمليات اليومية) ====================

@router.post("/daily", response_model=DailyOperation)
async def create_daily_operation(operation_data: DailyOperationCreate, current_user: dict = Depends(get_current_user)):
    operation = DailyOperation(**operation_data.model_dump())
    operation_dict = operation.model_dump()
    operation_dict["created_by"] = current_user["id"]
    
    await db.daily_operations.insert_one(operation_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_daily_operation",
        entity_type="daily_operation",
        entity_id=operation.id,
        entity_name=f"{operation_data.operation_date} - {operation_data.shift}",
        details=f"عملية يومية: {operation_data.operation_date} - {operation_data.shift}"
    )
    
    # Remove _id before returning
    operation_dict.pop("_id", None)
    return DailyOperation(**operation_dict)


@router.get("/daily")
async def get_daily_operations(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    center_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if start_date:
        query["operation_date"] = {"$gte": start_date}
    if end_date:
        if "operation_date" in query:
            query["operation_date"]["$lte"] = end_date
        else:
            query["operation_date"] = {"$lte": end_date}
    if center_id:
        query["center_id"] = center_id
    
    operations = await db.daily_operations.find(query, {"_id": 0}).sort("operation_date", -1).to_list(1000)
    return operations


@router.put("/daily/{operation_id}", response_model=DailyOperation)
async def update_daily_operation(operation_id: str, operation_data: DailyOperationCreate, current_user: dict = Depends(get_current_user)):
    result = await db.daily_operations.update_one(
        {"id": operation_id},
        {"$set": operation_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Operation not found")
    
    operation = await db.daily_operations.find_one({"id": operation_id}, {"_id": 0})
    return operation


# ==================== EQUIPMENT (المعدات) ====================

@router.post("/equipment", response_model=Equipment)
async def create_equipment(equipment_data: EquipmentCreate, current_user: dict = Depends(get_current_user)):
    count = await db.equipment.count_documents({})
    equipment_code = f"EQP-{count + 1:04d}"
    
    equipment = Equipment(**equipment_data.model_dump())
    equipment_dict = equipment.model_dump()
    equipment_dict["equipment_code"] = equipment_code
    
    await db.equipment.insert_one(equipment_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_equipment",
        entity_type="equipment",
        entity_id=equipment.id,
        entity_name=equipment_data.name,
        details=f"معدة جديدة: {equipment_data.name}"
    )
    
    # Remove _id before returning
    equipment_dict.pop("_id", None)
    return Equipment(**equipment_dict)


@router.get("/equipment")
async def get_equipment(
    equipment_type: Optional[str] = None,
    status: Optional[str] = None,
    center_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if equipment_type:
        query["equipment_type"] = equipment_type
    if status:
        query["status"] = status
    if center_id:
        query["center_id"] = center_id
    
    equipment = await db.equipment.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return equipment


@router.put("/equipment/{equipment_id}", response_model=Equipment)
async def update_equipment(equipment_id: str, equipment_data: EquipmentCreate, current_user: dict = Depends(get_current_user)):
    result = await db.equipment.update_one(
        {"id": equipment_id},
        {"$set": equipment_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    equipment = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_equipment",
        entity_type="equipment",
        entity_id=equipment_id,
        entity_name=equipment.get("name"),
        details=f"تعديل معدة: {equipment.get('name')}"
    )
    
    return equipment


@router.put("/equipment/{equipment_id}/status")
async def update_equipment_status(equipment_id: str, status: str, current_user: dict = Depends(get_current_user)):
    result = await db.equipment.update_one(
        {"id": equipment_id},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    equipment = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    return equipment


# ==================== MAINTENANCE (الصيانة) ====================

@router.post("/maintenance", response_model=MaintenanceRecord)
async def create_maintenance_record(maintenance_data: MaintenanceRecordCreate, current_user: dict = Depends(get_current_user)):
    maintenance = MaintenanceRecord(**maintenance_data.model_dump())
    maintenance_dict = maintenance.model_dump()
    maintenance_dict["created_by"] = current_user["id"]
    
    await db.maintenance_records.insert_one(maintenance_dict)
    
    # Update equipment last maintenance date
    await db.equipment.update_one(
        {"id": maintenance_data.equipment_id},
        {"$set": {
            "last_maintenance_date": maintenance_data.maintenance_date,
            "next_maintenance_date": maintenance_data.next_maintenance_date
        }}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_maintenance_record",
        entity_type="maintenance_record",
        entity_id=maintenance.id,
        entity_name=maintenance_data.equipment_name,
        details=f"صيانة: {maintenance_data.equipment_name} - {maintenance_data.maintenance_type}"
    )
    
    # Remove _id before returning
    maintenance_dict.pop("_id", None)
    return MaintenanceRecord(**maintenance_dict)


@router.get("/maintenance")
async def get_maintenance_records(
    equipment_id: Optional[str] = None,
    maintenance_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if equipment_id:
        query["equipment_id"] = equipment_id
    if maintenance_type:
        query["maintenance_type"] = maintenance_type
    
    records = await db.maintenance_records.find(query, {"_id": 0}).sort("maintenance_date", -1).to_list(1000)
    return records


# ==================== INCIDENTS (الحوادث) ====================

@router.post("/incidents", response_model=IncidentReport)
async def create_incident_report(incident_data: IncidentReportCreate, current_user: dict = Depends(get_current_user)):
    count = await db.incident_reports.count_documents({})
    year = datetime.now().year
    incident_number = f"INC-{year}-{count + 1:04d}"
    
    incident = IncidentReport(**incident_data.model_dump())
    incident_dict = incident.model_dump()
    incident_dict["incident_number"] = incident_number
    
    await db.incident_reports.insert_one(incident_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_incident_report",
        entity_type="incident_report",
        entity_id=incident.id,
        entity_name=incident_data.title,
        details=f"تقرير حادث: {incident_data.title} - {incident_data.severity}"
    )
    
    # Remove _id before returning
    incident_dict.pop("_id", None)
    return IncidentReport(**incident_dict)


@router.get("/incidents")
async def get_incident_reports(
    incident_type: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    center_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if incident_type:
        query["incident_type"] = incident_type
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    if center_id:
        query["center_id"] = center_id
    
    incidents = await db.incident_reports.find(query, {"_id": 0}).sort("incident_date", -1).to_list(1000)
    return incidents


@router.put("/incidents/{incident_id}/resolve")
async def resolve_incident(incident_id: str, resolution_notes: str, current_user: dict = Depends(get_current_user)):
    result = await db.incident_reports.update_one(
        {"id": incident_id},
        {"$set": {
            "status": "resolved",
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "resolution_notes": resolution_notes,
            "investigated_by": current_user["full_name"]
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    incident = await db.incident_reports.find_one({"id": incident_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="resolve_incident",
        entity_type="incident_report",
        entity_id=incident_id,
        entity_name=incident.get("title"),
        details=f"حل حادث: {incident.get('title')}"
    )
    
    return incident


# ==================== VEHICLES (المركبات) ====================

@router.post("/vehicles", response_model=Vehicle)
async def create_vehicle(vehicle_data: VehicleCreate, current_user: dict = Depends(get_current_user)):
    count = await db.vehicles.count_documents({})
    vehicle_code = f"VEH-{count + 1:04d}"
    
    vehicle = Vehicle(**vehicle_data.model_dump())
    vehicle_dict = vehicle.model_dump()
    vehicle_dict["vehicle_code"] = vehicle_code
    
    await db.vehicles.insert_one(vehicle_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_vehicle",
        entity_type="vehicle",
        entity_id=vehicle.id,
        entity_name=f"{vehicle_data.brand} {vehicle_data.model}",
        details=f"مركبة جديدة: {vehicle_data.brand} {vehicle_data.model} - {vehicle_data.plate_number}"
    )
    
    return Vehicle(**vehicle_dict)


@router.get("/vehicles")
async def get_vehicles(
    vehicle_type: Optional[str] = None,
    status: Optional[str] = None,
    center_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if vehicle_type:
        query["vehicle_type"] = vehicle_type
    if status:
        query["status"] = status
    if center_id:
        query["center_id"] = center_id
    
    vehicles = await db.vehicles.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return vehicles


@router.put("/vehicles/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(vehicle_id: str, vehicle_data: VehicleCreate, current_user: dict = Depends(get_current_user)):
    result = await db.vehicles.update_one(
        {"id": vehicle_id},
        {"$set": vehicle_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_vehicle",
        entity_type="vehicle",
        entity_id=vehicle_id,
        entity_name=f"{vehicle.get('brand')} {vehicle.get('model')}",
        details=f"تعديل مركبة: {vehicle.get('plate_number')}"
    )
    
    return vehicle


# ==================== DASHBOARD (لوحة التحكم) ====================

@router.get("/dashboard")
async def get_operations_dashboard(current_user: dict = Depends(get_current_user)):
    equipment_operational = await db.equipment.count_documents({"status": "operational"})
    equipment_maintenance = await db.equipment.count_documents({"status": "maintenance"})
    equipment_out_of_order = await db.equipment.count_documents({"status": "out_of_order"})
    
    vehicles_available = await db.vehicles.count_documents({"status": "available"})
    vehicles_in_use = await db.vehicles.count_documents({"status": "in_use"})
    
    open_incidents = await db.incident_reports.count_documents({"status": {"$in": ["reported", "investigating"]}})
    
    # Today's operations
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_operations = await db.daily_operations.find({"operation_date": today}, {"_id": 0}).to_list(10)
    
    return {
        "equipment": {
            "operational": equipment_operational,
            "maintenance": equipment_maintenance,
            "out_of_order": equipment_out_of_order
        },
        "vehicles": {
            "available": vehicles_available,
            "in_use": vehicles_in_use
        },
        "open_incidents": open_incidents,
        "today_operations": today_operations
    }


# ==================== DRIVER TASKS (مهام السائقين) ====================

@router.post("/driver-tasks")
async def create_driver_task(task_data: dict, current_user: dict = Depends(get_current_user)):
    """إنشاء مهمة سائق جديدة"""
    task = DriverTask(**task_data)
    task_dict = task.model_dump()
    task_dict["created_by"] = current_user.get("full_name", current_user.get("username"))
    
    await db.driver_tasks.insert_one(task_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user.get("full_name", ""),
        action="create_driver_task",
        entity_type="driver_task",
        entity_id=task.id,
        entity_name=f"{task_data.get('driver_name')} - {task_data.get('from_location')} → {task_data.get('to_destination')}",
        details=f"مهمة سائق: {task_data.get('transport_type')} - {task_data.get('quantity')} لتر"
    )
    
    return {"message": "تم إنشاء المهمة بنجاح", "task": task_dict}


@router.get("/driver-tasks")
async def get_driver_tasks(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    driver_id: Optional[str] = None,
    transport_type: Optional[str] = None,
    from_location: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """جلب مهام السائقين"""
    query = {}
    if start_date:
        query["transport_date"] = {"$gte": start_date}
    if end_date:
        if "transport_date" in query:
            query["transport_date"]["$lte"] = end_date
        else:
            query["transport_date"] = {"$lte": end_date}
    if driver_id:
        query["driver_id"] = driver_id
    if transport_type:
        query["transport_type"] = transport_type
    if from_location:
        query["from_location"] = from_location
    
    tasks = await db.driver_tasks.find(query, {"_id": 0}).sort("transport_date", -1).to_list(500)
    return tasks


@router.get("/driver-tasks/summary")
async def get_driver_tasks_summary(
    month: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """ملخص مهام السائقين"""
    query = {}
    if month:
        query["transport_date"] = {"$regex": f"^{month}"}
    
    tasks = await db.driver_tasks.find(query, {"_id": 0}).to_list(1000)
    
    # Summary by transport type (milk types)
    camel_milk_tasks = [t for t in tasks if t.get("transport_type") == "camel_milk"]
    cow_milk_tasks = [t for t in tasks if t.get("transport_type") == "cow_milk"]
    sheep_milk_tasks = [t for t in tasks if t.get("transport_type") == "sheep_milk"]
    
    total_milk = sum(t.get("quantity", 0) for t in tasks)
    
    # Summary by location
    locations = {}
    for t in tasks:
        loc = t.get("from_location", "غير محدد")
        if loc not in locations:
            locations[loc] = {"count": 0, "milk_quantity": 0}
        locations[loc]["count"] += 1
        locations[loc]["milk_quantity"] += t.get("quantity", 0)
    
    return {
        "total_tasks": len(tasks),
        "camel_milk_tasks": len(camel_milk_tasks),
        "cow_milk_tasks": len(cow_milk_tasks),
        "sheep_milk_tasks": len(sheep_milk_tasks),
        "total_milk_quantity": total_milk,
        "by_location": locations
    }


@router.delete("/driver-tasks/{task_id}")
async def delete_driver_task(task_id: str, current_user: dict = Depends(require_role(["admin", "operations_manager"]))):
    """حذف مهمة سائق"""
    result = await db.driver_tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "تم حذف المهمة بنجاح"}


# ==================== DESTINATION COMPANIES (الشركات الوجهة) ====================

@router.get("/destination-companies")
async def get_destination_companies(current_user: dict = Depends(get_current_user)):
    """جلب قائمة الشركات الوجهة"""
    companies = await db.destination_companies.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    if not companies:
        # Add default company if none exist
        default = {"id": str(uuid.uuid4()), "name": "شركة الصفوة", "created_at": datetime.now(timezone.utc).isoformat()}
        await db.destination_companies.insert_one(default)
        companies = [default]
    return companies


@router.post("/destination-companies")
async def create_destination_company(data: dict, current_user: dict = Depends(get_current_user)):
    """إضافة شركة وجهة جديدة"""
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="اسم الشركة مطلوب")
    
    # Check if exists
    existing = await db.destination_companies.find_one({"name": name})
    if existing:
        raise HTTPException(status_code=400, detail="الشركة موجودة مسبقاً")
    
    company = {
        "id": str(uuid.uuid4()),
        "name": name,
        "created_by": current_user.get("full_name", current_user.get("username")),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.destination_companies.insert_one(company)
    return {"message": "تم إضافة الشركة بنجاح", "company": {k: v for k, v in company.items() if k != "_id"}}


@router.delete("/destination-companies/{company_id}")
async def delete_destination_company(company_id: str, current_user: dict = Depends(require_role(["admin", "operations_manager"]))):
    """حذف شركة وجهة"""
    result = await db.destination_companies.delete_one({"id": company_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الشركة غير موجودة")
    return {"message": "تم حذف الشركة بنجاح"}
