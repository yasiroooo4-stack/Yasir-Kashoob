from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

# Legal Contract Models
class LegalContractBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    contract_number: Optional[str] = None
    contract_type: str
    title: str
    party_name: str
    party_type: str
    start_date: str
    end_date: str
    value: float
    currency: str = "OMR"
    description: Optional[str] = None
    terms: Optional[str] = None
    responsible_employee_id: Optional[str] = None
    responsible_employee_name: Optional[str] = None
    attachments: Optional[List[str]] = None
    renewal_reminder_days: int = 30
    auto_renew: bool = False

class LegalContractCreate(LegalContractBase):
    pass

class LegalContract(LegalContractBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "active"
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Legal Case Models
class LegalCaseBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    case_number: Optional[str] = None
    case_type: str
    title: str
    description: str
    plaintiff: str
    defendant: str
    court_name: Optional[str] = None
    filing_date: str
    hearing_date: Optional[str] = None
    lawyer_name: Optional[str] = None
    lawyer_contact: Optional[str] = None
    estimated_value: Optional[float] = None
    priority: str = "medium"
    notes: Optional[str] = None
    attachments: Optional[List[str]] = None

class LegalCaseCreate(LegalCaseBase):
    pass

class LegalCase(LegalCaseBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "open"
    outcome: Optional[str] = None
    settlement_amount: Optional[float] = None
    closed_at: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Legal Consultation Models
class LegalConsultationBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    requester_id: str
    requester_name: str
    department: str
    subject: str
    description: str
    urgency: str = "normal"
    consultation_type: str

class LegalConsultationCreate(LegalConsultationBase):
    pass

class LegalConsultation(LegalConsultationBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    response: Optional[str] = None
    responded_by: Optional[str] = None
    responded_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Legal Document Models
class LegalDocumentBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    document_type: str
    title: str
    description: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    issuing_authority: Optional[str] = None
    reference_number: Optional[str] = None
    file_url: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None

class LegalDocumentCreate(LegalDocumentBase):
    pass

class LegalDocument(LegalDocumentBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "valid"
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
