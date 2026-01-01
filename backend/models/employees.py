from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

class EmployeeBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    phone: str
    email: Optional[str] = None
    position: str
    department: str
    salary: float
    hire_date: str
    national_id: Optional[str] = None
    employee_code: Optional[str] = None
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    fingerprint_id: Optional[str] = None
    can_login: bool = False
    permissions: Optional[List[str]] = None
    manager_id: Optional[str] = None
    manager_name: Optional[str] = None
    username: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    pass

class Employee(EmployeeBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
