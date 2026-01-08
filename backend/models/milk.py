from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid
from datetime import datetime, timezone

class QualityTest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    fat_percentage: Optional[float] = 0
    protein_percentage: Optional[float] = 0
    temperature: Optional[float] = 0
    snf_percentage: Optional[float] = None
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
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reception_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    total_amount: float = 0.0
    is_paid: bool = False
    created_by: Optional[str] = None
    supplier_code: Optional[str] = None
    milk_type: Optional[str] = None
    period: Optional[str] = None
    month: Optional[int] = None
    year: Optional[int] = None
    source: Optional[str] = None
    created_at: Optional[str] = None
