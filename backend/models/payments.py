from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid
from datetime import datetime, timezone

class PaymentBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    payment_type: str
    related_id: str
    related_name: str
    amount: float
    payment_method: str = "cash"
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    status: str = "pending"
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None

class PaymentApproval(BaseModel):
    action: str
    reason: Optional[str] = None
