from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

# Collection Center Models (مراكز التجميع)
class CollectionCenterBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    code: str
    address: Optional[str] = None
    phone: Optional[str] = None
    manager_name: Optional[str] = None

class CollectionCenterCreate(CollectionCenterBase):
    pass

class CollectionCenter(CollectionCenterBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Activity Log Models (سجل النشاط)
class ActivityLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    details: Optional[str] = None
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Device Settings Models (إعدادات الأجهزة)
class DeviceSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    center_id: str
    device_type: str
    device_name: str
    connection_type: str = "manual"
    port: Optional[str] = None
    ip_address: Optional[str] = None
    api_endpoint: Optional[str] = None
    is_active: bool = True
    last_sync: Optional[str] = None
