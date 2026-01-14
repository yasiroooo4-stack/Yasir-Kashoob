"""
All Models - جميع النماذج
هذا الملف يحتوي على جميع نماذج Pydantic للتطبيق
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from enum import Enum
import uuid
from datetime import datetime, timezone

# ==================== AUTH MODELS ====================

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    username: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str = "employee"
    center_id: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_active: bool = True

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class PasswordResetToken(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    email: str
    token: str
    expires_at: str
    used: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== SUPPLIER MODELS ====================

class SupplierBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    supplier_code: Optional[str] = None
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    national_id: Optional[str] = None
    farm_size: Optional[float] = None
    cattle_count: Optional[int] = None
    milk_type: Optional[str] = "cow"

class SupplierCreate(SupplierBase):
    password: Optional[str] = None

class Supplier(SupplierBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_active: bool = True
    total_supplied: float = 0.0
    balance: float = 0.0
    pending_balance: float = 0.0
    password_hash: Optional[str] = None

class SupplierLoginRequest(BaseModel):
    supplier_code: str
    password: str

class SupplierModificationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    supplier_id: str
    supplier_name: str
    supplier_code: str
    request_type: str
    current_data: dict
    new_data: dict
    reason: Optional[str] = None
    requested_by: str
    requested_by_name: str
    requested_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "pending"
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None

# ==================== SUPPLIER PORTAL MODELS ====================

class SupplierFeedRequestBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    supplier_id: str
    supplier_name: str
    supplier_code: str
    feed_type: str
    quantity: float
    amount_to_deduct: float
    notes: Optional[str] = None

class SupplierFeedRequestCreate(SupplierFeedRequestBase):
    pass

class SupplierFeedRequest(SupplierFeedRequestBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SupplierMessageBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    supplier_id: str
    supplier_name: str
    supplier_code: str
    message_type: str
    subject: str
    message: str

class SupplierMessageCreate(SupplierMessageBase):
    pass

class SupplierMessage(SupplierMessageBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "unread"
    reply: Optional[str] = None
    replied_by: Optional[str] = None
    replied_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== MILK MODELS ====================

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

# ==================== CUSTOMER MODELS ====================

class CustomerBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    phone: str
    address: str
    customer_type: str = "retail"
    credit_limit: float = 0.0

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_active: bool = True
    total_purchases: float = 0.0
    balance: float = 0.0

# ==================== SALE MODELS ====================

class SaleBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    customer_id: str
    customer_name: str
    quantity_liters: float
    price_per_liter: float
    sale_type: str = "cash"

class SaleCreate(SaleBase):
    pass

class Sale(SaleBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sale_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    total_amount: float = 0.0
    is_paid: bool = False
    created_by: Optional[str] = None

# ==================== INVENTORY MODELS ====================

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

# ==================== PAYMENT MODELS ====================

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

# ==================== TREASURY MODELS ====================

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

# ==================== FINANCIAL SYSTEM MODELS ====================

class AccountType(str, Enum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"

# Bank Account Model - نموذج الحساب البنكي
class BankAccount(BaseModel):
    """نموذج الحساب البنكي الرئيسي"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    account_number: str  # رقم الحساب في دليل الحسابات (مثل 1112)
    bank_name: str  # اسم البنك
    bank_account_number: str  # رقم الحساب البنكي الفعلي
    iban: Optional[str] = None  # رقم IBAN
    swift_code: Optional[str] = None  # رمز SWIFT
    branch_name: Optional[str] = None  # اسم الفرع
    account_holder_name: Optional[str] = None  # اسم صاحب الحساب
    currency: str = "OMR"  # العملة
    opening_balance: float = 0.0  # الرصيد الافتتاحي
    current_balance: float = 0.0  # الرصيد الحالي
    is_default: bool = False  # هل هو الحساب الافتراضي
    is_active: bool = True
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

class BankAccountCreate(BaseModel):
    account_number: str
    bank_name: str
    bank_account_number: str
    iban: Optional[str] = None
    swift_code: Optional[str] = None
    branch_name: Optional[str] = None
    account_holder_name: Optional[str] = None
    currency: str = "OMR"
    opening_balance: float = 0.0
    is_default: bool = False
    notes: Optional[str] = None

