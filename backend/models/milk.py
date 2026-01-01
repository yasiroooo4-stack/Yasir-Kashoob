from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid
from datetime import datetime, timezone

class QualityTest(BaseModel):
    fat_percentage: float
    protein_percentage: float
    temperature: float
    density: Optional[float] = None
    acidity: Optional[float] = None
    water_content: Optional[float] = None
    is_accepted: bool = True
    notes: Optional[str] = None

class MilkReceptionBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    supplier_id: str
    supplier_name: str
    quantity_liters: float
    price_per_liter: float
    quality_test: QualityTest

class MilkReceptionCreate(MilkReceptionBase):
    pass

class MilkReception(MilkReceptionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reception_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    total_amount: float = 0.0
    is_paid: bool = False
    created_by: Optional[str] = None
