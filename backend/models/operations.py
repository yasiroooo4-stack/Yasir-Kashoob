from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

# Daily Operation Models
class DailyOperationBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    operation_date: str
    shift: str
    milk_received_liters: float = 0.0
    milk_sold_liters: float = 0.0
    milk_processed_liters: float = 0.0
    milk_wasted_liters: float = 0.0
    opening_stock: float = 0.0
    closing_stock: float = 0.0
    total_suppliers: int = 0
    total_sales: int = 0
    notes: Optional[str] = None

class DailyOperationCreate(DailyOperationBase):
    pass

class DailyOperation(DailyOperationBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Equipment Models
class EquipmentBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    equipment_type: str
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    purchase_date: Optional[str] = None
    warranty_expiry: Optional[str] = None
    location: Optional[str] = None
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    maintenance_schedule: Optional[str] = None
    last_maintenance: Optional[str] = None
    next_maintenance: Optional[str] = None

class EquipmentCreate(EquipmentBase):
    pass

class Equipment(EquipmentBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "operational"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Maintenance Record Models
class MaintenanceRecordBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    equipment_id: str
    equipment_name: str
    maintenance_type: str
    description: str
    performed_by: Optional[str] = None
    performed_by_name: Optional[str] = None
    maintenance_date: str
    cost: float = 0.0
    parts_replaced: Optional[List[str]] = None
    next_maintenance_date: Optional[str] = None
    notes: Optional[str] = None

class MaintenanceRecordCreate(MaintenanceRecordBase):
    pass

class MaintenanceRecord(MaintenanceRecordBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Incident Report Models
class IncidentReportBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str
    incident_type: str
    description: str
    location: Optional[str] = None
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    incident_date: str
    reported_by_id: str
    reported_by_name: str
    severity: str = "low"
    affected_equipment: Optional[List[str]] = None
    affected_employees: Optional[List[str]] = None
    immediate_actions: Optional[str] = None
    root_cause: Optional[str] = None
    corrective_actions: Optional[str] = None
    preventive_measures: Optional[str] = None

class IncidentReportCreate(IncidentReportBase):
    pass

class IncidentReport(IncidentReportBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "open"
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Vehicle Models
class VehicleBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    vehicle_type: str
    make: str
    model: str
    year: int
    plate_number: str
    vin: Optional[str] = None
    color: Optional[str] = None
    capacity: Optional[float] = None
    fuel_type: str = "petrol"
    assigned_driver_id: Optional[str] = None
    assigned_driver_name: Optional[str] = None
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    registration_expiry: Optional[str] = None
    insurance_expiry: Optional[str] = None
    last_service_date: Optional[str] = None
    next_service_date: Optional[str] = None

class VehicleCreate(VehicleBase):
    pass

class Vehicle(VehicleBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "active"
    total_mileage: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
