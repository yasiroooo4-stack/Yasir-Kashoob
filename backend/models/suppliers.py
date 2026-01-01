from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid
from datetime import datetime, timezone

class SupplierBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    phone: str
    address: str
    supplier_code: Optional[str] = None
    bank_account: Optional[str] = None
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    national_id: Optional[str] = None
    farm_size: Optional[float] = None
    cattle_count: Optional[int] = None
    milk_type: Optional[str] = "cow"

class SupplierCreate(SupplierBase):
    pass

class Supplier(SupplierBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_active: bool = True
    total_supplied: float = 0.0
    balance: float = 0.0
