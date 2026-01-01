from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid
from datetime import datetime, timezone

# Feed Company Models
class FeedCompanyBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None

class FeedCompanyCreate(FeedCompanyBase):
    pass

class FeedCompany(FeedCompanyBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Feed Type Models
class FeedTypeBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    unit: str = "kg"
    price_per_unit: float = 0.0
    description: Optional[str] = None

class FeedTypeCreate(FeedTypeBase):
    pass

class FeedType(FeedTypeBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Feed Purchase Models
class FeedPurchaseBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    supplier_id: str
    supplier_name: str
    feed_type_id: str
    feed_type_name: str
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    quantity: float
    unit: str = "kg"
    price_per_unit: float
    total_amount: float
    purchase_date: str
    delivery_date: Optional[str] = None
    notes: Optional[str] = None

class FeedPurchaseCreate(FeedPurchaseBase):
    pass

class FeedPurchase(FeedPurchaseBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    is_paid: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
