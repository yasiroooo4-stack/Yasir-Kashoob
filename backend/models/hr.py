from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

# Attendance Models
class AttendanceBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    device_ip: Optional[str] = None
    source: str = "manual"

class AttendanceCreate(AttendanceBase):
    pass

class Attendance(AttendanceBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Leave Request Models
class LeaveRequestBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    leave_type: str
    start_date: str
    end_date: str
    reason: Optional[str] = None
    days_count: int

class LeaveRequestCreate(LeaveRequestBase):
    pass

class LeaveRequest(LeaveRequestBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Expense Request Models
class ExpenseRequestBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    expense_type: str
    amount: float
    description: str
    receipt_url: Optional[str] = None

class ExpenseRequestCreate(ExpenseRequestBase):
    pass

class ExpenseRequest(ExpenseRequestBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    paid_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Car Contract Models
class CarContractBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    car_type: str
    plate_number: str
    model_year: Optional[str] = None
    color: Optional[str] = None
    start_date: str
    end_date: str
    monthly_rent: float
    total_value: float
    contract_type: str = "rent"
    notes: Optional[str] = None

class CarContractCreate(CarContractBase):
    pass

class CarContract(CarContractBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "active"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Official Letter Models
class OfficialLetterBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    department: Optional[str] = None
    position: Optional[str] = None
    letter_type: str
    purpose: Optional[str] = None
    recipient: Optional[str] = None
    content: Optional[str] = None
    leave_start_date: Optional[str] = None
    leave_end_date: Optional[str] = None
    leave_type: Optional[str] = None

class OfficialLetterCreate(OfficialLetterBase):
    pass

class OfficialLetter(OfficialLetterBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    letter_number: Optional[str] = None
    status: str = "pending"
    requested_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_approved: bool = False
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[str] = None
    signature_code: Optional[str] = None
    rejection_reason: Optional[str] = None
    is_printed: bool = False
    printed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Fingerprint Device Models
class FingerprintDeviceBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    ip_address: str
    port: int = 80
    login_id: str
    password: str
    device_type: str = "hikvision"
    location: Optional[str] = None

class FingerprintDeviceCreate(FingerprintDeviceBase):
    pass

class FingerprintDevice(FingerprintDeviceBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    last_sync: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Shift Models
class ShiftBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    start_time: str
    end_time: str
    break_duration: int = 60
    working_hours: float = 8.0
    is_night_shift: bool = False
    color: Optional[str] = "#3B82F6"

class ShiftCreate(ShiftBase):
    pass

class Shift(ShiftBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Employee Shift Assignment
class EmployeeShiftBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    shift_id: str
    shift_name: str
    date: str
    end_date: Optional[str] = None
    is_recurring: bool = False
    weekdays: Optional[List[int]] = None

class EmployeeShiftCreate(EmployeeShiftBase):
    pass

class EmployeeShift(EmployeeShiftBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Overtime Models
class OvertimeBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    date: str
    start_time: str
    end_time: str
    hours: float
    rate: float = 1.5
    reason: Optional[str] = None
    hourly_rate: Optional[float] = None
    total_amount: Optional[float] = None

class OvertimeCreate(OvertimeBase):
    pass

class Overtime(OvertimeBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Loan Models
class LoanBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    loan_type: str
    amount: float
    reason: Optional[str] = None
    installments: int = 1
    installment_amount: Optional[float] = None
    start_deduction_date: Optional[str] = None

class LoanCreate(LoanBase):
    pass

class Loan(LoanBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    paid_amount: float = 0.0
    remaining_amount: Optional[float] = None
    paid_installments: int = 0
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LoanPayment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    loan_id: str
    employee_id: str
    amount: float
    payment_date: str
    payment_method: str = "salary_deduction"
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Employee Document Models
class EmployeeDocumentBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    document_type: str
    document_name: str
    document_number: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    file_url: Optional[str] = None
    notes: Optional[str] = None

class EmployeeDocumentCreate(EmployeeDocumentBase):
    pass

class EmployeeDocument(EmployeeDocumentBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_expired: bool = False
    days_to_expiry: Optional[int] = None
    uploaded_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Payroll Models
class PayrollPeriod(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    start_date: str
    end_date: str
    total_days: int = 31
    status: str = "draft"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    calculated_at: Optional[str] = None
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None

class PayrollRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    period_id: str
    employee_id: str
    employee_name: str
    employee_code: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    nationality: Optional[str] = None
    working_days: int = 0
    day_off: int = 0
    sick_leave: int = 0
    compensation_leave: int = 0
    public_holiday: int = 0
    annual_leave: int = 0
    emergency_leave: int = 0
    on_duty: int = 0
    exam_leave: int = 0
    father_leave: int = 0
    accompanying_leave: int = 0
    unpaid_leave: int = 0
    absent_days: int = 0
    otp_days: int = 0
    basic_salary: float = 0.0
    daily_rate: float = 0.0
    total_pay_days: int = 0
    gross_salary: float = 0.0
    deductions: float = 0.0
    overtime_pay: float = 0.0
    allowances: float = 0.0
    net_salary: float = 0.0
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
