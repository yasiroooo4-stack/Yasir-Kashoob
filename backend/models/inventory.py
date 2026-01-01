from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid
from datetime import datetime, timezone

class InventoryBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_type: str = "raw_milk"
    quantity_liters: float
    storage_tank: str
    temperature: float

class InventoryUpdate(BaseModel):
    quantity_liters: Optional[float] = None
    temperature: Optional[float] = None
    notes: Optional[str] = None

class Inventory(InventoryBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
