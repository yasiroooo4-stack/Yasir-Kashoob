from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

# Project Models
class ProjectBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_code: Optional[str] = None
    name: str
    description: str
    project_type: str
    client_name: Optional[str] = None
    start_date: str
    end_date: str
    budget: float
    currency: str = "OMR"
    priority: str = "medium"
    manager_id: Optional[str] = None
    manager_name: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    objectives: Optional[str] = None
    deliverables: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "planning"
    progress: float = 0.0
    actual_cost: float = 0.0
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Project Task Models
class ProjectTaskBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_id: str
    title: str
    description: Optional[str] = None
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    start_date: str
    due_date: str
    priority: str = "medium"
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    dependencies: Optional[List[str]] = None

class ProjectTaskCreate(ProjectTaskBase):
    pass

class ProjectTask(ProjectTaskBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    progress: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Project Team Member Models
class ProjectTeamMemberBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_id: str
    employee_id: str
    employee_name: str
    role: str
    start_date: str
    end_date: Optional[str] = None
    allocation_percentage: float = 100.0
    hourly_rate: Optional[float] = None

class ProjectTeamMemberCreate(ProjectTeamMemberBase):
    pass

class ProjectTeamMember(ProjectTeamMemberBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Project Milestone Models
class ProjectMilestoneBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_id: str
    title: str
    description: Optional[str] = None
    due_date: str
    deliverables: Optional[str] = None
    payment_amount: Optional[float] = None

class ProjectMilestoneCreate(ProjectMilestoneBase):
    pass

class ProjectMilestone(ProjectMilestoneBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    completed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
