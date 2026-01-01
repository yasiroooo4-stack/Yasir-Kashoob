from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid
from datetime import datetime, timezone

class TreasuryTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_type: str
    amount: float
    source_type: str
    source_id: Optional[str] = None
    description: str
    balance_after: float = 0.0
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TreasuryBalance(BaseModel):
    current_balance: float = 0.0
    total_deposits: float = 0.0
    total_withdrawals: float = 0.0
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