class Account(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    account_number: str
    name: str
    name_en: Optional[str] = None
    account_type: str
    parent_id: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    balance: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class JournalEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entry_number: str
    entry_date: str
    description: str
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    total_debit: float = 0.0
    total_credit: float = 0.0
    status: str = "draft"
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    posted_at: Optional[str] = None
    posted_by: Optional[str] = None

class JournalEntryLine(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    journal_entry_id: str
    account_id: str
    account_number: str
    account_name: str
    debit: float = 0.0
    credit: float = 0.0
    description: Optional[str] = None

class AccountsPayable(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    supplier_id: str
    supplier_name: str
    supplier_code: str
    invoice_number: Optional[str] = None
    invoice_date: str
    due_date: str
    amount: float
    paid_amount: float = 0.0
    balance: float = 0.0
    status: str = "unpaid"
    description: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AccountsReceivable(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: str
    invoice_number: Optional[str] = None
    invoice_date: str
    due_date: str
    amount: float
    received_amount: float = 0.0
    balance: float = 0.0
    status: str = "unpaid"
    description: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class FixedAsset(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    asset_number: str
    name: str
    category: str
    purchase_date: str
    purchase_cost: float
    useful_life_years: int
    salvage_value: float = 0.0
    depreciation_method: str = "straight_line"
    accumulated_depreciation: float = 0.0
    current_value: float = 0.0
    location: Optional[str] = None
    assigned_to: Optional[str] = None
    status: str = "active"
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Budget(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    fiscal_year: int
    start_date: str
    end_date: str
    status: str = "draft"
    total_amount: float = 0.0
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None

class BudgetLine(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    budget_id: str
    account_id: str
    account_name: str
    budgeted_amount: float = 0.0
    actual_amount: float = 0.0
    variance: float = 0.0
    notes: Optional[str] = None

class TaxRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tax_type: str
    period: str
    period_start: str
    period_end: str
    taxable_amount: float = 0.0
    tax_rate: float = 0.0
    tax_amount: float = 0.0
    status: str = "calculated"
    due_date: Optional[str] = None
    paid_date: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== EMPLOYEE MODELS ====================

class EmployeeBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    phone: str
    email: Optional[str] = None
    position: str
    department: str
    salary: float
    hire_date: str
    national_id: Optional[str] = None
    employee_code: Optional[str] = None
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    fingerprint_id: Optional[str] = None
    fingerprint_id_2: Optional[str] = None
    fingerprint_center: Optional[str] = None
    fingerprint_center_2: Optional[str] = None
    work_location: Optional[str] = None
    can_login: bool = False
    exclude_from_payroll: bool = False
    permissions: Optional[List[str]] = None
    manager_id: Optional[str] = None
    manager_name: Optional[str] = None
    username: Optional[str] = None
    leave_balance: float = 0.0  # رصيد الإجازات المتراكم
    monthly_leave_rate: float = 2.6  # معدل الإجازة الشهرية (افتراضي للموظفين)

class EmployeeCreate(EmployeeBase):
    pass

class Employee(EmployeeBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    weekly_off_days: Optional[List[int]] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EmployeeAllowances(BaseModel):
    model_config = ConfigDict(extra="ignore")
    housing_allowance: float = 0.0
    transportation_allowance: float = 0.0
    food_allowance: float = 0.0
    phone_allowance: float = 0.0
    fuel_allowance: float = 0.0
    education_allowance: float = 0.0
    medical_allowance: float = 0.0
    special_allowance: float = 0.0
    other_allowance: float = 0.0

class EmployeeSalaryStructure(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    basic_salary: float = 0.0
    allowances: EmployeeAllowances = Field(default_factory=EmployeeAllowances)
    total_salary: float = 0.0
    effective_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    is_active: bool = True
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SalaryHistoryBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    old_salary: float
    new_salary: float
    change_reason: str
    effective_date: str
    notes: Optional[str] = None

class SalaryHistoryCreate(SalaryHistoryBase):
    pass

class SalaryHistory(SalaryHistoryBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    changed_by: Optional[str] = None
    changed_by_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== ATTENDANCE MODELS ====================

class AttendanceBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    device_ip: Optional[str] = None
    source: str = "manual"
    work_location: Optional[str] = None
    total_hours: Optional[float] = None
    overtime_hours: Optional[float] = None

class AttendanceCreate(AttendanceBase):
    pass

class Attendance(AttendanceBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== LEAVE REQUEST MODELS ====================

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

# ==================== EXCUSE REQUEST MODELS ====================

class ExcuseRequestBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    excuse_date: str
    excuse_type: str
    reason: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    attachment_url: Optional[str] = None
    notes: Optional[str] = None

class ExcuseRequestCreate(ExcuseRequestBase):
    pass

class ExcuseRequest(ExcuseRequestBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    attendance_updated: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== EXPENSE REQUEST MODELS ====================

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

# ==================== CAR CONTRACT MODELS ====================

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

# ==================== OFFICIAL LETTER MODELS ====================

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

# ==================== FINGERPRINT DEVICE MODELS ====================

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

# ==================== SHIFT MODELS ====================

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

# ==================== OVERTIME MODELS ====================

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

# ==================== LOAN MODELS ====================

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

# ==================== EMPLOYEE DOCUMENT MODELS ====================

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

# ==================== PAYROLL MODELS ====================

class PayrollPeriod(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    start_date: str
    end_date: str
    total_days: int = 31
    status: str = "draft"  # draft, pending_hr, pending_finance, pending_gm, approved, disbursed
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    calculated_at: Optional[str] = None
    # HR Approval (المرحلة الأولى)
    hr_approved_at: Optional[str] = None
    hr_approved_by: Optional[str] = None
    hr_approved_by_name: Optional[str] = None
    # Finance Approval (المرحلة الثانية)
    finance_approved_at: Optional[str] = None
    finance_approved_by: Optional[str] = None
    finance_approved_by_name: Optional[str] = None
    # General Manager Final Approval (المرحلة الثالثة)
    gm_approved_at: Optional[str] = None
    gm_approved_by: Optional[str] = None
    gm_approved_by_name: Optional[str] = None
    # Legacy fields for backward compatibility
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
    work_location: Optional[str] = None
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
    total_overtime_hours: float = 0.0
    basic_salary: float = 0.0
    daily_rate: float = 0.0
    hourly_rate: float = 0.0
    total_pay_days: int = 0
    housing_allowance: float = 0.0
    transportation_allowance: float = 0.0
    food_allowance: float = 0.0
    phone_allowance: float = 0.0
    fuel_allowance: float = 0.0
    education_allowance: float = 0.0
    medical_allowance: float = 0.0
    special_allowance: float = 0.0
    other_allowance: float = 0.0
    total_allowances: float = 0.0
    allowances: float = 0.0
    gross_salary: float = 0.0
    deductions: float = 0.0
    loan_deduction: float = 0.0
    absence_deduction: float = 0.0
    other_deduction: float = 0.0
    total_deductions: float = 0.0
    overtime_pay: float = 0.0
    net_salary: float = 0.0
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== COLLECTION CENTER MODELS ====================

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

# ==================== ACTIVITY LOG MODELS ====================

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

# ==================== DEVICE SETTINGS MODELS ====================

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

# ==================== FEED MODELS ====================

class FeedCompanyBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    phone: str
    address: Optional[str] = None

class FeedCompanyCreate(FeedCompanyBase):
    pass

class FeedCompany(FeedCompanyBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class FeedTypeBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    company_id: str
    company_name: str
    unit: str = "kg"
    kg_per_unit: Optional[float] = None
    price_per_unit: float
    description: Optional[str] = None

class FeedTypeCreate(FeedTypeBase):
    pass

class FeedType(FeedTypeBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    min_stock_alert: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class FeedPurchaseBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    supplier_id: str
    supplier_name: str
    supplier_phone: Optional[str] = None
    supplier_address: Optional[str] = None
    feed_type_id: str
    feed_type_name: str
    company_name: str
    quantity: float
    price_per_unit: float
    unit: str = "kg"
    notes: Optional[str] = None

class FeedPurchaseCreate(FeedPurchaseBase):
    pass

class FeedPurchase(FeedPurchaseBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: Optional[str] = None
    purchase_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    total_amount: float = 0.0
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    is_approved: bool = False
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[str] = None
    signature_code: Optional[str] = None

# ==================== LEGAL MODULE MODELS ====================

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

# ==================== PROJECT MODELS ====================

class ProjectBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_code: Optional[str] = None
    name: str
    description: str
    project_type: str
    client_name: Optional[str] = None
    start_date: str
    end_date: str
    budget: float
    currency: str = "OMR"
    priority: str = "medium"
    manager_id: Optional[str] = None
    manager_name: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    objectives: Optional[str] = None
    deliverables: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "planning"
    progress_percentage: float = 0.0
    actual_cost: float = 0.0
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProjectTaskBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_id: str
    project_name: str
    task_name: str
    description: Optional[str] = None
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    start_date: str
    due_date: str
    priority: str = "medium"
    estimated_hours: Optional[float] = None
    parent_task_id: Optional[str] = None

class ProjectTaskCreate(ProjectTaskBase):
    pass

class ProjectTask(ProjectTaskBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    actual_hours: float = 0.0
    progress_percentage: float = 0.0
    completed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProjectTeamMemberBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_id: str
    project_name: str
    employee_id: str
    employee_name: str
    role: str
    allocation_percentage: float = 100.0
    start_date: str
    end_date: Optional[str] = None

class ProjectTeamMemberCreate(ProjectTeamMemberBase):
    pass

class ProjectTeamMember(ProjectTeamMemberBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProjectMilestoneBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_id: str
    project_name: str
    name: str
    description: Optional[str] = None
    due_date: str
    deliverables: Optional[str] = None
    payment_amount: Optional[float] = None

class ProjectMilestoneCreate(ProjectMilestoneBase):
    pass

class ProjectMilestone(ProjectMilestoneBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    achieved_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== OPERATIONS MODULE MODELS ====================

class DailyOperationBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    operation_date: str
    shift: str
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    supervisor_id: Optional[str] = None
    supervisor_name: Optional[str] = None
    milk_received_liters: float = 0.0
    milk_processed_liters: float = 0.0
    milk_sold_liters: float = 0.0
    wastage_liters: float = 0.0
    quality_issues: Optional[str] = None
    notes: Optional[str] = None
    weather_conditions: Optional[str] = None
    staff_present: int = 0

class DailyOperationCreate(DailyOperationBase):
    pass

class DailyOperation(DailyOperationBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "ongoing"
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EquipmentBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    equipment_code: Optional[str] = None
    name: str
    equipment_type: str
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    warranty_expiry: Optional[str] = None
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    location: Optional[str] = None
    specifications: Optional[str] = None

class EquipmentCreate(EquipmentBase):
    pass

class Equipment(EquipmentBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "operational"
    last_maintenance_date: Optional[str] = None
    next_maintenance_date: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MaintenanceRecordBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    equipment_id: str
    equipment_name: str
    maintenance_type: str
    description: str
    performed_by: Optional[str] = None
    vendor_name: Optional[str] = None
    cost: float = 0.0
    parts_replaced: Optional[str] = None
    maintenance_date: str
    next_maintenance_date: Optional[str] = None
    notes: Optional[str] = None

class MaintenanceRecordCreate(MaintenanceRecordBase):
    pass

class MaintenanceRecord(MaintenanceRecordBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "completed"
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class IncidentReportBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    incident_type: str
    title: str
    description: str
    incident_date: str
    incident_time: Optional[str] = None
    location: str
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    severity: str = "medium"
    reported_by_id: str
    reported_by_name: str
    witnesses: Optional[str] = None
    injuries: Optional[str] = None
    damage_description: Optional[str] = None
    estimated_damage_cost: Optional[float] = None
    immediate_actions: Optional[str] = None
    root_cause: Optional[str] = None
    preventive_measures: Optional[str] = None

class IncidentReportCreate(IncidentReportBase):
    pass

class IncidentReport(IncidentReportBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    incident_number: Optional[str] = None
    status: str = "reported"
    investigated_by: Optional[str] = None
    resolved_at: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VehicleBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    vehicle_code: Optional[str] = None
    vehicle_type: str
    brand: str
    model: str
    year: int
    plate_number: str
    color: Optional[str] = None
    vin_number: Optional[str] = None
    fuel_type: str = "diesel"
    tank_capacity: Optional[float] = None
    assigned_driver_id: Optional[str] = None
    assigned_driver_name: Optional[str] = None
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    insurance_expiry: Optional[str] = None
    registration_expiry: Optional[str] = None

class VehicleCreate(VehicleBase):
    pass

class Vehicle(VehicleBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "available"
    current_mileage: float = 0.0
    last_service_date: Optional[str] = None
    next_service_mileage: Optional[float] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== MARKETING MODULE MODELS ====================

class MarketingCampaignBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    campaign_type: str
    description: str
    objective: str
    target_audience: Optional[str] = None
    start_date: str
    end_date: str
    budget: float
    currency: str = "OMR"
    channels: Optional[List[str]] = None
    responsible_id: Optional[str] = None
    responsible_name: Optional[str] = None

class MarketingCampaignCreate(MarketingCampaignBase):
    pass

class MarketingCampaign(MarketingCampaignBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_code: Optional[str] = None
    status: str = "draft"
    actual_cost: float = 0.0
    leads_generated: int = 0
    conversions: int = 0
    reach: int = 0
    engagement: int = 0
    roi: float = 0.0
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LeadBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    company_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    lead_source: str
    interest: str
    notes: Optional[str] = None
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    expected_value: Optional[float] = None

class LeadCreate(LeadBase):
    pass

class Lead(LeadBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_code: Optional[str] = None
    status: str = "new"
    priority: str = "medium"
    last_contact_date: Optional[str] = None
    next_follow_up: Optional[str] = None
    conversion_date: Optional[str] = None
    lost_reason: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SocialMediaPostBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    platform: str
    post_type: str
    content: str
    scheduled_date: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    hashtags: Optional[List[str]] = None
    target_audience: Optional[str] = None

class SocialMediaPostCreate(SocialMediaPostBase):
    pass

class SocialMediaPost(SocialMediaPostBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "draft"
    published_at: Optional[str] = None
    likes: int = 0
    comments: int = 0
    shares: int = 0
    reach: int = 0
    engagement_rate: float = 0.0
    post_url: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SalesOfferBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    offer_type: str
    title: str
    description: str
    product_type: str
    discount_percentage: Optional[float] = None
    discount_amount: Optional[float] = None
    min_quantity: Optional[float] = None
    max_quantity: Optional[float] = None
    start_date: str
    end_date: str
    terms_conditions: Optional[str] = None
    target_customers: Optional[str] = None

class SalesOfferCreate(SalesOfferBase):
    pass

class SalesOffer(SalesOfferBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    offer_code: Optional[str] = None
    status: str = "draft"
    total_redemptions: int = 0
    total_revenue: float = 0.0
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MarketReturnBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    return_date: str
    customer_id: str
    customer_name: str
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    quantity_liters: float
    reason: str
    quality_grade: Optional[str] = None
    batch_number: Optional[str] = None
    notes: Optional[str] = None
    refund_amount: Optional[float] = None

class MarketReturnCreate(MarketReturnBase):
    pass

class MarketReturn(MarketReturnBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    return_code: Optional[str] = None
    status: str = "pending"
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    disposal_method: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MarketSalesSummaryBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    report_date: str
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    market_name: str
    total_quantity_sold: float
    total_revenue: float
    total_returns: float = 0.0
    net_quantity: float = 0.0
    net_revenue: float = 0.0
    notes: Optional[str] = None

class MarketSalesSummaryCreate(MarketSalesSummaryBase):
    pass

class MarketSalesSummary(MarketSalesSummaryBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== OFFICIAL HOLIDAY MODELS ====================

class OfficialHolidayBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    date: str
    applies_to: str = "all"
    is_recurring: bool = False
    is_paid: bool = True  # عطلة مدفوعة
    notes: Optional[str] = None

class OfficialHolidayCreate(OfficialHolidayBase):
    pass

class OfficialHoliday(OfficialHolidayBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EmployeeWeeklyOffBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    off_days: List[int]

class EmployeeWeeklyOffCreate(EmployeeWeeklyOffBase):
    pass

# ==================== ANALYSIS MODELS ====================

class AnalysisRequest(BaseModel):
    question: str
    category: Optional[str] = "general"

# ==================== USER SETTINGS MODELS ====================

class UserAppearanceSettings(BaseModel):
    background_id: Optional[str] = "bg1"
    background_url: Optional[str] = None
    theme: str = "light"
    sidebar_collapsed: bool = False

# ==================== ZKTECO MODELS ====================

class ZKTecoDeviceBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    ip_address: str
    port: int = 4370
    location: Optional[str] = None

class ZKTecoDeviceCreate(ZKTecoDeviceBase):
    pass

class ZKTecoDevice(ZKTecoDeviceBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    is_online: bool = False
    last_sync: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ZKTecoSyncSettings(BaseModel):
    auto_sync_enabled: bool = False
    sync_interval: int = 60

# ==================== WARNING MODELS ====================

class WarningBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    warning_type: str
    reason: str
    date: str
    notes: Optional[str] = None

class WarningCreate(WarningBase):
    pass

class Warning(WarningBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "active"
    issued_by: Optional[str] = None
    issued_by_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== PUBLIC HOLIDAY MODELS (For Salary Structures) ====================

class PublicHolidayBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    date: str
    year: int
    notes: Optional[str] = None

class PublicHolidayCreate(PublicHolidayBase):
    pass

class PublicHoliday(PublicHolidayBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())



# ==================== مهام السائقين (Driver Tasks) ====================

class DriverTaskBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    driver_id: str
    driver_name: str
    transport_type: str  # milk, petroleum
    vehicle_id: Optional[str] = None
    vehicle_plate: str
    vehicle_type: str  # truck, tanker, pickup
    quantity: float = 0  # كمية الحليب بالليتر
    transport_date: str
    transport_time: str
    from_location: str  # حجيف، غدو، زيك، ثمريت، طاقة، مرباط
    to_destination: str  # شركة الصفوة أو شركة أخرى
    destination_company: Optional[str] = None  # اسم الشركة إذا كان "أخرى"
    notes: Optional[str] = None
    status: str = "completed"  # completed, in_progress, cancelled

class DriverTaskCreate(DriverTaskBase):
    pass

class DriverTask(DriverTaskBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== سجل رصيد الإجازات (Leave Balance Log) ====================

class LeaveBalanceLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    month: str  # YYYY-MM
    amount_added: float
    previous_balance: float
    new_balance: float
    reason: str = "monthly_accrual"  # monthly_accrual, manual_adjustment, used
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ==================== نظام الصلاحيات (Permission System) ====================

# الأقسام المتاحة
DEPARTMENTS = [
    "الموارد البشرية",      # HR
    "المالية",              # Finance
    "المشتريات والمبيعات",  # Procurement & Sales
    "العمليات",             # Operations
    "المشاريع",             # Projects
    "التسويق",              # Marketing
    "القانون",              # Legal
    "تقنية المعلومات",      # IT
    "الإدارة العامة",       # General Management
]

# الصلاحيات المتاحة
AVAILABLE_PERMISSIONS = [
    # استلام الحليب
    "milk_reception_view",      # عرض استلامات الحليب
    "milk_reception_create",    # إنشاء استلام حليب
    "milk_reception_edit",      # تعديل استلام حليب
    "milk_reception_delete",    # حذف استلام حليب
    
    # إدارة الموردين
    "suppliers_view",           # عرض الموردين
    "suppliers_create",         # إضافة مورد
    "suppliers_edit",           # تعديل مورد
    "suppliers_delete",         # حذف مورد
    "suppliers_payment",        # دفع للموردين
    
    # إدارة العملاء
    "customers_view",           # عرض العملاء
    "customers_create",         # إضافة عميل
    "customers_edit",           # تعديل عميل
    "customers_delete",         # حذف عميل
    "customers_receipt",        # استلام من العملاء
    
    # المبيعات
    "sales_view",               # عرض المبيعات
    "sales_create",             # إنشاء عملية بيع
    "sales_edit",               # تعديل عملية بيع
    
    # التقارير
    "reports_view",             # عرض التقارير
    "reports_financial",        # التقارير المالية
    "reports_operational",      # التقارير التشغيلية
    "reports_export",           # تصدير التقارير
    
    # الموارد البشرية
    "hr_employees_view",        # عرض الموظفين
    "hr_employees_edit",        # تعديل بيانات الموظفين
    "hr_attendance_view",       # عرض الحضور
    "hr_attendance_edit",       # تعديل الحضور
    "hr_leaves_view",           # عرض الإجازات
    "hr_leaves_approve",        # الموافقة على الإجازات
    "hr_payroll_view",          # عرض كشف الرواتب
    "hr_payroll_edit",          # تعديل كشف الرواتب
    "hr_payroll_approve_hr",    # موافقة HR على الرواتب
    "hr_payroll_approve_finance", # موافقة المالية على الرواتب
    "hr_payroll_approve_gm",    # موافقة المدير العام على الرواتب
    
    # المخزون
    "inventory_view",           # عرض المخزون
    "inventory_edit",           # تعديل المخزون
    
    # الخزينة
    "treasury_view",            # عرض الخزينة
    "treasury_transactions",    # إجراء معاملات الخزينة
    
    # النظام والإعدادات
    "settings_view",            # عرض الإعدادات
    "settings_edit",            # تعديل الإعدادات
    "users_manage",             # إدارة المستخدمين
    "permissions_grant",        # منح الصلاحيات للآخرين
]

class DepartmentPermissions(BaseModel):
    """صلاحيات القسم"""
    model_config = ConfigDict(extra="ignore")
    department: str
    permissions: List[str] = []  # قائمة الصلاحيات المتاحة لهذا القسم

class UserPermissionGrant(BaseModel):
    """منح صلاحية لموظف"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    permission: str
    granted_by: str
    granted_by_name: str
    granted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: Optional[str] = None  # تاريخ انتهاء الصلاحية (اختياري)
    is_active: bool = True

