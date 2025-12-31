from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import io
import secrets
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'milk-erp-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Email Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'mail.almoroojdairy.om')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL', 'noreply@almoroojdairy.om')

security = HTTPBearer()

# Create the main app
app = FastAPI(title="Milk Collection Center ERP")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Default collection centers (مراكز التجميع الافتراضية)
DEFAULT_CENTERS = [
    {"name": "حجيف", "code": "HAJIF", "address": "عُمان", "is_active": True},
    {"name": "زيك", "code": "ZEEK", "address": "عُمان", "is_active": True},
    {"name": "غدو", "code": "GHADU", "address": "عُمان", "is_active": True},
]

@app.on_event("startup")
async def startup_event():
    """Initialize default collection centers on startup"""
    try:
        for center_data in DEFAULT_CENTERS:
            # Check if center already exists by code
            existing = await db.collection_centers.find_one({"code": center_data["code"]})
            if not existing:
                center = CollectionCenter(**center_data)
                await db.collection_centers.insert_one(center.model_dump())
                logging.info(f"Created default center: {center_data['name']}")
            else:
                logging.info(f"Center already exists: {center_data['name']}")
    except Exception as e:
        logging.error(f"Error initializing default centers: {e}")

# ==================== MODELS ====================

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    username: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str = "employee"  # admin, employee, accountant
    center_id: Optional[str] = None  # مركز التجميع
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

# Supplier (Farmer) Models
class SupplierBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    phone: str
    address: str
    supplier_code: Optional[str] = None
    bank_account: Optional[str] = None
    center_id: Optional[str] = None  # مركز التجميع
    center_name: Optional[str] = None
    national_id: Optional[str] = None
    farm_size: Optional[float] = None
    cattle_count: Optional[int] = None
    milk_type: Optional[str] = "cow"  # cow (أبقار), camel (إبل), goat (ماعز), mixed (مختلط)

class SupplierCreate(SupplierBase):
    pass

class Supplier(SupplierBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_active: bool = True
    total_supplied: float = 0.0
    balance: float = 0.0

# Milk Reception Models
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

# Customer Models
class CustomerBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    phone: str
    address: str
    customer_type: str = "retail"  # retail, wholesale, factory
    credit_limit: float = 0.0

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_active: bool = True
    total_purchases: float = 0.0
    balance: float = 0.0

# Sale Models
class SaleBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    customer_id: str
    customer_name: str
    quantity_liters: float
    price_per_liter: float
    sale_type: str = "cash"  # cash, credit

class SaleCreate(SaleBase):
    pass

class Sale(SaleBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sale_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    total_amount: float = 0.0
    is_paid: bool = False
    created_by: Optional[str] = None

# Inventory Models
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

# Payment Models
class PaymentBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    payment_type: str  # supplier_payment, customer_receipt
    related_id: str
    related_name: str
    amount: float
    payment_method: str = "cash"  # cash, bank_transfer, check
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    # Approval workflow fields
    status: str = "pending"  # pending, approved, rejected
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None

# Approval request model
class PaymentApproval(BaseModel):
    action: str  # approve, reject
    reason: Optional[str] = None

# Treasury Models (نماذج الخزينة)
class TreasuryTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_type: str  # deposit (إيداع), withdrawal (سحب)
    amount: float
    source_type: str  # milk_sale, supplier_payment, customer_receipt, expense, other
    source_id: Optional[str] = None  # معرف العملية المصدر
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

# Employee Models (نماذج الموظفين المُحسّنة)
class EmployeeBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    phone: str
    email: Optional[str] = None
    position: str
    department: str  # purchasing, finance, milk_reception, hr, it, admin
    salary: float
    hire_date: str
    national_id: Optional[str] = None
    employee_code: Optional[str] = None
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    fingerprint_id: Optional[str] = None  # معرف البصمة
    can_login: bool = False  # هل يمكنه تسجيل الدخول للنظام
    permissions: Optional[List[str]] = None  # الصلاحيات
    manager_id: Optional[str] = None  # معرف المسؤول
    manager_name: Optional[str] = None  # اسم المسؤول
    username: Optional[str] = None  # اسم المستخدم للدخول

class EmployeeCreate(EmployeeBase):
    pass

class Employee(EmployeeBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Attendance Models (نماذج الحضور والانصراف)
class AttendanceBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    device_ip: Optional[str] = None
    source: str = "manual"  # manual, fingerprint

class AttendanceCreate(AttendanceBase):
    pass

class Attendance(AttendanceBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Leave Request Models (نماذج طلبات الإجازة)
class LeaveRequestBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    leave_type: str  # annual, sick, emergency, unpaid
    start_date: str
    end_date: str
    reason: Optional[str] = None
    days_count: int

class LeaveRequestCreate(LeaveRequestBase):
    pass

class LeaveRequest(LeaveRequestBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"  # pending, approved, rejected
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Expense Request Models (نماذج طلبات المصاريف)
class ExpenseRequestBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    expense_type: str  # travel, equipment, office, other
    amount: float
    description: str
    receipt_url: Optional[str] = None

class ExpenseRequestCreate(ExpenseRequestBase):
    pass

class ExpenseRequest(ExpenseRequestBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"  # pending, approved, rejected, paid
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    paid_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Car Contract Models (نماذج عقود السيارات)
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
    contract_type: str = "rent"  # rent, ownership
    notes: Optional[str] = None

class CarContractCreate(CarContractBase):
    pass

class CarContract(CarContractBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "active"  # active, expired, cancelled
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Official Letter Models (نماذج الرسائل الرسمية)
class OfficialLetterBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    department: Optional[str] = None
    position: Optional[str] = None
    letter_type: str  # salary_certificate, employment_letter, experience_letter, mission_letter, no_objection, leave_request
    purpose: Optional[str] = None
    recipient: Optional[str] = None
    content: Optional[str] = None
    # For leave requests
    leave_start_date: Optional[str] = None
    leave_end_date: Optional[str] = None
    leave_type: Optional[str] = None  # annual, sick, unpaid, emergency

class OfficialLetterCreate(OfficialLetterBase):
    pass

class OfficialLetter(OfficialLetterBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    letter_number: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected, issued
    requested_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    # HR Manager approval (electronic signature)
    is_approved: bool = False
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[str] = None
    signature_code: Optional[str] = None
    rejection_reason: Optional[str] = None
    # Printing info
    is_printed: bool = False
    printed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Fingerprint Device Models (نماذج أجهزة البصمة)
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

# Payroll Models (نماذج الرواتب)
class PayrollPeriod(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "نوفمبر-ديسمبر 2025"
    start_date: str  # e.g., "2025-11-16"
    end_date: str  # e.g., "2025-12-15"
    total_days: int = 31
    status: str = "draft"  # draft, calculated, approved, paid
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
    # Attendance summary
    working_days: int = 0  # أيام العمل الفعلية
    day_off: int = 0  # أيام الإجازة الأسبوعية
    sick_leave: int = 0  # إجازة مرضية SL
    compensation_leave: int = 0  # إجازة تعويضية CL
    public_holiday: int = 0  # عطلة رسمية PH
    annual_leave: int = 0  # إجازة سنوية AL
    emergency_leave: int = 0  # إجازة طارئة EL
    on_duty: int = 0  # في مهمة OD
    exam_leave: int = 0  # إجازة امتحانات DL/EX-L
    father_leave: int = 0  # إجازة أبوة FL
    accompanying_leave: int = 0  # إجازة مرافقة ACOL
    unpaid_leave: int = 0  # إجازة بدون راتب LWP
    absent_days: int = 0  # غياب AB
    otp_days: int = 0  # عطل بصمة OTP
    # Salary calculation
    basic_salary: float = 0.0
    daily_rate: float = 0.0
    total_pay_days: int = 0  # إجمالي الأيام المستحقة
    gross_salary: float = 0.0  # الراتب الإجمالي
    deductions: float = 0.0  # الخصومات
    overtime_pay: float = 0.0  # بدل العمل الإضافي
    allowances: float = 0.0  # البدلات
    net_salary: float = 0.0  # صافي الراتب
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Collection Center Models (مراكز التجميع)
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

# Activity Log Models (سجل النشاط)
class ActivityLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    action: str  # login, logout, create_supplier, create_reception, etc.
    entity_type: Optional[str] = None  # supplier, milk_reception, sale, etc.
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    details: Optional[str] = None
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Device Settings Models (إعدادات الأجهزة)
class DeviceSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    center_id: str
    device_type: str  # scale, fat_analyzer, quality_tester, camera
    device_name: str
    connection_type: str = "manual"  # manual, automatic, api
    port: Optional[str] = None
    ip_address: Optional[str] = None
    api_endpoint: Optional[str] = None
    is_active: bool = True
    last_sync: Optional[str] = None

# ==================== LEGAL MODULE MODELS (قسم القانون) ====================

# Legal Contract Models (العقود القانونية)
class LegalContractBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    contract_number: Optional[str] = None
    contract_type: str  # employment, vendor, service, lease, partnership, other
    title: str
    party_name: str  # اسم الطرف الآخر
    party_type: str  # individual, company, government
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
    status: str = "active"  # draft, active, expired, terminated, renewed
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Legal Case Models (القضايا القانونية)
class LegalCaseBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    case_number: Optional[str] = None
    case_type: str  # litigation, arbitration, dispute, complaint, regulatory
    title: str
    description: str
    plaintiff: str  # المدعي
    defendant: str  # المدعى عليه
    court_name: Optional[str] = None
    filing_date: str
    hearing_date: Optional[str] = None
    lawyer_name: Optional[str] = None
    lawyer_contact: Optional[str] = None
    estimated_value: Optional[float] = None
    priority: str = "medium"  # low, medium, high, critical
    notes: Optional[str] = None
    attachments: Optional[List[str]] = None

class LegalCaseCreate(LegalCaseBase):
    pass

class LegalCase(LegalCaseBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "open"  # open, in_progress, closed, won, lost, settled
    outcome: Optional[str] = None
    settlement_amount: Optional[float] = None
    closed_at: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Legal Consultation Models (الاستشارات القانونية)
class LegalConsultationBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    requester_id: str
    requester_name: str
    department: str
    subject: str
    description: str
    urgency: str = "normal"  # low, normal, urgent, critical
    consultation_type: str  # contract_review, legal_advice, compliance, other

class LegalConsultationCreate(LegalConsultationBase):
    pass

class LegalConsultation(LegalConsultationBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"  # pending, in_review, completed
    response: Optional[str] = None
    responded_by: Optional[str] = None
    responded_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Legal Document Models (المستندات القانونية)
class LegalDocumentBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    document_type: str  # policy, regulation, agreement, certificate, license, permit
    title: str
    description: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    issuing_authority: Optional[str] = None
    reference_number: Optional[str] = None
    file_url: Optional[str] = None
    related_entity_type: Optional[str] = None  # contract, case, employee
    related_entity_id: Optional[str] = None

class LegalDocumentCreate(LegalDocumentBase):
    pass

class LegalDocument(LegalDocumentBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "valid"  # valid, expired, revoked
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== PROJECTS MODULE MODELS (قسم المشاريع) ====================

# Project Models (المشاريع)
class ProjectBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_code: Optional[str] = None
    name: str
    description: str
    project_type: str  # construction, it, marketing, research, operational, other
    client_name: Optional[str] = None
    start_date: str
    end_date: str
    budget: float
    currency: str = "OMR"
    priority: str = "medium"  # low, medium, high, critical
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
    status: str = "planning"  # planning, in_progress, on_hold, completed, cancelled
    progress_percentage: float = 0.0
    actual_cost: float = 0.0
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Project Task Models (مهام المشروع)
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
    priority: str = "medium"  # low, medium, high, critical
    estimated_hours: Optional[float] = None
    parent_task_id: Optional[str] = None

class ProjectTaskCreate(ProjectTaskBase):
    pass

class ProjectTask(ProjectTaskBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"  # pending, in_progress, completed, cancelled
    actual_hours: float = 0.0
    progress_percentage: float = 0.0
    completed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Project Team Member Models (أعضاء فريق المشروع)
class ProjectTeamMemberBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_id: str
    project_name: str
    employee_id: str
    employee_name: str
    role: str  # manager, developer, analyst, designer, tester, coordinator
    allocation_percentage: float = 100.0
    start_date: str
    end_date: Optional[str] = None

class ProjectTeamMemberCreate(ProjectTeamMemberBase):
    pass

class ProjectTeamMember(ProjectTeamMemberBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Project Milestone Models (المراحل الرئيسية)
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
    status: str = "pending"  # pending, achieved, missed
    achieved_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== OPERATIONS MODULE MODELS (قسم العمليات) ====================

# Daily Operation Models (العمليات اليومية)
class DailyOperationBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    operation_date: str
    shift: str  # morning, afternoon, night
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
    status: str = "ongoing"  # ongoing, completed, reviewed
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Equipment Models (المعدات)
class EquipmentBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    equipment_code: Optional[str] = None
    name: str
    equipment_type: str  # tank, cooler, pump, scale, analyzer, vehicle, generator, other
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
    status: str = "operational"  # operational, maintenance, out_of_order, retired
    last_maintenance_date: Optional[str] = None
    next_maintenance_date: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Maintenance Record Models (سجلات الصيانة)
class MaintenanceRecordBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    equipment_id: str
    equipment_name: str
    maintenance_type: str  # preventive, corrective, emergency, inspection
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
    status: str = "completed"  # scheduled, in_progress, completed, cancelled
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Incident Report Models (تقارير الحوادث)
class IncidentReportBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    incident_type: str  # accident, equipment_failure, quality_issue, safety, environmental, other
    title: str
    description: str
    incident_date: str
    incident_time: Optional[str] = None
    location: str
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    severity: str = "medium"  # low, medium, high, critical
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
    status: str = "reported"  # reported, investigating, resolved, closed
    investigated_by: Optional[str] = None
    resolved_at: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Vehicle Fleet Models (أسطول المركبات)
class VehicleBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    vehicle_code: Optional[str] = None
    vehicle_type: str  # truck, tanker, pickup, car, motorcycle
    brand: str
    model: str
    year: int
    plate_number: str
    color: Optional[str] = None
    vin_number: Optional[str] = None
    fuel_type: str = "diesel"  # diesel, petrol, electric, hybrid
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
    status: str = "available"  # available, in_use, maintenance, out_of_service
    current_mileage: float = 0.0
    last_service_date: Optional[str] = None
    next_service_mileage: Optional[float] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== MARKETING MODULE MODELS (قسم التسويق) ====================

# Password Reset Token Model
class PasswordResetToken(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    email: str
    token: str
    expires_at: str
    used: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Marketing Campaign Models (الحملات التسويقية)
class MarketingCampaignBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    campaign_type: str  # social_media, email, sms, billboard, tv, radio, event, other
    description: str
    objective: str  # awareness, leads, sales, retention
    target_audience: Optional[str] = None
    start_date: str
    end_date: str
    budget: float
    currency: str = "OMR"
    channels: Optional[List[str]] = None  # facebook, instagram, twitter, whatsapp, email
    responsible_id: Optional[str] = None
    responsible_name: Optional[str] = None

class MarketingCampaignCreate(MarketingCampaignBase):
    pass

class MarketingCampaign(MarketingCampaignBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_code: Optional[str] = None
    status: str = "draft"  # draft, active, paused, completed, cancelled
    actual_cost: float = 0.0
    leads_generated: int = 0
    conversions: int = 0
    reach: int = 0
    engagement: int = 0
    roi: float = 0.0
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Lead Models (العملاء المحتملين)
class LeadBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    company_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    lead_source: str  # website, social_media, referral, cold_call, event, advertisement, other
    interest: str  # milk_supply, milk_purchase, partnership, other
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
    status: str = "new"  # new, contacted, qualified, proposal, negotiation, won, lost
    priority: str = "medium"  # low, medium, high
    last_contact_date: Optional[str] = None
    next_follow_up: Optional[str] = None
    conversion_date: Optional[str] = None
    lost_reason: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Social Media Post Models (منشورات التواصل الاجتماعي)
class SocialMediaPostBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    platform: str  # facebook, instagram, twitter, linkedin, whatsapp, tiktok
    post_type: str  # text, image, video, story, reel, carousel
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
    status: str = "draft"  # draft, scheduled, published, failed
    published_at: Optional[str] = None
    likes: int = 0
    comments: int = 0
    shares: int = 0
    reach: int = 0
    engagement_rate: float = 0.0
    post_url: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Sales Offer Models (عروض المبيعات)
class SalesOfferBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    offer_type: str  # discount, bundle, bulk, seasonal, promotional
    title: str
    description: str
    product_type: str  # raw_milk, processed_milk, all
    discount_percentage: Optional[float] = None
    discount_amount: Optional[float] = None
    min_quantity: Optional[float] = None
    max_quantity: Optional[float] = None
    start_date: str
    end_date: str
    terms_conditions: Optional[str] = None
    target_customers: Optional[str] = None  # all, new, existing, vip

class SalesOfferCreate(SalesOfferBase):
    pass

class SalesOffer(SalesOfferBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    offer_code: Optional[str] = None
    status: str = "draft"  # draft, active, expired, cancelled
    total_redemptions: int = 0
    total_revenue: float = 0.0
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Market Return Models (مرتجعات السوق)
class MarketReturnBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    return_date: str
    customer_id: str
    customer_name: str
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    quantity_liters: float
    reason: str  # quality_issue, expired, damaged, excess, other
    quality_grade: Optional[str] = None  # A, B, C, rejected
    batch_number: Optional[str] = None
    notes: Optional[str] = None
    refund_amount: Optional[float] = None

class MarketReturnCreate(MarketReturnBase):
    pass

class MarketReturn(MarketReturnBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    return_code: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected, processed
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    disposal_method: Optional[str] = None  # reprocess, dispose, return_to_supplier
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Market Sales Summary Models (ملخص مبيعات السوق)
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

# Feed Company Models (شركات الأعلاف)
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

# Feed Type Models (أنواع الأعلاف)
class FeedTypeBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    company_id: str
    company_name: str
    unit: str = "kg"  # kg, bag, ton
    kg_per_unit: Optional[float] = None  # رقم الكيلو للوحدة
    price_per_unit: float
    description: Optional[str] = None

class FeedTypeCreate(FeedTypeBase):
    pass

class FeedType(FeedTypeBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Feed Purchase Models (مشتريات الأعلاف من رصيد المورد)
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
    # Electronic signature fields
    is_approved: bool = False
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[str] = None
    signature_code: Optional[str] = None  # كود التصديق الإلكتروني

# ==================== AUTHENTICATION ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

# Activity logging helper
async def log_activity(user_id: str, user_name: str, action: str, entity_type: str = None, 
                       entity_id: str = None, entity_name: str = None, details: str = None,
                       center_id: str = None, center_name: str = None):
    activity = ActivityLog(
        user_id=user_id,
        user_name=user_name,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        details=details,
        center_id=center_id,
        center_name=center_name
    )
    await db.activity_logs.insert_one(activity.model_dump())

# Email sending helper
SMTP_USE_SSL = os.environ.get('SMTP_USE_SSL', 'false').lower() == 'true'

async def send_email(to_email: str, subject: str, html_content: str):
    """Send email using SMTP"""
    try:
        message = MIMEMultipart("alternative")
        message["From"] = SMTP_FROM_EMAIL
        message["To"] = to_email
        message["Subject"] = subject
        
        html_part = MIMEText(html_content, "html", "utf-8")
        message.attach(html_part)
        
        # Use SSL for port 465, TLS for other ports
        if SMTP_USE_SSL or SMTP_PORT == 465:
            await aiosmtplib.send(
                message,
                hostname=SMTP_HOST,
                port=SMTP_PORT,
                username=SMTP_USER,
                password=SMTP_PASSWORD,
                use_tls=True  # SSL/TLS connection
            )
        else:
            await aiosmtplib.send(
                message,
                hostname=SMTP_HOST,
                port=SMTP_PORT,
                username=SMTP_USER,
                password=SMTP_PASSWORD,
                start_tls=True  # STARTTLS
            )
        return True
    except Exception as e:
        logging.error(f"Error sending email: {e}")
        return False

async def send_password_reset_email(email: str, token: str, full_name: str):
    """Send password reset email"""
    reset_link = f"{os.environ.get('FRONTEND_URL', 'https://milk-erp.preview.emergentagent.com')}/reset-password?token={token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #8B4513, #D2691E); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #8B4513; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>المروج للألبان</h1>
            </div>
            <div class="content">
                <h2>مرحباً {full_name}</h2>
                <p>تم طلب استرجاع كلمة المرور لحسابك في نظام المروج للألبان.</p>
                <p>اضغط على الزر أدناه لإعادة تعيين كلمة المرور:</p>
                <p style="text-align: center;">
                    <a href="{reset_link}" class="button">إعادة تعيين كلمة المرور</a>
                </p>
                <p><strong>ملاحظة:</strong> هذا الرابط صالح لمدة ساعة واحدة فقط.</p>
                <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.</p>
            </div>
            <div class="footer">
                <p>© 2025 المروج للألبان - جميع الحقوق محفوظة</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(email, "إعادة تعيين كلمة المرور - المروج للألبان", html_content)

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    user = User(**user_data.model_dump(exclude={"password"}))
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    
    token = create_access_token({"sub": user.id, "role": user.role})
    return Token(
        access_token=token,
        token_type="bearer",
        user={"id": user.id, "username": user.username, "email": user.email, "full_name": user.full_name, "role": user.role}
    )

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username})
    # Check for both password and password_hash fields for compatibility
    password_field = user.get("password_hash") or user.get("password") if user else None
    if not user or not password_field or not verify_password(credentials.password, password_field):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    
    # Log login activity
    await log_activity(
        user_id=user["id"],
        user_name=user["full_name"],
        action="login",
        details="تسجيل دخول للنظام"
    )
    
    return Token(
        access_token=token,
        token_type="bearer",
        user={
            "id": user["id"], 
            "username": user["username"], 
            "email": user["email"], 
            "full_name": user["full_name"], 
            "role": user["role"], 
            "phone": user.get("phone"), 
            "avatar_url": user.get("avatar_url"), 
            "department": user.get("department"),
            "permissions": user.get("permissions", [])
        }
    )

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.put("/auth/profile")
async def update_profile(profile_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": update_data}
        )
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return user

@api_router.put("/auth/password")
async def change_password(password_data: PasswordChange, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]})
    password_field = user.get("password_hash") or user.get("password") if user else None
    if not password_field or not verify_password(password_data.current_password, password_field):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hash = hash_password(password_data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password_hash": new_hash, "password": new_hash}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="password_change",
        details="تغيير كلمة المرور"
    )
    
    return {"message": "Password changed successfully"}

# Password Reset Endpoints
@api_router.post("/auth/forgot-password")
async def forgot_password(email: str = Form(...)):
    """Request password reset - sends email with reset link"""
    user = await db.users.find_one({"email": email})
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If the email exists, a reset link will be sent"}
    
    # Generate reset token
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    
    reset_token = PasswordResetToken(
        user_id=user["id"],
        email=email,
        token=token,
        expires_at=expires_at
    )
    
    # Invalidate any existing tokens for this user
    await db.password_reset_tokens.update_many(
        {"user_id": user["id"], "used": False},
        {"$set": {"used": True}}
    )
    
    # Save new token
    await db.password_reset_tokens.insert_one(reset_token.model_dump())
    
    # Send email
    email_sent = await send_password_reset_email(email, token, user["full_name"])
    
    if email_sent:
        await log_activity(
            user_id=user["id"],
            user_name=user["full_name"],
            action="password_reset_request",
            details=f"طلب استرجاع كلمة المرور للبريد: {email}"
        )
    
    return {"message": "If the email exists, a reset link will be sent", "email_sent": email_sent}

@api_router.post("/auth/reset-password")
async def reset_password(token: str = Form(...), new_password: str = Form(...)):
    """Reset password using token from email"""
    reset_token = await db.password_reset_tokens.find_one({
        "token": token,
        "used": False
    })
    
    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if token expired
    expires_at = datetime.fromisoformat(reset_token["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update password
    new_hash = hash_password(new_password)
    await db.users.update_one(
        {"id": reset_token["user_id"]},
        {"$set": {"password": new_hash}}
    )
    
    # Mark token as used
    await db.password_reset_tokens.update_one(
        {"token": token},
        {"$set": {"used": True}}
    )
    
    user = await db.users.find_one({"id": reset_token["user_id"]})
    
    await log_activity(
        user_id=reset_token["user_id"],
        user_name=user["full_name"] if user else "Unknown",
        action="password_reset_complete",
        details="تم إعادة تعيين كلمة المرور بنجاح"
    )
    
    return {"message": "Password reset successfully"}

@api_router.get("/auth/verify-reset-token")
async def verify_reset_token(token: str):
    """Verify if reset token is valid"""
    reset_token = await db.password_reset_tokens.find_one({
        "token": token,
        "used": False
    })
    
    if not reset_token:
        return {"valid": False, "message": "Invalid token"}
    
    expires_at = datetime.fromisoformat(reset_token["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        return {"valid": False, "message": "Token expired"}
    
    return {"valid": True, "email": reset_token["email"]}

# ==================== COLLECTION CENTER ROUTES (مراكز التجميع) ====================

@api_router.get("/centers", response_model=List[CollectionCenter])
async def get_centers(current_user: dict = Depends(get_current_user)):
    centers = await db.collection_centers.find({"is_active": True}, {"_id": 0}).to_list(100)
    return centers

@api_router.post("/centers", response_model=CollectionCenter)
async def create_center(center_data: CollectionCenterCreate, current_user: dict = Depends(require_role(["admin"]))):
    center = CollectionCenter(**center_data.model_dump())
    await db.collection_centers.insert_one(center.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_center",
        entity_type="center",
        entity_id=center.id,
        entity_name=center.name,
        details=f"إنشاء مركز تجميع: {center.name}"
    )
    
    return center

@api_router.put("/centers/{center_id}", response_model=CollectionCenter)
async def update_center(center_id: str, center_data: CollectionCenterCreate, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.collection_centers.update_one(
        {"id": center_id},
        {"$set": center_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Center not found")
    center = await db.collection_centers.find_one({"id": center_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_center",
        entity_type="center",
        entity_id=center_id,
        entity_name=center.get("name"),
        details=f"تعديل مركز تجميع: {center.get('name')}"
    )
    
    return center

@api_router.delete("/centers/{center_id}")
async def delete_center(center_id: str, current_user: dict = Depends(require_role(["admin"]))):
    center = await db.collection_centers.find_one({"id": center_id}, {"_id": 0})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")
    
    result = await db.collection_centers.update_one(
        {"id": center_id},
        {"$set": {"is_active": False}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="delete_center",
        entity_type="center",
        entity_id=center_id,
        entity_name=center.get("name"),
        details=f"حذف مركز تجميع: {center.get('name')}"
    )
    
    return {"message": "Center deleted successfully"}

# ==================== ACTIVITY LOG ROUTES (سجل النشاط) ====================

@api_router.get("/activity-logs")
async def get_activity_logs(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if user_id:
        query["user_id"] = user_id
    if action:
        query["action"] = action
    if start_date:
        query["timestamp"] = {"$gte": start_date}
    if end_date:
        if "timestamp" in query:
            query["timestamp"]["$lte"] = end_date
        else:
            query["timestamp"] = {"$lte": end_date}
    
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return logs

# ==================== SUPPLIER ROUTES ====================

@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(supplier_data: SupplierCreate, current_user: dict = Depends(get_current_user)):
    supplier = Supplier(**supplier_data.model_dump())
    await db.suppliers.insert_one(supplier.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_supplier",
        entity_type="supplier",
        entity_id=supplier.id,
        entity_name=supplier.name,
        center_id=supplier.center_id,
        center_name=supplier.center_name,
        details=f"إضافة مورد: {supplier.name}"
    )
    
    return supplier

@api_router.get("/suppliers", response_model=List[Supplier])
async def get_suppliers(center_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"is_active": True}
    if center_id:
        query["center_id"] = center_id
    suppliers = await db.suppliers.find(query, {"_id": 0}).to_list(1000)
    return suppliers

@api_router.get("/suppliers/{supplier_id}", response_model=Supplier)
async def get_supplier(supplier_id: str, current_user: dict = Depends(get_current_user)):
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@api_router.put("/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(supplier_id: str, supplier_data: SupplierCreate, current_user: dict = Depends(get_current_user)):
    result = await db.suppliers.update_one(
        {"id": supplier_id},
        {"$set": supplier_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_supplier",
        entity_type="supplier",
        entity_id=supplier_id,
        entity_name=supplier.get("name"),
        details=f"تعديل بيانات مورد: {supplier.get('name')}"
    )
    
    return supplier

@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, current_user: dict = Depends(require_role(["admin"]))):
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    result = await db.suppliers.update_one(
        {"id": supplier_id},
        {"$set": {"is_active": False}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="delete_supplier",
        entity_type="supplier",
        entity_id=supplier_id,
        entity_name=supplier.get("name"),
        details=f"حذف مورد: {supplier.get('name')}"
    )
    
    return {"message": "Supplier deleted successfully"}

# ==================== MILK RECEPTION ROUTES ====================

@api_router.post("/milk-receptions", response_model=MilkReception)
async def create_milk_reception(reception_data: MilkReceptionCreate, current_user: dict = Depends(get_current_user)):
    reception = MilkReception(**reception_data.model_dump())
    reception.total_amount = reception.quantity_liters * reception.price_per_liter
    reception.created_by = current_user["id"]
    
    await db.milk_receptions.insert_one(reception.model_dump())
    
    # Update supplier's total supplied
    await db.suppliers.update_one(
        {"id": reception.supplier_id},
        {"$inc": {"total_supplied": reception.quantity_liters, "balance": reception.total_amount}}
    )
    
    # Update inventory
    await db.inventory.update_one(
        {"product_type": "raw_milk"},
        {"$inc": {"quantity_liters": reception.quantity_liters}, "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_milk_reception",
        entity_type="milk_reception",
        entity_id=reception.id,
        entity_name=reception.supplier_name,
        details=f"استلام حليب: {reception.quantity_liters} لتر من {reception.supplier_name}"
    )
    
    return reception

@api_router.get("/milk-receptions", response_model=List[MilkReception])
async def get_milk_receptions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    supplier_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if supplier_id:
        query["supplier_id"] = supplier_id
    if start_date:
        query["reception_date"] = {"$gte": start_date}
    if end_date:
        if "reception_date" in query:
            query["reception_date"]["$lte"] = end_date
        else:
            query["reception_date"] = {"$lte": end_date}
    
    receptions = await db.milk_receptions.find(query, {"_id": 0}).sort("reception_date", -1).to_list(1000)
    return receptions

@api_router.get("/milk-receptions/{reception_id}", response_model=MilkReception)
async def get_milk_reception(reception_id: str, current_user: dict = Depends(get_current_user)):
    reception = await db.milk_receptions.find_one({"id": reception_id}, {"_id": 0})
    if not reception:
        raise HTTPException(status_code=404, detail="Milk reception not found")
    return reception

# ==================== CUSTOMER ROUTES ====================

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer_data: CustomerCreate, current_user: dict = Depends(get_current_user)):
    customer = Customer(**customer_data.model_dump())
    await db.customers.insert_one(customer.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_customer",
        entity_type="customer",
        entity_id=customer.id,
        entity_name=customer.name,
        details=f"إضافة عميل: {customer.name}"
    )
    
    return customer

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(current_user: dict = Depends(get_current_user)):
    customers = await db.customers.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return customers

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_data: CustomerCreate, current_user: dict = Depends(get_current_user)):
    result = await db.customers.update_one(
        {"id": customer_id},
        {"$set": customer_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_customer",
        entity_type="customer",
        entity_id=customer_id,
        entity_name=customer.get("name"),
        details=f"تعديل بيانات عميل: {customer.get('name')}"
    )
    
    return customer

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(require_role(["admin"]))):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    result = await db.customers.update_one(
        {"id": customer_id},
        {"$set": {"is_active": False}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="delete_customer",
        entity_type="customer",
        entity_id=customer_id,
        entity_name=customer.get("name"),
        details=f"حذف عميل: {customer.get('name')}"
    )
    
    return {"message": "Customer deleted successfully"}

# ==================== SALES ROUTES ====================

@api_router.post("/sales", response_model=Sale)
async def create_sale(sale_data: SaleCreate, current_user: dict = Depends(get_current_user)):
    sale = Sale(**sale_data.model_dump())
    sale.total_amount = sale.quantity_liters * sale.price_per_liter
    sale.created_by = current_user["id"]
    sale.is_paid = sale.sale_type == "cash"
    
    await db.sales.insert_one(sale.model_dump())
    
    # Update customer's total purchases
    balance_change = 0 if sale.is_paid else sale.total_amount
    await db.customers.update_one(
        {"id": sale.customer_id},
        {"$inc": {"total_purchases": sale.total_amount, "balance": balance_change}}
    )
    
    # Update inventory
    await db.inventory.update_one(
        {"product_type": "raw_milk"},
        {"$inc": {"quantity_liters": -sale.quantity_liters}, "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_sale",
        entity_type="sale",
        entity_id=sale.id,
        entity_name=sale.customer_name,
        details=f"عملية بيع: {sale.quantity_liters} لتر إلى {sale.customer_name} - {sale.total_amount} ر.ع"
    )
    
    return sale

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    customer_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    if start_date:
        query["sale_date"] = {"$gte": start_date}
    if end_date:
        if "sale_date" in query:
            query["sale_date"]["$lte"] = end_date
        else:
            query["sale_date"] = {"$lte": end_date}
    
    sales = await db.sales.find(query, {"_id": 0}).sort("sale_date", -1).to_list(1000)
    return sales

# ==================== INVENTORY ROUTES ====================

@api_router.get("/inventory")
async def get_inventory(current_user: dict = Depends(get_current_user)):
    inventory = await db.inventory.find({}, {"_id": 0}).to_list(100)
    return inventory

@api_router.post("/inventory", response_model=Inventory)
async def create_inventory(inventory_data: InventoryBase, current_user: dict = Depends(require_role(["admin", "employee"]))):
    inventory = Inventory(**inventory_data.model_dump())
    await db.inventory.insert_one(inventory.model_dump())
    return inventory

@api_router.put("/inventory/{inventory_id}")
async def update_inventory(inventory_id: str, inventory_data: InventoryUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in inventory_data.model_dump().items() if v is not None}
    update_data["last_updated"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.inventory.update_one(
        {"id": inventory_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    inventory = await db.inventory.find_one({"id": inventory_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_inventory",
        entity_type="inventory",
        entity_id=inventory_id,
        entity_name=inventory.get("product_name", ""),
        details=f"تعديل مخزون: {inventory.get('product_name', '')} - الكمية: {inventory.get('quantity_liters', 0)} لتر"
    )
    
    return inventory

@api_router.delete("/inventory/{inventory_id}")
async def delete_inventory(inventory_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Delete an inventory item (admin only)"""
    existing = await db.inventory.find_one({"id": inventory_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="المخزون غير موجود")
    
    await db.inventory.delete_one({"id": inventory_id})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="delete_inventory",
        entity_type="inventory",
        entity_id=inventory_id,
        entity_name=existing.get("product_name", ""),
        details=f"حذف مخزون: {existing.get('product_name', '')} - الكمية: {existing.get('quantity_liters', 0)} لتر"
    )
    
    return {"message": "تم حذف المخزون بنجاح"}

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate, current_user: dict = Depends(require_role(["admin", "accountant"]))):
    """Create a payment request (requires approval from admin/IT)"""
    payment = Payment(**payment_data.model_dump())
    payment.created_by = current_user["id"]
    payment.created_by_name = current_user.get("full_name", "")
    payment.status = "pending"  # All payments start as pending
    
    await db.payments.insert_one(payment.model_dump())
    
    # Get entity name for logging
    entity_name = ""
    if payment.payment_type == "supplier_payment":
        supplier = await db.suppliers.find_one({"id": payment.related_id}, {"_id": 0})
        entity_name = supplier.get("name", "") if supplier else ""
    elif payment.payment_type == "customer_receipt":
        customer = await db.customers.find_one({"id": payment.related_id}, {"_id": 0})
        entity_name = customer.get("name", "") if customer else ""
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_payment_request",
        entity_type="payment",
        entity_id=payment.id,
        entity_name=entity_name,
        details=f"طلب دفعة مالية: {payment.amount} ر.ع - {entity_name} (في انتظار الموافقة)"
    )
    
    return payment

@api_router.post("/payments/{payment_id}/approve")
async def approve_payment(payment_id: str, approval: PaymentApproval, current_user: dict = Depends(require_role(["admin"]))):
    """Approve or reject a payment request (admin/IT only)"""
    
    # Get the payment
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="الدفعة غير موجودة")
    
    if payment.get("status") != "pending":
        raise HTTPException(status_code=400, detail="هذه الدفعة تمت معالجتها مسبقاً")
    
    entity_name = payment.get("related_name", "")
    amount = payment.get("amount", 0)
    
    if approval.action == "approve":
        # For supplier payment, check treasury balance
        if payment.get("payment_type") == "supplier_payment":
            treasury = await db.treasury.find_one({"type": "main"}, {"_id": 0})
            treasury_balance = treasury.get("current_balance", 0) if treasury else 0
            if amount > treasury_balance:
                raise HTTPException(
                    status_code=400, 
                    detail=f"رصيد الخزينة غير كافٍ. الرصيد الحالي: {treasury_balance} ر.ع، المطلوب: {amount} ر.ع"
                )
        
        # Update payment status
        await db.payments.update_one(
            {"id": payment_id},
            {
                "$set": {
                    "status": "approved",
                    "approved_by": current_user["id"],
                    "approved_by_name": current_user.get("full_name", ""),
                    "approved_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Update balances and treasury after approval
        if payment.get("payment_type") == "supplier_payment":
            # Deduct from supplier balance
            await db.suppliers.update_one(
                {"id": payment.get("related_id")},
                {"$inc": {"balance": -amount}}
            )
            # Deduct from treasury (withdrawal)
            await update_treasury(
                transaction_type="withdrawal",
                amount=amount,
                source_type="supplier_payment",
                description=f"دفعة للمورد: {entity_name}",
                source_id=payment_id,
                user_id=current_user["id"],
                user_name=current_user.get("full_name", "")
            )
            
        elif payment.get("payment_type") == "customer_receipt":
            # Deduct from customer balance (receivables)
            await db.customers.update_one(
                {"id": payment.get("related_id")},
                {"$inc": {"balance": -amount}}
            )
            # Add to treasury (deposit)
            await update_treasury(
                transaction_type="deposit",
                amount=amount,
                source_type="customer_receipt",
                description=f"استلام من العميل: {entity_name}",
                source_id=payment_id,
                user_id=current_user["id"],
                user_name=current_user.get("full_name", "")
            )
        
        await log_activity(
            user_id=current_user["id"],
            user_name=current_user["full_name"],
            action="approve_payment",
            entity_type="payment",
            entity_id=payment_id,
            entity_name=entity_name,
            details=f"تمت الموافقة على دفعة: {amount} ر.ع - {entity_name}"
        )
        
        return {"message": "تمت الموافقة على الدفعة بنجاح", "status": "approved"}
    
    elif approval.action == "reject":
        await db.payments.update_one(
            {"id": payment_id},
            {
                "$set": {
                    "status": "rejected",
                    "approved_by": current_user["id"],
                    "approved_by_name": current_user.get("full_name", ""),
                    "approved_at": datetime.now(timezone.utc).isoformat(),
                    "rejection_reason": approval.reason or "لم يتم تحديد السبب"
                }
            }
        )
        
        await log_activity(
            user_id=current_user["id"],
            user_name=current_user["full_name"],
            action="reject_payment",
            entity_type="payment",
            entity_id=payment_id,
            entity_name=entity_name,
            details=f"تم رفض دفعة: {amount} ر.ع - {entity_name} - السبب: {approval.reason or 'غير محدد'}"
        )
        
        return {"message": "تم رفض الدفعة", "status": "rejected"}
    
    raise HTTPException(status_code=400, detail="الإجراء غير صالح")

@api_router.get("/payments/pending", response_model=List[Payment])
async def get_pending_payments(current_user: dict = Depends(require_role(["admin"]))):
    """Get all pending payments awaiting approval (admin only)"""
    payments = await db.payments.find({"status": "pending"}, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    return payments

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(
    payment_type: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if payment_type:
        query["payment_type"] = payment_type
    if status:
        query["status"] = status
    if start_date:
        query["payment_date"] = {"$gte": start_date}
    if end_date:
        if "payment_date" in query:
            query["payment_date"]["$lte"] = end_date
        else:
            query["payment_date"] = {"$lte": end_date}
    
    payments = await db.payments.find(query, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    return payments

# Payment Receipt PDF Generation
@api_router.get("/payments/{payment_id}/receipt")
async def get_payment_receipt_pdf(payment_id: str, current_user: dict = Depends(get_current_user)):
    """Generate PDF receipt for a supplier payment"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.units import cm
    from io import BytesIO
    import arabic_reshaper
    from bidi.algorithm import get_display
    
    # Register Arabic font
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    try:
        pdfmetrics.registerFont(TTFont('Arabic', font_path))
    except:
        pass
    
    # Get payment details
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Get supplier details
    supplier = await db.suppliers.find_one({"id": payment.get("related_id")}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    def reshape_arabic(text):
        try:
            reshaped = arabic_reshaper.reshape(str(text))
            return get_display(reshaped)
        except:
            return str(text)
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Title'],
        fontName='Arabic',
        fontSize=24,
        alignment=TA_CENTER,
        spaceAfter=20
    )
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontName='Arabic',
        fontSize=14,
        alignment=TA_CENTER,
        spaceAfter=10
    )
    normal_style = ParagraphStyle(
        'Normal',
        parent=styles['Normal'],
        fontName='Arabic',
        fontSize=12,
        alignment=TA_RIGHT,
        spaceAfter=5
    )
    
    elements = []
    
    # Company Header
    elements.append(Paragraph(reshape_arabic("المروج للألبان"), title_style))
    elements.append(Paragraph(reshape_arabic("Al-Morooj Dairy"), header_style))
    elements.append(Spacer(1, 20))
    
    # Receipt Title
    elements.append(Paragraph(reshape_arabic("إيصال دفع"), title_style))
    elements.append(Spacer(1, 20))
    
    # Payment Date
    payment_date = payment.get("payment_date", "")[:10]
    elements.append(Paragraph(reshape_arabic(f"التاريخ: {payment_date}"), normal_style))
    elements.append(Spacer(1, 10))
    
    # Supplier Information Table
    supplier_data = [
        [reshape_arabic("القيمة"), reshape_arabic("البيان")],
        [reshape_arabic(supplier.get("name", "")), reshape_arabic("اسم المورد")],
        [reshape_arabic(supplier.get("supplier_code", "-")), reshape_arabic("كود المورد")],
        [reshape_arabic(supplier.get("phone", "-")), reshape_arabic("رقم الهاتف")],
        [reshape_arabic(supplier.get("address", "-")), reshape_arabic("العنوان")],
        [reshape_arabic(supplier.get("bank_account", "-")), reshape_arabic("الحساب البنكي")],
        [reshape_arabic(supplier.get("national_id", "-")), reshape_arabic("رقم الهوية")],
    ]
    
    supplier_table = Table(supplier_data, colWidths=[10*cm, 5*cm])
    supplier_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2563eb")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Arabic'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('FONTSIZE', (0, 1), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
    ]))
    elements.append(supplier_table)
    elements.append(Spacer(1, 20))
    
    # Payment Details Table
    payment_method_map = {
        "cash": "نقداً",
        "bank_transfer": "تحويل بنكي",
        "check": "شيك"
    }
    payment_method = payment_method_map.get(payment.get("payment_method", "cash"), payment.get("payment_method", ""))
    
    payment_data = [
        [reshape_arabic("القيمة"), reshape_arabic("تفاصيل الدفع")],
        [reshape_arabic(f"{payment.get('amount', 0):,.2f} ر.ع"), reshape_arabic("المبلغ المدفوع")],
        [reshape_arabic(payment_method), reshape_arabic("طريقة الدفع")],
        [reshape_arabic(payment.get("notes", "-") or "-"), reshape_arabic("ملاحظات")],
    ]
    
    payment_table = Table(payment_data, colWidths=[10*cm, 5*cm])
    payment_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#059669")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Arabic'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('FONTSIZE', (0, 1), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f0fdf4")),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#d1fae5")),
    ]))
    elements.append(payment_table)
    elements.append(Spacer(1, 30))
    
    # Signature Section
    sig_data = [
        [reshape_arabic("توقيع المستلم"), reshape_arabic(""), reshape_arabic("توقيع المسؤول")],
        ["________________", "", "________________"],
    ]
    sig_table = Table(sig_data, colWidths=[5*cm, 5*cm, 5*cm])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Arabic'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 20),
    ]))
    elements.append(sig_table)
    
    # Footer
    elements.append(Spacer(1, 40))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontName='Arabic',
        fontSize=9,
        alignment=TA_CENTER,
        textColor=colors.gray
    )
    elements.append(Paragraph(reshape_arabic(f"رقم الإيصال: {payment_id[:8].upper()}"), footer_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    # Log activity
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="generate_payment_receipt",
        entity_type="payment",
        entity_id=payment_id,
        entity_name=supplier.get("name"),
        details=f"طباعة إيصال دفع للمورد: {supplier.get('name')} - المبلغ: {payment.get('amount')}"
    )
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=payment_receipt_{payment_id[:8]}.pdf"}
    )

# ==================== EMPLOYEE ROUTES ====================

@api_router.post("/employees", response_model=Employee)
async def create_employee(employee_data: EmployeeCreate, current_user: dict = Depends(require_role(["admin"]))):
    employee = Employee(**employee_data.model_dump())
    await db.employees.insert_one(employee.model_dump())
    return employee

@api_router.get("/employees", response_model=List[Employee])
async def get_employees(current_user: dict = Depends(require_role(["admin"]))):
    employees = await db.employees.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return employees

@api_router.put("/employees/{employee_id}", response_model=Employee)
async def update_employee(employee_id: str, employee_data: EmployeeCreate, current_user: dict = Depends(require_role(["admin"]))):
    # Get existing employee to preserve is_active status
    existing_employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not existing_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Update only the fields from employee_data, preserving is_active
    update_data = employee_data.model_dump()
    update_data["is_active"] = existing_employee.get("is_active", True)
    
    result = await db.employees.update_one(
        {"id": employee_id},
        {"$set": update_data}
    )
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    return employee

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.employees.update_one(
        {"id": employee_id},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deleted successfully"}

# ==================== FEED COMPANY ROUTES (شركات الأعلاف) ====================

@api_router.post("/feed-companies", response_model=FeedCompany)
async def create_feed_company(company_data: FeedCompanyCreate, current_user: dict = Depends(get_current_user)):
    company = FeedCompany(**company_data.model_dump())
    await db.feed_companies.insert_one(company.model_dump())
    return company

@api_router.get("/feed-companies", response_model=List[FeedCompany])
async def get_feed_companies(current_user: dict = Depends(get_current_user)):
    companies = await db.feed_companies.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return companies

@api_router.put("/feed-companies/{company_id}", response_model=FeedCompany)
async def update_feed_company(company_id: str, company_data: FeedCompanyCreate, current_user: dict = Depends(get_current_user)):
    result = await db.feed_companies.update_one(
        {"id": company_id},
        {"$set": company_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feed company not found")
    company = await db.feed_companies.find_one({"id": company_id}, {"_id": 0})
    return company

@api_router.delete("/feed-companies/{company_id}")
async def delete_feed_company(company_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.feed_companies.update_one(
        {"id": company_id},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feed company not found")
    return {"message": "Feed company deleted successfully"}

# ==================== FEED TYPE ROUTES (أنواع الأعلاف) ====================

@api_router.post("/feed-types", response_model=FeedType)
async def create_feed_type(feed_type_data: FeedTypeCreate, current_user: dict = Depends(get_current_user)):
    feed_type = FeedType(**feed_type_data.model_dump())
    await db.feed_types.insert_one(feed_type.model_dump())
    return feed_type

@api_router.get("/feed-types", response_model=List[FeedType])
async def get_feed_types(company_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"is_active": True}
    if company_id:
        query["company_id"] = company_id
    feed_types = await db.feed_types.find(query, {"_id": 0}).to_list(1000)
    return feed_types

@api_router.put("/feed-types/{feed_type_id}", response_model=FeedType)
async def update_feed_type(feed_type_id: str, feed_type_data: FeedTypeCreate, current_user: dict = Depends(get_current_user)):
    result = await db.feed_types.update_one(
        {"id": feed_type_id},
        {"$set": feed_type_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feed type not found")
    feed_type = await db.feed_types.find_one({"id": feed_type_id}, {"_id": 0})
    return feed_type

@api_router.delete("/feed-types/{feed_type_id}")
async def delete_feed_type(feed_type_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.feed_types.update_one(
        {"id": feed_type_id},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feed type not found")
    return {"message": "Feed type deleted successfully"}

# ==================== FEED PURCHASE ROUTES (مشتريات الأعلاف) ====================

@api_router.post("/feed-purchases", response_model=FeedPurchase)
async def create_feed_purchase(purchase_data: FeedPurchaseCreate, current_user: dict = Depends(get_current_user)):
    # Check supplier balance
    supplier = await db.suppliers.find_one({"id": purchase_data.supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    total_amount = purchase_data.quantity * purchase_data.price_per_unit
    
    if supplier.get("balance", 0) < total_amount:
        raise HTTPException(status_code=400, detail="Insufficient supplier balance")
    
    # Generate invoice number
    count = await db.feed_purchases.count_documents({})
    year = datetime.now().year
    invoice_number = f"FP-{year}-{count + 1:05d}"
    
    purchase = FeedPurchase(**purchase_data.model_dump())
    purchase.invoice_number = invoice_number
    purchase.total_amount = total_amount
    purchase.created_by = current_user["id"]
    purchase.created_by_name = current_user.get("full_name", "")
    # Add supplier details to invoice
    purchase.supplier_phone = supplier.get("phone", "")
    purchase.supplier_address = supplier.get("address", "")
    
    await db.feed_purchases.insert_one(purchase.model_dump())
    
    # Deduct from supplier balance
    await db.suppliers.update_one(
        {"id": purchase.supplier_id},
        {"$inc": {"balance": -total_amount}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_feed_purchase",
        entity_type="feed_purchase",
        entity_id=purchase.id,
        entity_name=supplier.get("name"),
        details=f"فاتورة شراء علف: {invoice_number} - {purchase.feed_type_name} - {total_amount} ر.ع من رصيد {supplier.get('name')}"
    )
    
    return purchase

# Approve feed purchase invoice (electronic signature)
@api_router.post("/feed-purchases/{purchase_id}/approve")
async def approve_feed_purchase(purchase_id: str, current_user: dict = Depends(require_role(["admin"]))):
    purchase = await db.feed_purchases.find_one({"id": purchase_id}, {"_id": 0})
    if not purchase:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if purchase.get("is_approved"):
        raise HTTPException(status_code=400, detail="Invoice already approved")
    
    # Generate signature code
    import hashlib
    signature_data = f"{purchase_id}-{current_user['id']}-{datetime.now().isoformat()}"
    signature_code = hashlib.sha256(signature_data.encode()).hexdigest()[:16].upper()
    
    await db.feed_purchases.update_one(
        {"id": purchase_id},
        {"$set": {
            "is_approved": True,
            "approved_by": current_user["id"],
            "approved_by_name": current_user.get("full_name", ""),
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "signature_code": signature_code
        }}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="approve_feed_purchase",
        entity_type="feed_purchase",
        entity_id=purchase_id,
        details=f"تصديق فاتورة شراء علف: {purchase.get('invoice_number')} - كود التصديق: {signature_code}"
    )
    
    return {"message": "تم تصديق الفاتورة بنجاح", "signature_code": signature_code}

@api_router.get("/feed-purchases", response_model=List[FeedPurchase])
async def get_feed_purchases(
    supplier_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if supplier_id:
        query["supplier_id"] = supplier_id
    if start_date:
        query["purchase_date"] = {"$gte": start_date}
    if end_date:
        if "purchase_date" in query:
            query["purchase_date"]["$lte"] = end_date
        else:
            query["purchase_date"] = {"$lte": end_date}
    
    purchases = await db.feed_purchases.find(query, {"_id": 0}).sort("purchase_date", -1).to_list(1000)
    return purchases

# Get feed purchase invoice for printing
@api_router.get("/feed-purchases/{purchase_id}/invoice")
async def get_feed_purchase_invoice(purchase_id: str, current_user: dict = Depends(get_current_user)):
    """Get feed purchase invoice details for printing"""
    purchase = await db.feed_purchases.find_one({"id": purchase_id}, {"_id": 0})
    if not purchase:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Get supplier details
    supplier = await db.suppliers.find_one({"id": purchase.get("supplier_id")}, {"_id": 0})
    
    # Get company info
    company_info = {
        "name": "شركة المروج للألبان",
        "name_en": "Al Morooj Dairy Company",
        "address": "سلطنة عمان",
        "phone": "+968 XXXX XXXX",
        "cr_number": "XXXXXXXX"
    }
    
    return {
        "invoice": purchase,
        "supplier": supplier,
        "company": company_info,
        "print_time": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/feed-purchases/supplier/{supplier_id}")
async def get_supplier_feed_purchases(supplier_id: str, current_user: dict = Depends(get_current_user)):
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    purchases = await db.feed_purchases.find({"supplier_id": supplier_id}, {"_id": 0}).sort("purchase_date", -1).to_list(100)
    
    return {
        "supplier": supplier,
        "purchases": purchases,
        "total_spent": sum(p.get("total_amount", 0) for p in purchases),
        "available_balance": supplier.get("balance", 0)
    }

@api_router.put("/feed-purchases/{purchase_id}", response_model=FeedPurchase)
async def update_feed_purchase(purchase_id: str, purchase_data: FeedPurchaseCreate, current_user: dict = Depends(get_current_user)):
    # Get existing purchase
    existing = await db.feed_purchases.find_one({"id": purchase_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Feed purchase not found")
    
    # Get supplier
    supplier = await db.suppliers.find_one({"id": purchase_data.supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Calculate new total
    new_total = purchase_data.quantity * purchase_data.price_per_unit
    old_total = existing.get("total_amount", 0)
    difference = new_total - old_total
    
    # Check if supplier has enough balance for the difference
    if difference > 0 and supplier.get("balance", 0) < difference:
        raise HTTPException(status_code=400, detail="Insufficient supplier balance")
    
    # Update purchase
    update_data = purchase_data.model_dump()
    update_data["total_amount"] = new_total
    
    await db.feed_purchases.update_one(
        {"id": purchase_id},
        {"$set": update_data}
    )
    
    # Update supplier balance
    if difference != 0:
        await db.suppliers.update_one(
            {"id": purchase_data.supplier_id},
            {"$inc": {"balance": -difference}}
        )
    
    purchase = await db.feed_purchases.find_one({"id": purchase_id}, {"_id": 0})
    return purchase

@api_router.delete("/feed-purchases/{purchase_id}")
async def delete_feed_purchase(purchase_id: str, current_user: dict = Depends(get_current_user)):
    # Get existing purchase
    existing = await db.feed_purchases.find_one({"id": purchase_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Feed purchase not found")
    
    # Get supplier name for logging
    supplier = await db.suppliers.find_one({"id": existing["supplier_id"]}, {"_id": 0})
    supplier_name = supplier.get("name", "") if supplier else ""
    
    # Refund supplier balance
    await db.suppliers.update_one(
        {"id": existing["supplier_id"]},
        {"$inc": {"balance": existing.get("total_amount", 0)}}
    )
    
    # Delete purchase
    await db.feed_purchases.delete_one({"id": purchase_id})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="delete_feed_purchase",
        entity_type="feed_purchase",
        entity_id=purchase_id,
        entity_name=supplier_name,
        details=f"حذف شراء علف وإرجاع {existing.get('total_amount', 0)} ر.ع لرصيد {supplier_name}"
    )
    
    return {"message": "Feed purchase deleted and amount refunded to supplier"}

# ==================== TREASURY ROUTES (الخزينة) ====================

@api_router.get("/treasury/balance")
async def get_treasury_balance(current_user: dict = Depends(get_current_user)):
    """Get current treasury balance and summary"""
    # Get or create treasury record
    treasury = await db.treasury.find_one({"type": "main"}, {"_id": 0})
    if not treasury:
        treasury = {
            "type": "main",
            "current_balance": 0.0,
            "total_deposits": 0.0,
            "total_withdrawals": 0.0,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        await db.treasury.insert_one(treasury)
    
    return treasury

@api_router.get("/treasury/transactions")
async def get_treasury_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    transaction_type: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get treasury transactions with filters"""
    query = {}
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    if transaction_type:
        query["transaction_type"] = transaction_type
    
    transactions = await db.treasury_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return transactions

@api_router.post("/treasury/transaction")
async def create_treasury_transaction(
    transaction_type: str,
    amount: float,
    source_type: str,
    description: str,
    source_id: Optional[str] = None,
    current_user: dict = Depends(require_role(["admin", "accountant"]))
):
    """Create a manual treasury transaction"""
    # Get current balance
    treasury = await db.treasury.find_one({"type": "main"}, {"_id": 0})
    current_balance = treasury.get("current_balance", 0) if treasury else 0
    
    # Calculate new balance
    if transaction_type == "deposit":
        new_balance = current_balance + amount
    else:  # withdrawal
        if amount > current_balance:
            raise HTTPException(status_code=400, detail="رصيد الخزينة غير كافٍ")
        new_balance = current_balance - amount
    
    # Create transaction record
    transaction = TreasuryTransaction(
        transaction_type=transaction_type,
        amount=amount,
        source_type=source_type,
        source_id=source_id,
        description=description,
        balance_after=new_balance,
        created_by=current_user["id"],
        created_by_name=current_user.get("full_name", "")
    )
    
    await db.treasury_transactions.insert_one(transaction.model_dump())
    
    # Update treasury balance
    update_data = {
        "current_balance": new_balance,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    if transaction_type == "deposit":
        update_data["total_deposits"] = treasury.get("total_deposits", 0) + amount if treasury else amount
    else:
        update_data["total_withdrawals"] = treasury.get("total_withdrawals", 0) + amount if treasury else amount
    
    await db.treasury.update_one(
        {"type": "main"},
        {"$set": update_data},
        upsert=True
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action=f"treasury_{transaction_type}",
        entity_type="treasury",
        details=f"{'إيداع' if transaction_type == 'deposit' else 'سحب'}: {amount} ر.ع - {description}"
    )
    
    return transaction.model_dump()

@api_router.put("/treasury/transaction/{transaction_id}")
async def update_treasury_transaction(
    transaction_id: str,
    amount: Optional[float] = None,
    description: Optional[str] = None,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Update a treasury transaction (admin only)"""
    # Get existing transaction
    existing = await db.treasury_transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="العملية غير موجودة")
    
    # Calculate balance adjustment
    old_amount = existing.get("amount", 0)
    new_amount = amount if amount is not None else old_amount
    amount_diff = new_amount - old_amount
    
    # Update transaction
    update_data = {}
    if amount is not None:
        update_data["amount"] = amount
    if description is not None:
        update_data["description"] = description
    
    if update_data:
        await db.treasury_transactions.update_one(
            {"id": transaction_id},
            {"$set": update_data}
        )
    
    # Update treasury balance if amount changed
    if amount_diff != 0:
        treasury = await db.treasury.find_one({"type": "main"}, {"_id": 0})
        current_balance = treasury.get("current_balance", 0) if treasury else 0
        
        if existing.get("transaction_type") == "deposit":
            new_balance = current_balance + amount_diff
            new_deposits = treasury.get("total_deposits", 0) + amount_diff
            await db.treasury.update_one(
                {"type": "main"},
                {"$set": {"current_balance": new_balance, "total_deposits": new_deposits, "last_updated": datetime.now(timezone.utc).isoformat()}}
            )
        else:
            new_balance = current_balance - amount_diff
            new_withdrawals = treasury.get("total_withdrawals", 0) + amount_diff
            await db.treasury.update_one(
                {"type": "main"},
                {"$set": {"current_balance": new_balance, "total_withdrawals": new_withdrawals, "last_updated": datetime.now(timezone.utc).isoformat()}}
            )
        
        # Update balance_after for this and subsequent transactions
        await db.treasury_transactions.update_one(
            {"id": transaction_id},
            {"$set": {"balance_after": new_balance if existing.get("transaction_type") == "deposit" else current_balance - amount_diff}}
        )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_treasury_transaction",
        entity_type="treasury",
        entity_id=transaction_id,
        details=f"تعديل عملية خزينة: {new_amount} ر.ع"
    )
    
    updated = await db.treasury_transactions.find_one({"id": transaction_id}, {"_id": 0})
    return updated

@api_router.delete("/treasury/transaction/{transaction_id}")
async def delete_treasury_transaction(
    transaction_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Delete a treasury transaction and reverse its effect (admin only)"""
    # Get existing transaction
    existing = await db.treasury_transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="العملية غير موجودة")
    
    amount = existing.get("amount", 0)
    transaction_type = existing.get("transaction_type")
    
    # Reverse the transaction effect on treasury
    treasury = await db.treasury.find_one({"type": "main"}, {"_id": 0})
    current_balance = treasury.get("current_balance", 0) if treasury else 0
    
    if transaction_type == "deposit":
        new_balance = current_balance - amount
        new_deposits = max(0, treasury.get("total_deposits", 0) - amount)
        await db.treasury.update_one(
            {"type": "main"},
            {"$set": {"current_balance": new_balance, "total_deposits": new_deposits, "last_updated": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        new_balance = current_balance + amount
        new_withdrawals = max(0, treasury.get("total_withdrawals", 0) - amount)
        await db.treasury.update_one(
            {"type": "main"},
            {"$set": {"current_balance": new_balance, "total_withdrawals": new_withdrawals, "last_updated": datetime.now(timezone.utc).isoformat()}}
        )
    
    # Delete the transaction
    await db.treasury_transactions.delete_one({"id": transaction_id})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="delete_treasury_transaction",
        entity_type="treasury",
        entity_id=transaction_id,
        details=f"حذف عملية خزينة: {amount} ر.ع - {existing.get('description', '')}"
    )
    
    return {"message": "تم حذف العملية وعكس تأثيرها على الخزينة", "new_balance": new_balance}

# Helper function to update treasury
async def update_treasury(transaction_type: str, amount: float, source_type: str, description: str, source_id: str = None, user_id: str = None, user_name: str = None):
    """Helper to update treasury balance from other operations"""
    treasury = await db.treasury.find_one({"type": "main"}, {"_id": 0})
    current_balance = treasury.get("current_balance", 0) if treasury else 0
    
    if transaction_type == "deposit":
        new_balance = current_balance + amount
    else:
        new_balance = current_balance - amount
    
    transaction = TreasuryTransaction(
        transaction_type=transaction_type,
        amount=amount,
        source_type=source_type,
        source_id=source_id,
        description=description,
        balance_after=new_balance,
        created_by=user_id,
        created_by_name=user_name or ""
    )
    
    await db.treasury_transactions.insert_one(transaction.model_dump())
    
    update_data = {
        "current_balance": new_balance,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    if transaction_type == "deposit":
        update_data["total_deposits"] = treasury.get("total_deposits", 0) + amount if treasury else amount
    else:
        update_data["total_withdrawals"] = treasury.get("total_withdrawals", 0) + amount if treasury else amount
    
    await db.treasury.update_one({"type": "main"}, {"$set": update_data}, upsert=True)
    
    return new_balance

# ==================== INTEGRATED FINANCIAL REPORTS (التقارير المالية المتكاملة) ====================

@api_router.get("/reports/financial-summary")
async def get_financial_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get integrated financial summary report"""
    
    # Default to current month if no dates provided
    if not start_date:
        today = datetime.now(timezone.utc)
        start_date = datetime(today.year, today.month, 1, tzinfo=timezone.utc).isoformat()
    if not end_date:
        end_date = datetime.now(timezone.utc).isoformat()
    
    date_query = {"$gte": start_date, "$lte": end_date}
    
    # Get milk receptions (purchases)
    receptions = await db.milk_receptions.find(
        {"reception_date": date_query}, {"_id": 0}
    ).to_list(10000)
    total_milk_purchased_liters = sum(r.get("quantity_liters", 0) for r in receptions)
    total_milk_purchased_amount = sum(r.get("total_amount", 0) for r in receptions)
    
    # Get sales
    sales = await db.sales.find(
        {"sale_date": date_query}, {"_id": 0}
    ).to_list(10000)
    total_milk_sold_liters = sum(s.get("quantity_liters", 0) for s in sales)
    total_sales_amount = sum(s.get("total_amount", 0) for s in sales)
    
    # Get supplier payments (approved only)
    supplier_payments = await db.payments.find(
        {"payment_type": "supplier_payment", "status": "approved", "payment_date": date_query}, {"_id": 0}
    ).to_list(10000)
    total_supplier_payments = sum(p.get("amount", 0) for p in supplier_payments)
    
    # Get customer receipts (approved only)
    customer_receipts = await db.payments.find(
        {"payment_type": "customer_receipt", "status": "approved", "payment_date": date_query}, {"_id": 0}
    ).to_list(10000)
    total_customer_receipts = sum(p.get("amount", 0) for p in customer_receipts)
    
    # Get treasury balance
    treasury = await db.treasury.find_one({"type": "main"}, {"_id": 0})
    treasury_balance = treasury.get("current_balance", 0) if treasury else 0
    
    # Get inventory
    inventory = await db.inventory.find_one({"product_type": "raw_milk"}, {"_id": 0})
    current_stock_liters = inventory.get("quantity_liters", 0) if inventory else 0
    
    # Calculate profit/loss
    gross_profit = total_sales_amount - total_milk_purchased_amount
    net_cash_flow = total_customer_receipts - total_supplier_payments
    
    # Get outstanding balances
    suppliers = await db.suppliers.find({"is_active": True}, {"_id": 0, "balance": 1}).to_list(1000)
    total_supplier_dues = sum(s.get("balance", 0) for s in suppliers)
    
    customers = await db.customers.find({"is_active": True}, {"_id": 0, "balance": 1}).to_list(1000)
    total_customer_dues = sum(c.get("balance", 0) for c in customers)
    
    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "purchases": {
            "total_liters": round(total_milk_purchased_liters, 2),
            "total_amount": round(total_milk_purchased_amount, 2),
            "transactions_count": len(receptions),
            "avg_price_per_liter": round(total_milk_purchased_amount / total_milk_purchased_liters, 3) if total_milk_purchased_liters > 0 else 0
        },
        "sales": {
            "total_liters": round(total_milk_sold_liters, 2),
            "total_amount": round(total_sales_amount, 2),
            "transactions_count": len(sales),
            "avg_price_per_liter": round(total_sales_amount / total_milk_sold_liters, 3) if total_milk_sold_liters > 0 else 0
        },
        "payments": {
            "supplier_payments": round(total_supplier_payments, 2),
            "customer_receipts": round(total_customer_receipts, 2),
            "net_cash_flow": round(net_cash_flow, 2)
        },
        "profit_loss": {
            "gross_profit": round(gross_profit, 2),
            "profit_margin_percentage": round((gross_profit / total_sales_amount) * 100, 2) if total_sales_amount > 0 else 0
        },
        "balances": {
            "treasury_balance": round(treasury_balance, 2),
            "supplier_dues": round(total_supplier_dues, 2),
            "customer_receivables": round(total_customer_dues, 2),
            "inventory_liters": round(current_stock_liters, 2)
        }
    }

# ==================== REPORTS & DASHBOARD ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Today's date range
    today = datetime.now(timezone.utc).date()
    today_start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc).isoformat()
    
    # Get counts
    suppliers_count = await db.suppliers.count_documents({"is_active": True})
    customers_count = await db.customers.count_documents({"is_active": True})
    
    # Get today's receptions
    today_receptions = await db.milk_receptions.find(
        {"reception_date": {"$gte": today_start}},
        {"_id": 0}
    ).to_list(1000)
    today_milk_quantity = sum(r.get("quantity_liters", 0) for r in today_receptions)
    today_milk_value = sum(r.get("total_amount", 0) for r in today_receptions)
    
    # Get today's sales
    today_sales = await db.sales.find(
        {"sale_date": {"$gte": today_start}},
        {"_id": 0}
    ).to_list(1000)
    today_sales_quantity = sum(s.get("quantity_liters", 0) for s in today_sales)
    today_sales_value = sum(s.get("total_amount", 0) for s in today_sales)
    
    # Get inventory
    inventory = await db.inventory.find_one({"product_type": "raw_milk"}, {"_id": 0})
    current_stock = inventory.get("quantity_liters", 0) if inventory else 0
    
    # Get average quality from today's receptions
    avg_fat = 0
    avg_protein = 0
    if today_receptions:
        fats = [r.get("quality_test", {}).get("fat_percentage", 0) for r in today_receptions if r.get("quality_test")]
        proteins = [r.get("quality_test", {}).get("protein_percentage", 0) for r in today_receptions if r.get("quality_test")]
        avg_fat = sum(fats) / len(fats) if fats else 0
        avg_protein = sum(proteins) / len(proteins) if proteins else 0
    
    # Get supplier balances (amounts owed)
    suppliers = await db.suppliers.find({"is_active": True}, {"_id": 0, "balance": 1}).to_list(1000)
    total_supplier_dues = sum(s.get("balance", 0) for s in suppliers)
    
    # Get customer balances (amounts receivable)
    customers = await db.customers.find({"is_active": True}, {"_id": 0, "balance": 1}).to_list(1000)
    total_customer_dues = sum(c.get("balance", 0) for c in customers)
    
    return {
        "suppliers_count": suppliers_count,
        "customers_count": customers_count,
        "today_milk_quantity": round(today_milk_quantity, 2),
        "today_milk_value": round(today_milk_value, 2),
        "today_sales_quantity": round(today_sales_quantity, 2),
        "today_sales_value": round(today_sales_value, 2),
        "current_stock": round(current_stock, 2),
        "avg_fat_percentage": round(avg_fat, 2),
        "avg_protein_percentage": round(avg_protein, 2),
        "total_supplier_dues": round(total_supplier_dues, 2),
        "total_customer_dues": round(total_customer_dues, 2)
    }

@api_router.get("/reports/daily")
async def get_daily_report(date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if not date:
        date = datetime.now(timezone.utc).date().isoformat()
    
    day_start = f"{date}T00:00:00"
    day_end = f"{date}T23:59:59"
    
    receptions = await db.milk_receptions.find(
        {"reception_date": {"$gte": day_start, "$lte": day_end}},
        {"_id": 0}
    ).to_list(1000)
    
    sales = await db.sales.find(
        {"sale_date": {"$gte": day_start, "$lte": day_end}},
        {"_id": 0}
    ).to_list(1000)
    
    payments = await db.payments.find(
        {"payment_date": {"$gte": day_start, "$lte": day_end}},
        {"_id": 0}
    ).to_list(1000)
    
    return {
        "date": date,
        "receptions": {
            "count": len(receptions),
            "total_quantity": sum(r.get("quantity_liters", 0) for r in receptions),
            "total_value": sum(r.get("total_amount", 0) for r in receptions),
            "details": receptions
        },
        "sales": {
            "count": len(sales),
            "total_quantity": sum(s.get("quantity_liters", 0) for s in sales),
            "total_value": sum(s.get("total_amount", 0) for s in sales),
            "details": sales
        },
        "payments": {
            "count": len(payments),
            "total_value": sum(p.get("amount", 0) for p in payments),
            "details": payments
        }
    }

@api_router.get("/reports/monthly")
async def get_monthly_report(year: int, month: int, current_user: dict = Depends(get_current_user)):
    month_start = f"{year}-{month:02d}-01T00:00:00"
    if month == 12:
        month_end = f"{year + 1}-01-01T00:00:00"
    else:
        month_end = f"{year}-{month + 1:02d}-01T00:00:00"
    
    receptions = await db.milk_receptions.find(
        {"reception_date": {"$gte": month_start, "$lt": month_end}},
        {"_id": 0}
    ).to_list(10000)
    
    sales = await db.sales.find(
        {"sale_date": {"$gte": month_start, "$lt": month_end}},
        {"_id": 0}
    ).to_list(10000)
    
    payments = await db.payments.find(
        {"payment_date": {"$gte": month_start, "$lt": month_end}},
        {"_id": 0}
    ).to_list(10000)
    
    # Group by day
    daily_data = {}
    for r in receptions:
        day = r.get("reception_date", "")[:10]
        if day not in daily_data:
            daily_data[day] = {"reception_qty": 0, "reception_value": 0, "sales_qty": 0, "sales_value": 0}
        daily_data[day]["reception_qty"] += r.get("quantity_liters", 0)
        daily_data[day]["reception_value"] += r.get("total_amount", 0)
    
    for s in sales:
        day = s.get("sale_date", "")[:10]
        if day not in daily_data:
            daily_data[day] = {"reception_qty": 0, "reception_value": 0, "sales_qty": 0, "sales_value": 0}
        daily_data[day]["sales_qty"] += s.get("quantity_liters", 0)
        daily_data[day]["sales_value"] += s.get("total_amount", 0)
    
    return {
        "year": year,
        "month": month,
        "summary": {
            "total_reception_quantity": sum(r.get("quantity_liters", 0) for r in receptions),
            "total_reception_value": sum(r.get("total_amount", 0) for r in receptions),
            "total_sales_quantity": sum(s.get("quantity_liters", 0) for s in sales),
            "total_sales_value": sum(s.get("total_amount", 0) for s in sales),
            "total_payments": sum(p.get("amount", 0) for p in payments)
        },
        "daily_data": [{"date": k, **v} for k, v in sorted(daily_data.items())]
    }

@api_router.get("/reports/supplier/{supplier_id}")
async def get_supplier_report(supplier_id: str, current_user: dict = Depends(get_current_user)):
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    receptions = await db.milk_receptions.find(
        {"supplier_id": supplier_id},
        {"_id": 0}
    ).sort("reception_date", -1).to_list(100)
    
    payments = await db.payments.find(
        {"related_id": supplier_id, "payment_type": "supplier_payment"},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(100)
    
    return {
        "supplier": supplier,
        "receptions": receptions,
        "payments": payments,
        "summary": {
            "total_supplied": supplier.get("total_supplied", 0),
            "current_balance": supplier.get("balance", 0),
            "reception_count": len(receptions)
        }
    }

# ==================== HR - EMPLOYEE MANAGEMENT (إدارة الموظفين) ====================

@api_router.post("/hr/employees", response_model=Employee)
async def create_hr_employee(employee_data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    # Generate employee code if not provided
    if not employee_data.employee_code:
        count = await db.hr_employees.count_documents({})
        employee_data.employee_code = f"EMP{count + 1:04d}"
    
    employee = Employee(**employee_data.model_dump())
    await db.hr_employees.insert_one(employee.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_employee",
        entity_type="employee",
        entity_id=employee.id,
        entity_name=employee.name,
        details=f"إضافة موظف: {employee.name} - {employee.department}"
    )
    
    return employee

@api_router.get("/hr/employees", response_model=List[Employee])
async def get_hr_employees(
    department: Optional[str] = None,
    is_active: bool = True,
    current_user: dict = Depends(get_current_user)
):
    query = {"is_active": is_active}
    if department:
        query["department"] = department
    employees = await db.hr_employees.find(query, {"_id": 0}).to_list(1000)
    return employees

@api_router.get("/hr/employees/{employee_id}", response_model=Employee)
async def get_hr_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    employee = await db.hr_employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@api_router.put("/hr/employees/{employee_id}", response_model=Employee)
async def update_hr_employee(employee_id: str, employee_data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    # Get existing employee to preserve important status fields
    existing_employee = await db.hr_employees.find_one({"id": employee_id}, {"_id": 0})
    if not existing_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Update only the fields from employee_data, preserving is_active and can_login
    update_data = employee_data.model_dump()
    # Preserve status fields that should not be changed during regular updates
    update_data["is_active"] = existing_employee.get("is_active", True)
    update_data["can_login"] = existing_employee.get("can_login", False)
    
    result = await db.hr_employees.update_one(
        {"id": employee_id},
        {"$set": update_data}
    )
    employee = await db.hr_employees.find_one({"id": employee_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_employee",
        entity_type="employee",
        entity_id=employee_id,
        entity_name=employee.get("name"),
        details=f"تعديل بيانات موظف: {employee.get('name')}"
    )
    
    return employee

@api_router.delete("/hr/employees/{employee_id}")
async def delete_hr_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    employee = await db.hr_employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    result = await db.hr_employees.update_one(
        {"id": employee_id},
        {"$set": {"is_active": False}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="delete_employee",
        entity_type="employee",
        entity_id=employee_id,
        entity_name=employee.get("name"),
        details=f"إيقاف موظف: {employee.get('name')}"
    )
    
    return {"message": "Employee deactivated successfully"}

# Create user account for employee
@api_router.post("/hr/employees/{employee_id}/create-account")
async def create_employee_account(
    employee_id: str, 
    password: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    employee = await db.hr_employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if user already exists
    existing = await db.users.find_one({"email": employee.get("email")})
    if existing:
        raise HTTPException(status_code=400, detail="User account already exists")
    
    # Determine role based on department
    department_roles = {
        "admin": "admin",
        "it": "admin",
        "finance": "accountant",
        "purchasing": "employee",
        "milk_reception": "employee",
        "hr": "employee"
    }
    role = department_roles.get(employee.get("department", ""), "employee")
    
    # Create user
    username = employee.get("employee_code", "").lower() or employee.get("name", "").replace(" ", "").lower()
    user = User(
        username=username,
        email=employee.get("email") or f"{username}@company.com",
        full_name=employee.get("name"),
        phone=employee.get("phone"),
        role=role,
        center_id=employee.get("center_id")
    )
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(password)
    user_dict["employee_id"] = employee_id
    user_dict["department"] = employee.get("department")
    user_dict["permissions"] = employee.get("permissions", [])
    
    await db.users.insert_one(user_dict)
    
    # Update employee
    await db.hr_employees.update_one(
        {"id": employee_id},
        {"$set": {"can_login": True}}
    )
    
    return {"message": "User account created successfully", "username": username}

# ==================== HR - ATTENDANCE (الحضور والانصراف) ====================

@api_router.post("/hr/attendance", response_model=Attendance)
async def create_attendance(attendance_data: AttendanceCreate, current_user: dict = Depends(get_current_user)):
    # Check if attendance already exists for this employee and date
    existing = await db.hr_attendance.find_one({
        "employee_id": attendance_data.employee_id,
        "date": attendance_data.date
    })
    if existing:
        # Update existing record
        await db.hr_attendance.update_one(
            {"id": existing["id"]},
            {"$set": attendance_data.model_dump()}
        )
        attendance = await db.hr_attendance.find_one({"id": existing["id"]}, {"_id": 0})
        return attendance
    
    attendance = Attendance(**attendance_data.model_dump())
    await db.hr_attendance.insert_one(attendance.model_dump())
    return attendance

@api_router.get("/hr/attendance")
async def get_attendance(
    employee_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    attendance = await db.hr_attendance.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return attendance

@api_router.get("/hr/attendance/report")
async def get_attendance_report(
    year: int,
    month: int,
    employee_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    month_start = f"{year}-{month:02d}-01"
    if month == 12:
        month_end = f"{year + 1}-01-01"
    else:
        month_end = f"{year}-{month + 1:02d}-01"
    
    query = {"date": {"$gte": month_start, "$lt": month_end}}
    if employee_id:
        query["employee_id"] = employee_id
    
    attendance = await db.hr_attendance.find(query, {"_id": 0}).to_list(10000)
    
    # Group by employee
    employee_report = {}
    for record in attendance:
        emp_id = record.get("employee_id")
        if emp_id not in employee_report:
            employee_report[emp_id] = {
                "employee_name": record.get("employee_name"),
                "present_days": 0,
                "absent_days": 0,
                "late_days": 0,
                "total_hours": 0,
                "records": []
            }
        
        employee_report[emp_id]["records"].append(record)
        if record.get("check_in"):
            employee_report[emp_id]["present_days"] += 1
            # Calculate hours if both check_in and check_out exist
            if record.get("check_out"):
                try:
                    check_in = datetime.fromisoformat(record["check_in"].replace("Z", "+00:00"))
                    check_out = datetime.fromisoformat(record["check_out"].replace("Z", "+00:00"))
                    hours = (check_out - check_in).total_seconds() / 3600
                    employee_report[emp_id]["total_hours"] += hours
                except:
                    pass
    
    return {
        "year": year,
        "month": month,
        "report": list(employee_report.values())
    }

# ==================== HR - LEAVE REQUESTS (طلبات الإجازة) ====================

@api_router.post("/hr/leave-requests", response_model=LeaveRequest)
async def create_leave_request(request_data: LeaveRequestCreate, current_user: dict = Depends(get_current_user)):
    leave_request = LeaveRequest(**request_data.model_dump())
    await db.hr_leave_requests.insert_one(leave_request.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_leave_request",
        entity_type="leave_request",
        entity_id=leave_request.id,
        entity_name=request_data.employee_name,
        details=f"طلب إجازة: {request_data.employee_name} - {request_data.leave_type}"
    )
    
    return leave_request

@api_router.get("/hr/leave-requests")
async def get_leave_requests(
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if employee_id:
        query["employee_id"] = employee_id
    
    requests = await db.hr_leave_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return requests

@api_router.put("/hr/leave-requests/{request_id}/approve")
async def approve_leave_request(request_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.hr_leave_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "approved",
            "approved_by": current_user["full_name"],
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    request = await db.hr_leave_requests.find_one({"id": request_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="approve_leave_request",
        entity_type="leave_request",
        entity_id=request_id,
        entity_name=request.get("employee_name"),
        details=f"الموافقة على إجازة: {request.get('employee_name')}"
    )
    
    return request

@api_router.put("/hr/leave-requests/{request_id}/reject")
async def reject_leave_request(request_id: str, reason: str = "", current_user: dict = Depends(get_current_user)):
    result = await db.hr_leave_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "rejected",
            "approved_by": current_user["full_name"],
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": reason
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    request = await db.hr_leave_requests.find_one({"id": request_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="reject_leave_request",
        entity_type="leave_request",
        entity_id=request_id,
        entity_name=request.get("employee_name"),
        details=f"رفض إجازة: {request.get('employee_name')} - {reason}"
    )
    
    return request

# ==================== HR - EXPENSE REQUESTS (طلبات المصاريف) ====================

@api_router.post("/hr/expense-requests", response_model=ExpenseRequest)
async def create_expense_request(request_data: ExpenseRequestCreate, current_user: dict = Depends(get_current_user)):
    expense_request = ExpenseRequest(**request_data.model_dump())
    await db.hr_expense_requests.insert_one(expense_request.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_expense_request",
        entity_type="expense_request",
        entity_id=expense_request.id,
        entity_name=request_data.employee_name,
        details=f"طلب مصاريف: {request_data.employee_name} - {request_data.amount} ر.ع"
    )
    
    return expense_request

@api_router.get("/hr/expense-requests")
async def get_expense_requests(
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if employee_id:
        query["employee_id"] = employee_id
    
    requests = await db.hr_expense_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return requests

@api_router.put("/hr/expense-requests/{request_id}/approve")
async def approve_expense_request(request_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.hr_expense_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "approved",
            "approved_by": current_user["full_name"],
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense request not found")
    
    request = await db.hr_expense_requests.find_one({"id": request_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="approve_expense_request",
        entity_type="expense_request",
        entity_id=request_id,
        entity_name=request.get("employee_name"),
        details=f"الموافقة على مصاريف: {request.get('employee_name')} - {request.get('amount')} ر.ع"
    )
    
    return request

@api_router.put("/hr/expense-requests/{request_id}/reject")
async def reject_expense_request(request_id: str, reason: str = "", current_user: dict = Depends(get_current_user)):
    result = await db.hr_expense_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "rejected",
            "approved_by": current_user["full_name"],
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": reason
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense request not found")
    
    request = await db.hr_expense_requests.find_one({"id": request_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="reject_expense_request",
        entity_type="expense_request",
        entity_id=request_id,
        entity_name=request.get("employee_name"),
        details=f"رفض مصاريف: {request.get('employee_name')} - {reason}"
    )
    
    return request

@api_router.put("/hr/expense-requests/{request_id}/pay")
async def mark_expense_paid(request_id: str, current_user: dict = Depends(require_role(["admin", "accountant"]))):
    result = await db.hr_expense_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "paid",
            "paid_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense request not found")
    
    request = await db.hr_expense_requests.find_one({"id": request_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="pay_expense_request",
        entity_type="expense_request",
        entity_id=request_id,
        entity_name=request.get("employee_name"),
        details=f"صرف مصاريف: {request.get('employee_name')} - {request.get('amount')} ر.ع"
    )
    
    return request

# ==================== HR - CAR CONTRACTS (عقود السيارات) ====================

@api_router.post("/hr/car-contracts", response_model=CarContract)
async def create_car_contract(contract_data: CarContractCreate, current_user: dict = Depends(get_current_user)):
    contract = CarContract(**contract_data.model_dump())
    await db.hr_car_contracts.insert_one(contract.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_car_contract",
        entity_type="car_contract",
        entity_id=contract.id,
        entity_name=contract_data.employee_name,
        details=f"عقد سيارة جديد: {contract_data.employee_name} - {contract_data.car_type}"
    )
    
    return contract

@api_router.get("/hr/car-contracts")
async def get_car_contracts(
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if employee_id:
        query["employee_id"] = employee_id
    
    contracts = await db.hr_car_contracts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return contracts

@api_router.put("/hr/car-contracts/{contract_id}", response_model=CarContract)
async def update_car_contract(contract_id: str, contract_data: CarContractCreate, current_user: dict = Depends(get_current_user)):
    result = await db.hr_car_contracts.update_one(
        {"id": contract_id},
        {"$set": contract_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Car contract not found")
    
    contract = await db.hr_car_contracts.find_one({"id": contract_id}, {"_id": 0})
    return contract

@api_router.delete("/hr/car-contracts/{contract_id}")
async def delete_car_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    contract = await db.hr_car_contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Car contract not found")
    
    result = await db.hr_car_contracts.update_one(
        {"id": contract_id},
        {"$set": {"status": "cancelled"}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="cancel_car_contract",
        entity_type="car_contract",
        entity_id=contract_id,
        entity_name=contract.get("employee_name"),
        details=f"إلغاء عقد سيارة: {contract.get('employee_name')}"
    )
    
    return {"message": "Car contract cancelled"}

# ==================== HR - OFFICIAL LETTERS (الرسائل الرسمية) ====================

@api_router.post("/hr/official-letters", response_model=OfficialLetter)
async def create_official_letter(letter_data: OfficialLetterCreate, current_user: dict = Depends(get_current_user)):
    # Generate letter number
    count = await db.hr_official_letters.count_documents({})
    year = datetime.now().year
    letter_number = f"LTR-{year}-{count + 1:04d}"
    
    letter = OfficialLetter(**letter_data.model_dump())
    letter_dict = letter.model_dump()
    letter_dict["letter_number"] = letter_number
    
    await db.hr_official_letters.insert_one(letter_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_official_letter",
        entity_type="official_letter",
        entity_id=letter.id,
        entity_name=letter_data.employee_name,
        details=f"رسالة رسمية: {letter_data.letter_type} - {letter_data.employee_name}"
    )
    
    return OfficialLetter(**letter_dict)

@api_router.get("/hr/official-letters")
async def get_official_letters(
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    letter_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if employee_id:
        query["employee_id"] = employee_id
    if letter_type:
        query["letter_type"] = letter_type
    
    letters = await db.hr_official_letters.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return letters

@api_router.put("/hr/official-letters/{letter_id}/issue")
async def issue_official_letter(letter_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.hr_official_letters.update_one(
        {"id": letter_id},
        {"$set": {
            "status": "issued",
            "issued_by": current_user["full_name"],
            "issued_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Official letter not found")
    
    letter = await db.hr_official_letters.find_one({"id": letter_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="issue_official_letter",
        entity_type="official_letter",
        entity_id=letter_id,
        entity_name=letter.get("employee_name"),
        details=f"إصدار رسالة رسمية: {letter.get('letter_number')} - {letter.get('employee_name')}"
    )
    
    return letter

# Approve official letter (electronic signature by HR manager)
@api_router.post("/hr/official-letters/{letter_id}/approve")
async def approve_official_letter(letter_id: str, current_user: dict = Depends(require_role(["admin", "hr_manager"]))):
    letter = await db.hr_official_letters.find_one({"id": letter_id}, {"_id": 0})
    if not letter:
        raise HTTPException(status_code=404, detail="Letter not found")
    
    if letter.get("is_approved"):
        raise HTTPException(status_code=400, detail="Letter already approved")
    
    # Generate electronic signature code
    import hashlib
    signature_data = f"{letter_id}-{current_user['id']}-{datetime.now().isoformat()}"
    signature_code = hashlib.sha256(signature_data.encode()).hexdigest()[:16].upper()
    
    await db.hr_official_letters.update_one(
        {"id": letter_id},
        {"$set": {
            "status": "approved",
            "is_approved": True,
            "approved_by": current_user["id"],
            "approved_by_name": current_user.get("full_name", ""),
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "signature_code": signature_code
        }}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="approve_official_letter",
        entity_type="official_letter",
        entity_id=letter_id,
        entity_name=letter.get("employee_name"),
        details=f"تصديق رسالة رسمية: {letter.get('letter_number')} - كود التصديق: {signature_code}"
    )
    
    return {"message": "تم تصديق الرسالة بنجاح", "signature_code": signature_code}

# Reject official letter
@api_router.post("/hr/official-letters/{letter_id}/reject")
async def reject_official_letter(letter_id: str, reason: str = "", current_user: dict = Depends(require_role(["admin", "hr_manager"]))):
    letter = await db.hr_official_letters.find_one({"id": letter_id}, {"_id": 0})
    if not letter:
        raise HTTPException(status_code=404, detail="Letter not found")
    
    await db.hr_official_letters.update_one(
        {"id": letter_id},
        {"$set": {
            "status": "rejected",
            "rejection_reason": reason,
            "approved_by": current_user["id"],
            "approved_by_name": current_user.get("full_name", ""),
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="reject_official_letter",
        entity_type="official_letter",
        entity_id=letter_id,
        entity_name=letter.get("employee_name"),
        details=f"رفض رسالة رسمية: {letter.get('letter_number')} - السبب: {reason}"
    )
    
    return {"message": "تم رفض الرسالة"}

# Mark letter as printed
@api_router.post("/hr/official-letters/{letter_id}/print")
async def mark_letter_printed(letter_id: str, current_user: dict = Depends(get_current_user)):
    letter = await db.hr_official_letters.find_one({"id": letter_id}, {"_id": 0})
    if not letter:
        raise HTTPException(status_code=404, detail="Letter not found")
    
    if not letter.get("is_approved"):
        raise HTTPException(status_code=400, detail="يجب تصديق الرسالة قبل الطباعة")
    
    await db.hr_official_letters.update_one(
        {"id": letter_id},
        {"$set": {
            "is_printed": True,
            "printed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "تم تسجيل الطباعة"}

# Get employee's own letters
@api_router.get("/hr/my-letters")
async def get_my_letters(current_user: dict = Depends(get_current_user)):
    # Find employee by username or user_id
    employee = await db.hr_employees.find_one({
        "$or": [
            {"user_id": current_user["id"]},
            {"username": current_user["username"]}
        ]
    }, {"_id": 0})
    
    if not employee:
        return []
    
    letters = await db.hr_official_letters.find(
        {"employee_id": employee["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return letters

# ==================== HR - FINGERPRINT DEVICES (أجهزة البصمة) ====================

@api_router.post("/hr/fingerprint-devices", response_model=FingerprintDevice)
async def create_fingerprint_device(device_data: FingerprintDeviceCreate, current_user: dict = Depends(require_role(["admin"]))):
    device = FingerprintDevice(**device_data.model_dump())
    await db.hr_fingerprint_devices.insert_one(device.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_fingerprint_device",
        entity_type="fingerprint_device",
        entity_id=device.id,
        entity_name=device_data.name,
        details=f"إضافة جهاز بصمة: {device_data.name} - {device_data.ip_address}"
    )
    
    return device

@api_router.get("/hr/fingerprint-devices")
async def get_fingerprint_devices(current_user: dict = Depends(get_current_user)):
    devices = await db.hr_fingerprint_devices.find({"is_active": True}, {"_id": 0}).to_list(100)
    return devices

@api_router.put("/hr/fingerprint-devices/{device_id}", response_model=FingerprintDevice)
async def update_fingerprint_device(device_id: str, device_data: FingerprintDeviceCreate, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.hr_fingerprint_devices.update_one(
        {"id": device_id},
        {"$set": device_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Device not found")
    device = await db.hr_fingerprint_devices.find_one({"id": device_id}, {"_id": 0})
    return device

@api_router.delete("/hr/fingerprint-devices/{device_id}")
async def delete_fingerprint_device(device_id: str, current_user: dict = Depends(require_role(["admin"]))):
    device = await db.hr_fingerprint_devices.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    result = await db.hr_fingerprint_devices.update_one(
        {"id": device_id},
        {"$set": {"is_active": False}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="delete_fingerprint_device",
        entity_type="fingerprint_device",
        entity_id=device_id,
        entity_name=device.get("name"),
        details=f"حذف جهاز بصمة: {device.get('name')}"
    )
    
    return {"message": "Device deleted successfully"}

@api_router.post("/hr/fingerprint-devices/{device_id}/sync")
async def sync_fingerprint_device(device_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Sync attendance data from Hikvision fingerprint device"""
    import aiohttp
    
    device = await db.hr_fingerprint_devices.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    try:
        # Hikvision API integration
        device_url = f"http://{device['ip_address']}/csl/login"
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
            # Try to connect to ZKTeco device
            try:
                async with session.get(f"http://{device['ip_address']}/", timeout=5) as response:
                    # Device is reachable
                    pass
            except Exception as conn_error:
                raise HTTPException(
                    status_code=500, 
                    detail=f"لا يمكن الاتصال بجهاز البصمة ({device['ip_address']}). تأكد من:\n1. أن الجهاز متصل بالشبكة\n2. أن عنوان IP صحيح\n3. أن النظام على نفس الشبكة المحلية"
                )
            
            # Login to device
            login_data = {
                "id": device.get("login_id"),
                "password": device.get("password")
            }
            
            try:
                async with session.post(device_url, data=login_data, timeout=10) as response:
                    if response.status != 200:
                        raise HTTPException(status_code=500, detail="فشل تسجيل الدخول للجهاز. تحقق من بيانات الدخول.")
                    
                    # Note: ZKTeco API integration requires specific SDK
                    # This is a placeholder for actual implementation
            except aiohttp.ClientError as e:
                raise HTTPException(status_code=500, detail=f"خطأ في الاتصال: {str(e)}")
        
        # Update last sync time
        await db.hr_fingerprint_devices.update_one(
            {"id": device_id},
            {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            "message": "تم الاتصال بالجهاز بنجاح. ملاحظة: تحتاج إلى تثبيت ZKTeco SDK لسحب البيانات تلقائياً.", 
            "device": device["name"],
            "note": "يمكنك استخدام خيار 'إضافة حضور' لإدخال البيانات يدوياً"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Fingerprint sync error: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"فشل المزامنة: الجهاز غير متصل أو خارج الشبكة المحلية ({device['ip_address']})"
        )

# Manual attendance import endpoint
@api_router.post("/hr/attendance/import")
async def import_attendance(
    records: List[AttendanceCreate],
    current_user: dict = Depends(require_role(["admin"]))
):
    """Import attendance records manually or from device export"""
    imported = 0
    for record in records:
        existing = await db.hr_attendance.find_one({
            "employee_id": record.employee_id,
            "date": record.date
        })
        if existing:
            await db.hr_attendance.update_one(
                {"id": existing["id"]},
                {"$set": record.model_dump()}
            )
        else:
            attendance = Attendance(**record.model_dump())
            await db.hr_attendance.insert_one(attendance.model_dump())
        imported += 1
    
    return {"message": f"Imported {imported} attendance records"}

# Import attendance from Excel file
@api_router.post("/hr/attendance/import-excel")
async def import_attendance_from_excel(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Import attendance records from Excel file"""
    import pandas as pd
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="يجب أن يكون الملف بصيغة Excel (.xlsx أو .xls)")
    
    try:
        content = await file.read()
        df = pd.read_excel(io.BytesIO(content))
        
        # Map column names (support both Arabic and English)
        column_mapping = {
            'التاريخ': 'date',
            'Date': 'date',
            'اسم الموظف': 'employee_name',
            'Employee Name': 'employee_name',
            'رقم الموظف': 'employee_id',
            'Employee ID': 'employee_id',
            'وقت الحضور': 'check_in',
            'Check In': 'check_in',
            'وقت الانصراف': 'check_out',
            'Check Out': 'check_out',
        }
        
        df = df.rename(columns=column_mapping)
        
        # Check required columns
        required_cols = ['date', 'employee_name']
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"عمود مطلوب غير موجود: {col}")
        
        imported = 0
        updated = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Find employee by name if no ID provided
                employee_id = row.get('employee_id', '')
                employee_name = str(row.get('employee_name', ''))
                
                if not employee_id:
                    employee = await db.hr_employees.find_one({"name": employee_name}, {"_id": 0})
                    if employee:
                        employee_id = employee['id']
                    else:
                        employee_id = employee_name  # Use name as fallback
                
                # Parse date
                date_val = row.get('date')
                if pd.isna(date_val):
                    continue
                if hasattr(date_val, 'strftime'):
                    date_str = date_val.strftime('%Y-%m-%d')
                else:
                    date_str = str(date_val)[:10]
                
                # Parse times
                check_in = row.get('check_in', '')
                check_out = row.get('check_out', '')
                
                if pd.isna(check_in):
                    check_in = None
                elif hasattr(check_in, 'strftime'):
                    check_in = check_in.strftime('%H:%M')
                else:
                    check_in = str(check_in)[:5] if check_in else None
                
                if pd.isna(check_out):
                    check_out = None
                elif hasattr(check_out, 'strftime'):
                    check_out = check_out.strftime('%H:%M')
                else:
                    check_out = str(check_out)[:5] if check_out else None
                
                # Check if record exists
                existing = await db.hr_attendance.find_one({
                    "employee_id": employee_id,
                    "date": date_str
                })
                
                if existing:
                    # Update existing record
                    update_data = {"source": "excel_import"}
                    if check_in:
                        update_data["check_in"] = check_in
                    if check_out:
                        update_data["check_out"] = check_out
                    
                    await db.hr_attendance.update_one(
                        {"id": existing["id"]},
                        {"$set": update_data}
                    )
                    updated += 1
                else:
                    # Create new record
                    attendance = Attendance(
                        employee_id=employee_id,
                        employee_name=employee_name,
                        date=date_str,
                        check_in=check_in,
                        check_out=check_out,
                        source="excel_import"
                    )
                    await db.hr_attendance.insert_one(attendance.model_dump())
                    imported += 1
                    
            except Exception as e:
                errors.append(f"خطأ في الصف {idx + 2}: {str(e)}")
        
        # Log activity
        await log_activity(
            user_id=current_user["id"],
            user_name=current_user["full_name"],
            action="import_attendance_excel",
            entity_type="attendance",
            details=f"استيراد {imported} سجل جديد و تحديث {updated} سجل من ملف Excel"
        )
        
        return {
            "message": f"تم استيراد {imported} سجل جديد وتحديث {updated} سجل",
            "imported": imported,
            "updated": updated,
            "errors": errors[:10] if errors else []
        }
        
    except Exception as e:
        logging.error(f"Error importing Excel: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في معالجة الملف: {str(e)}")

# Import attendance from ZKTeco MDB file
@api_router.post("/hr/attendance/import-zkteco")
async def import_attendance_from_zkteco(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Import attendance records from ZKTeco MDB database file"""
    import subprocess
    import tempfile
    import csv
    from io import StringIO
    
    if not file.filename.endswith('.mdb'):
        raise HTTPException(status_code=400, detail="يجب أن يكون الملف بصيغة MDB من جهاز ZKTeco")
    
    try:
        # Save uploaded file temporarily
        content = await file.read()
        with tempfile.NamedTemporaryFile(suffix='.mdb', delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        # Extract users from MDB
        users_result = subprocess.run(
            ['mdb-export', tmp_path, 'USERINFO'],
            capture_output=True, text=True
        )
        
        # Parse users into dictionary
        user_map = {}
        if users_result.returncode == 0:
            reader = csv.DictReader(StringIO(users_result.stdout))
            for row in reader:
                user_id = row.get('USERID', '')
                name = row.get('Name', '') or row.get('Badgenumber', '')
                badge = row.get('Badgenumber', '')
                if user_id:
                    user_map[user_id] = {'name': name, 'badge': badge}
        
        # Extract attendance records from MDB
        attendance_result = subprocess.run(
            ['mdb-export', tmp_path, 'CHECKINOUT'],
            capture_output=True, text=True
        )
        
        if attendance_result.returncode != 0:
            raise HTTPException(status_code=500, detail="فشل في قراءة ملف قاعدة البيانات")
        
        # Parse attendance records
        reader = csv.DictReader(StringIO(attendance_result.stdout))
        
        # Group records by user and date
        attendance_by_day = {}
        for row in reader:
            user_id = row.get('USERID', '')
            check_time_str = row.get('CHECKTIME', '')
            
            if not user_id or not check_time_str:
                continue
            
            try:
                # Parse datetime (format: "MM/DD/YY HH:MM:SS")
                from datetime import datetime as dt
                check_time = dt.strptime(check_time_str, "%m/%d/%y %H:%M:%S")
                date_str = check_time.strftime("%Y-%m-%d")
                time_str = check_time.strftime("%H:%M")
                
                key = f"{user_id}_{date_str}"
                if key not in attendance_by_day:
                    user_info = user_map.get(user_id, {'name': f'User_{user_id}', 'badge': user_id})
                    attendance_by_day[key] = {
                        'user_id': user_id,
                        'employee_name': user_info['name'],
                        'employee_badge': user_info['badge'],
                        'date': date_str,
                        'times': []
                    }
                attendance_by_day[key]['times'].append(time_str)
            except Exception as e:
                continue
        
        # Process and save attendance records
        imported = 0
        updated = 0
        
        for key, record in attendance_by_day.items():
            times = sorted(record['times'])
            check_in = times[0] if times else None
            check_out = times[-1] if len(times) > 1 else None
            
            # Find employee by badge or name
            employee = await db.hr_employees.find_one(
                {"$or": [
                    {"employee_id": record['employee_badge']},
                    {"name": record['employee_name']}
                ]},
                {"_id": 0}
            )
            
            employee_id = employee['id'] if employee else record['employee_badge']
            employee_name = employee['name'] if employee else record['employee_name']
            
            # Check if record exists
            existing = await db.hr_attendance.find_one({
                "employee_id": employee_id,
                "date": record['date']
            })
            
            if existing:
                # Update if new times are different
                update_data = {"source": "zkteco_import"}
                if check_in and (not existing.get('check_in') or check_in < existing.get('check_in', '23:59')):
                    update_data["check_in"] = check_in
                if check_out and (not existing.get('check_out') or check_out > existing.get('check_out', '00:00')):
                    update_data["check_out"] = check_out
                
                if len(update_data) > 1:
                    await db.hr_attendance.update_one(
                        {"id": existing["id"]},
                        {"$set": update_data}
                    )
                    updated += 1
            else:
                # Create new record
                attendance = Attendance(
                    employee_id=employee_id,
                    employee_name=employee_name,
                    date=record['date'],
                    check_in=check_in,
                    check_out=check_out,
                    source="zkteco_import"
                )
                await db.hr_attendance.insert_one(attendance.model_dump())
                imported += 1
        
        # Cleanup temp file
        import os
        os.unlink(tmp_path)
        
        # Log activity
        await log_activity(
            user_id=current_user["id"],
            user_name=current_user["full_name"],
            action="import_attendance_zkteco",
            entity_type="attendance",
            details=f"استيراد {imported} سجل جديد و تحديث {updated} سجل من ملف ZKTeco"
        )
        
        return {
            "message": f"تم استيراد {imported} سجل جديد وتحديث {updated} سجل من جهاز البصمة",
            "imported": imported,
            "updated": updated,
            "total_users": len(user_map),
            "total_days": len(attendance_by_day)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error importing ZKTeco MDB: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في معالجة الملف: {str(e)}")

# Export attendance to Excel
@api_router.get("/hr/attendance/export/excel")
async def export_attendance_excel(
    year: int,
    month: int,
    employee_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export attendance report to Excel"""
    import pandas as pd
    from openpyxl.styles import PatternFill, Font, Alignment
    
    month_start = f"{year}-{month:02d}-01"
    if month == 12:
        month_end = f"{year + 1}-01-01"
    else:
        month_end = f"{year}-{month + 1:02d}-01"
    
    query = {"date": {"$gte": month_start, "$lt": month_end}}
    if employee_id:
        query["employee_id"] = employee_id
    
    attendance = await db.hr_attendance.find(query, {"_id": 0}).to_list(10000)
    
    if not attendance:
        # Return empty template
        df = pd.DataFrame(columns=['التاريخ', 'اسم الموظف', 'وقت الحضور', 'وقت الانصراف', 'المصدر'])
    else:
        df = pd.DataFrame(attendance)
        columns_map = {
            'date': 'التاريخ',
            'employee_name': 'اسم الموظف',
            'check_in': 'وقت الحضور',
            'check_out': 'وقت الانصراف',
            'source': 'المصدر'
        }
        available_cols = [col for col in columns_map.keys() if col in df.columns]
        df = df[available_cols]
        df = df.rename(columns={k: v for k, v in columns_map.items() if k in available_cols})
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name=f'الحضور {month}-{year}', index=False)
        
        worksheet = writer.sheets[f'الحضور {month}-{year}']
        header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
        header_font = Font(bold=True, color='FFFFFF')
        
        for cell in worksheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
        
        for column in worksheet.columns:
            max_length = max(len(str(cell.value or '')) for cell in column)
            worksheet.column_dimensions[column[0].column_letter].width = max_length + 5
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=attendance_{year}_{month}.xlsx"}
    )

# Export attendance to PDF
@api_router.get("/hr/attendance/export/pdf")
async def export_attendance_pdf(
    year: int,
    month: int,
    employee_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export attendance report to PDF"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER
    
    month_start = f"{year}-{month:02d}-01"
    if month == 12:
        month_end = f"{year + 1}-01-01"
    else:
        month_end = f"{year}-{month + 1:02d}-01"
    
    query = {"date": {"$gte": month_start, "$lt": month_end}}
    if employee_id:
        query["employee_id"] = employee_id
    
    attendance = await db.hr_attendance.find(query, {"_id": 0}).sort("date", 1).to_list(10000)
    
    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=landscape(A4), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=TA_CENTER, fontSize=16)
    elements.append(Paragraph(f"تقرير الحضور والانصراف - Attendance Report", title_style))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"الشهر: {month}/{year}", ParagraphStyle('Date', alignment=TA_CENTER)))
    elements.append(Spacer(1, 20))
    
    # Table
    headers = ['Date', 'Employee', 'Check In', 'Check Out', 'Source']
    data = [headers]
    
    for record in attendance:
        data.append([
            record.get('date', ''),
            record.get('employee_name', ''),
            record.get('check_in', '-'),
            record.get('check_out', '-'),
            record.get('source', 'manual')
        ])
    
    if len(data) == 1:
        data.append(['', 'No attendance records', '', '', ''])
    
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F2F2F2')]),
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=attendance_{year}_{month}.pdf"}
    )

# ==================== HR - DEPARTMENTS & PERMISSIONS ====================

DEPARTMENTS = [
    {"id": "admin", "name": "الإدارة", "name_en": "Administration"},
    {"id": "it", "name": "تقنية المعلومات", "name_en": "IT"},
    {"id": "hr", "name": "الموارد البشرية", "name_en": "Human Resources"},
    {"id": "finance", "name": "المالية", "name_en": "Finance"},
    {"id": "purchasing", "name": "المشتريات", "name_en": "Purchasing"},
    {"id": "milk_reception", "name": "استلام الحليب", "name_en": "Milk Reception"},
    {"id": "sales", "name": "المبيعات", "name_en": "Sales"},
    {"id": "inventory", "name": "المخازن", "name_en": "Inventory"},
    {"id": "legal", "name": "القسم القانوني", "name_en": "Legal"},
    {"id": "projects", "name": "المشاريع", "name_en": "Projects"},
    {"id": "operations", "name": "العمليات", "name_en": "Operations"},
    {"id": "marketing", "name": "التسويق", "name_en": "Marketing"},
]

PERMISSIONS = {
    "admin": ["all"],
    "it": ["all"],
    "hr": ["hr", "employees", "attendance", "leave", "expense", "car_contracts", "letters"],
    "finance": ["finance", "payments", "reports", "expense"],
    "purchasing": ["suppliers", "feed_purchases", "inventory"],
    "milk_reception": ["milk_reception", "suppliers", "quality"],
    "sales": ["sales", "customers", "inventory"],
    "inventory": ["inventory", "reports"],
    "legal": ["legal", "contracts", "cases", "consultations", "documents"],
    "projects": ["projects", "tasks", "milestones", "team_members"],
    "operations": ["operations", "equipment", "maintenance", "incidents", "vehicles"],
    "marketing": ["marketing", "campaigns", "leads", "offers", "returns", "social"]
}

# قائمة الصلاحيات المتاحة
AVAILABLE_PERMISSIONS = [
    {"id": "dashboard", "name": "لوحة التحكم", "name_en": "Dashboard"},
    {"id": "suppliers", "name": "الموردين", "name_en": "Suppliers"},
    {"id": "milk_reception", "name": "استلام الحليب", "name_en": "Milk Reception"},
    {"id": "customers", "name": "العملاء", "name_en": "Customers"},
    {"id": "sales", "name": "المبيعات", "name_en": "Sales"},
    {"id": "feed_purchases", "name": "مشتريات الأعلاف", "name_en": "Feed Purchases"},
    {"id": "inventory", "name": "المخزون", "name_en": "Inventory"},
    {"id": "finance", "name": "المالية", "name_en": "Finance"},
    {"id": "hr", "name": "الموارد البشرية", "name_en": "Human Resources"},
    {"id": "employees", "name": "الموظفين", "name_en": "Employees"},
    {"id": "reports", "name": "التقارير", "name_en": "Reports"},
    {"id": "settings", "name": "الإعدادات", "name_en": "Settings"},
    {"id": "attendance", "name": "الحضور والانصراف", "name_en": "Attendance"},
    {"id": "leave", "name": "الإجازات", "name_en": "Leave Requests"},
    {"id": "expense", "name": "المصاريف", "name_en": "Expenses"},
    {"id": "car_contracts", "name": "عقود السيارات", "name_en": "Car Contracts"},
    {"id": "letters", "name": "الرسائل الرسمية", "name_en": "Official Letters"},
    {"id": "quality", "name": "فحص الجودة", "name_en": "Quality Testing"},
    {"id": "payments", "name": "المدفوعات", "name_en": "Payments"},
    # Legal permissions
    {"id": "legal", "name": "القسم القانوني", "name_en": "Legal"},
    {"id": "contracts", "name": "العقود القانونية", "name_en": "Legal Contracts"},
    {"id": "cases", "name": "القضايا", "name_en": "Legal Cases"},
    {"id": "consultations", "name": "الاستشارات القانونية", "name_en": "Legal Consultations"},
    {"id": "documents", "name": "المستندات القانونية", "name_en": "Legal Documents"},
    # Projects permissions
    {"id": "projects", "name": "المشاريع", "name_en": "Projects"},
    {"id": "tasks", "name": "مهام المشاريع", "name_en": "Project Tasks"},
    {"id": "milestones", "name": "المراحل", "name_en": "Milestones"},
    {"id": "team_members", "name": "أعضاء الفريق", "name_en": "Team Members"},
    # Operations permissions
    {"id": "operations", "name": "العمليات", "name_en": "Operations"},
    {"id": "equipment", "name": "المعدات", "name_en": "Equipment"},
    {"id": "maintenance", "name": "الصيانة", "name_en": "Maintenance"},
    {"id": "incidents", "name": "الحوادث", "name_en": "Incidents"},
    {"id": "vehicles", "name": "المركبات", "name_en": "Vehicles"},
    # Marketing permissions
    {"id": "marketing", "name": "التسويق", "name_en": "Marketing"},
    {"id": "campaigns", "name": "الحملات التسويقية", "name_en": "Marketing Campaigns"},
    {"id": "leads", "name": "العملاء المحتملين", "name_en": "Leads"},
    {"id": "offers", "name": "العروض", "name_en": "Sales Offers"},
    {"id": "returns", "name": "المرتجعات", "name_en": "Returns"},
    {"id": "social", "name": "وسائل التواصل", "name_en": "Social Media"},
    {"id": "all", "name": "جميع الصلاحيات", "name_en": "All Permissions"},
]

@api_router.get("/hr/departments")
async def get_departments():
    return DEPARTMENTS

@api_router.get("/hr/available-permissions")
async def get_available_permissions():
    """Get list of all available permissions"""
    return AVAILABLE_PERMISSIONS

@api_router.get("/hr/permissions/{department}")
async def get_department_permissions(department: str):
    return {"department": department, "permissions": PERMISSIONS.get(department, [])}

@api_router.get("/hr/managers")
async def get_managers(current_user: dict = Depends(get_current_user)):
    """Get list of employees who can be managers (department heads)"""
    managers = await db.hr_employees.find(
        {"is_active": True, "position": {"$regex": "مدير|مسؤول|رئيس|Manager|Head|Supervisor", "$options": "i"}},
        {"_id": 0}
    ).to_list(100)
    
    # Also include employees from admin/it/hr departments
    dept_heads = await db.hr_employees.find(
        {"is_active": True, "department": {"$in": ["admin", "it", "hr"]}},
        {"_id": 0}
    ).to_list(100)
    
    # Merge and deduplicate
    all_managers = {m["id"]: m for m in managers}
    for m in dept_heads:
        all_managers[m["id"]] = m
    
    return list(all_managers.values())

# ==================== HR - DASHBOARD ====================

@api_router.get("/hr/dashboard")
async def get_hr_dashboard(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    
    # Count employees
    total_employees = await db.hr_employees.count_documents({"is_active": True})
    
    # Today's attendance
    today_attendance = await db.hr_attendance.count_documents({"date": today})
    
    # Pending leave requests
    pending_leaves = await db.hr_leave_requests.count_documents({"status": "pending"})
    
    # Pending expense requests
    pending_expenses = await db.hr_expense_requests.count_documents({"status": "pending"})
    
    # Active car contracts
    active_contracts = await db.hr_car_contracts.count_documents({"status": "active"})
    
    # Recent activities
    recent_leaves = await db.hr_leave_requests.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).to_list(5)
    
    recent_expenses = await db.hr_expense_requests.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).to_list(5)
    
    return {
        "total_employees": total_employees,
        "today_attendance": today_attendance,
        "pending_leaves": pending_leaves,
        "pending_expenses": pending_expenses,
        "active_car_contracts": active_contracts,
        "recent_leave_requests": recent_leaves,
        "recent_expense_requests": recent_expenses
    }

# ==================== REPORTS EXPORT (تصدير التقارير) ====================

@api_router.get("/reports/export/suppliers/excel")
async def export_suppliers_excel(current_user: dict = Depends(get_current_user)):
    """Export suppliers report to Excel"""
    import pandas as pd
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    
    suppliers = await db.suppliers.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    if not suppliers:
        raise HTTPException(status_code=404, detail="No suppliers found")
    
    # Create DataFrame
    df = pd.DataFrame(suppliers)
    columns_map = {
        'name': 'اسم المورد',
        'code': 'الكود',
        'phone': 'الهاتف',
        'bank_account': 'رقم الحساب البنكي',
        'balance': 'الرصيد',
        'total_supplied': 'إجمالي التوريد',
        'center_name': 'المركز'
    }
    
    # Select and rename columns
    available_cols = [col for col in columns_map.keys() if col in df.columns]
    df = df[available_cols]
    df = df.rename(columns={k: v for k, v in columns_map.items() if k in available_cols})
    
    # Create Excel file
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='الموردين', index=False)
        
        # Style the worksheet
        workbook = writer.book
        worksheet = writer.sheets['الموردين']
        
        # Style header
        header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
        header_font = Font(bold=True, color='FFFFFF')
        
        for cell in worksheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
        
        # Adjust column widths
        for column in worksheet.columns:
            max_length = max(len(str(cell.value or '')) for cell in column)
            worksheet.column_dimensions[column[0].column_letter].width = max_length + 5
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=suppliers_report.xlsx"}
    )

@api_router.get("/reports/export/milk-receptions/excel")
async def export_milk_receptions_excel(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    supplier_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export milk receptions report to Excel"""
    import pandas as pd
    
    query = {}
    if start_date:
        query["reception_date"] = {"$gte": start_date}
    if end_date:
        if "reception_date" in query:
            query["reception_date"]["$lte"] = end_date
        else:
            query["reception_date"] = {"$lte": end_date}
    if supplier_id:
        query["supplier_id"] = supplier_id
    
    receptions = await db.milk_receptions.find(query, {"_id": 0}).sort("reception_date", -1).to_list(10000)
    
    if not receptions:
        raise HTTPException(status_code=404, detail="No receptions found")
    
    df = pd.DataFrame(receptions)
    columns_map = {
        'reception_date': 'تاريخ الاستلام',
        'supplier_name': 'اسم المورد',
        'quantity_liters': 'الكمية (لتر)',
        'price_per_liter': 'سعر اللتر',
        'total_amount': 'المبلغ الإجمالي',
        'fat_percentage': 'نسبة الدهون',
        'protein_percentage': 'نسبة البروتين'
    }
    
    available_cols = [col for col in columns_map.keys() if col in df.columns]
    df = df[available_cols]
    df = df.rename(columns={k: v for k, v in columns_map.items() if k in available_cols})
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='استلام الحليب', index=False)
        
        workbook = writer.book
        worksheet = writer.sheets['استلام الحليب']
        
        from openpyxl.styles import PatternFill, Font, Alignment
        header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
        header_font = Font(bold=True, color='FFFFFF')
        
        for cell in worksheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
        
        for column in worksheet.columns:
            max_length = max(len(str(cell.value or '')) for cell in column)
            worksheet.column_dimensions[column[0].column_letter].width = max_length + 5
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=milk_receptions_report.xlsx"}
    )

@api_router.get("/reports/export/hr/employees/excel")
async def export_employees_excel(current_user: dict = Depends(get_current_user)):
    """Export HR employees report to Excel"""
    import pandas as pd
    from openpyxl.styles import PatternFill, Font, Alignment
    
    employees = await db.hr_employees.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    if not employees:
        raise HTTPException(status_code=404, detail="No employees found")
    
    df = pd.DataFrame(employees)
    columns_map = {
        'employee_code': 'كود الموظف',
        'name': 'اسم الموظف',
        'department': 'القسم',
        'position': 'المنصب',
        'phone': 'الهاتف',
        'email': 'البريد الإلكتروني',
        'salary': 'الراتب',
        'hire_date': 'تاريخ التعيين'
    }
    
    available_cols = [col for col in columns_map.keys() if col in df.columns]
    df = df[available_cols]
    df = df.rename(columns={k: v for k, v in columns_map.items() if k in available_cols})
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='الموظفين', index=False)
        
        worksheet = writer.sheets['الموظفين']
        header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
        header_font = Font(bold=True, color='FFFFFF')
        
        for cell in worksheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
        
        for column in worksheet.columns:
            max_length = max(len(str(cell.value or '')) for cell in column)
            worksheet.column_dimensions[column[0].column_letter].width = max_length + 5
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=employees_report.xlsx"}
    )

@api_router.get("/reports/export/finance/excel")
async def export_finance_excel(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export finance report to Excel"""
    import pandas as pd
    from openpyxl.styles import PatternFill, Font, Alignment
    
    query = {}
    if start_date:
        query["payment_date"] = {"$gte": start_date}
    if end_date:
        if "payment_date" in query:
            query["payment_date"]["$lte"] = end_date
        else:
            query["payment_date"] = {"$lte": end_date}
    
    payments = await db.payments.find(query, {"_id": 0}).sort("payment_date", -1).to_list(10000)
    
    if not payments:
        raise HTTPException(status_code=404, detail="No payments found")
    
    df = pd.DataFrame(payments)
    columns_map = {
        'payment_date': 'تاريخ الدفع',
        'payment_type': 'نوع الدفع',
        'related_name': 'الاسم',
        'amount': 'المبلغ',
        'payment_method': 'طريقة الدفع',
        'bank_account': 'الحساب البنكي',
        'notes': 'ملاحظات'
    }
    
    available_cols = [col for col in columns_map.keys() if col in df.columns]
    df = df[available_cols]
    df = df.rename(columns={k: v for k, v in columns_map.items() if k in available_cols})
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='المدفوعات', index=False)
        
        worksheet = writer.sheets['المدفوعات']
        header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
        header_font = Font(bold=True, color='FFFFFF')
        
        for cell in worksheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
        
        for column in worksheet.columns:
            max_length = max(len(str(cell.value or '')) for cell in column)
            worksheet.column_dimensions[column[0].column_letter].width = max_length + 5
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=finance_report.xlsx"}
    )

@api_router.get("/reports/export/suppliers/pdf")
async def export_suppliers_pdf(current_user: dict = Depends(get_current_user)):
    """Export suppliers report to PDF"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.enums import TA_RIGHT, TA_CENTER
    
    suppliers = await db.suppliers.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    if not suppliers:
        raise HTTPException(status_code=404, detail="No suppliers found")
    
    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=landscape(A4), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=TA_CENTER, fontSize=18)
    elements.append(Paragraph("تقرير الموردين - Suppliers Report", title_style))
    elements.append(Spacer(1, 20))
    
    # Date
    date_style = ParagraphStyle('Date', parent=styles['Normal'], alignment=TA_CENTER, fontSize=10)
    elements.append(Paragraph(f"التاريخ: {datetime.now().strftime('%Y-%m-%d')}", date_style))
    elements.append(Spacer(1, 20))
    
    # Table data
    headers = ['Code', 'Name', 'Phone', 'Bank Account', 'Balance', 'Total Supplied', 'Center']
    data = [headers]
    
    for s in suppliers:
        row = [
            s.get('code', ''),
            s.get('name', ''),
            s.get('phone', ''),
            s.get('bank_account', ''),
            f"{s.get('balance', 0):.3f}",
            f"{s.get('total_supplied', 0):.2f}",
            s.get('center_name', '')
        ]
        data.append(row)
    
    # Create table
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#E9ECF1')),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F2F2F2')]),
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=suppliers_report.pdf"}
    )

@api_router.get("/reports/export/daily/pdf")
async def export_daily_report_pdf(
    date: str,
    current_user: dict = Depends(get_current_user)
):
    """Export daily report to PDF"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER
    
    # Get daily data
    receptions = await db.milk_receptions.find({"reception_date": date}, {"_id": 0}).to_list(1000)
    sales = await db.sales.find({"sale_date": date}, {"_id": 0}).to_list(1000)
    
    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=TA_CENTER, fontSize=16)
    elements.append(Paragraph(f"التقرير اليومي - Daily Report", title_style))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"التاريخ: {date}", ParagraphStyle('Date', alignment=TA_CENTER)))
    elements.append(Spacer(1, 20))
    
    # Summary
    total_milk = sum(r.get('quantity_liters', 0) for r in receptions)
    total_sales = sum(s.get('total_amount', 0) for s in sales)
    
    summary_data = [
        ['الوصف', 'القيمة'],
        ['إجمالي الحليب المستلم (لتر)', f'{total_milk:.2f}'],
        ['عدد عمليات الاستلام', str(len(receptions))],
        ['إجمالي المبيعات (ر.ع)', f'{total_sales:.3f}'],
        ['عدد عمليات البيع', str(len(sales))],
    ]
    
    summary_table = Table(summary_data, colWidths=[200, 150])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F2F2F2')]),
    ]))
    
    elements.append(summary_table)
    elements.append(Spacer(1, 30))
    
    # Receptions detail
    if receptions:
        elements.append(Paragraph("تفاصيل استلام الحليب - Milk Receptions", styles['Heading2']))
        elements.append(Spacer(1, 10))
        
        rec_headers = ['Supplier', 'Quantity (L)', 'Price/L', 'Total', 'Fat %']
        rec_data = [rec_headers]
        for r in receptions:
            rec_data.append([
                r.get('supplier_name', ''),
                f"{r.get('quantity_liters', 0):.2f}",
                f"{r.get('price_per_liter', 0):.3f}",
                f"{r.get('total_amount', 0):.3f}",
                f"{r.get('fat_percentage', 0):.1f}"
            ])
        
        rec_table = Table(rec_data, repeatRows=1)
        rec_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#70AD47')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(rec_table)
    
    doc.build(elements)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=daily_report_{date}.pdf"}
    )

# ==================== LEGAL MODULE ROUTES (قسم القانون) ====================

# Legal Contracts (العقود القانونية)
@api_router.post("/legal/contracts", response_model=LegalContract)
async def create_legal_contract(contract_data: LegalContractCreate, current_user: dict = Depends(get_current_user)):
    # Generate contract number
    count = await db.legal_contracts.count_documents({})
    year = datetime.now().year
    contract_number = f"CTR-{year}-{count + 1:04d}"
    
    contract = LegalContract(**contract_data.model_dump())
    contract_dict = contract.model_dump()
    contract_dict["contract_number"] = contract_number
    contract_dict["created_by"] = current_user["id"]
    
    await db.legal_contracts.insert_one(contract_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_legal_contract",
        entity_type="legal_contract",
        entity_id=contract.id,
        entity_name=contract_data.title,
        details=f"عقد قانوني: {contract_data.title} - {contract_data.party_name}"
    )
    
    return LegalContract(**contract_dict)

@api_router.get("/legal/contracts")
async def get_legal_contracts(
    status: Optional[str] = None,
    contract_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if contract_type:
        query["contract_type"] = contract_type
    
    contracts = await db.legal_contracts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return contracts

@api_router.get("/legal/contracts/{contract_id}")
async def get_legal_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    contract = await db.legal_contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract

@api_router.put("/legal/contracts/{contract_id}", response_model=LegalContract)
async def update_legal_contract(contract_id: str, contract_data: LegalContractCreate, current_user: dict = Depends(get_current_user)):
    result = await db.legal_contracts.update_one(
        {"id": contract_id},
        {"$set": contract_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    contract = await db.legal_contracts.find_one({"id": contract_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_legal_contract",
        entity_type="legal_contract",
        entity_id=contract_id,
        entity_name=contract.get("title"),
        details=f"تعديل عقد: {contract.get('title')}"
    )
    
    return contract

@api_router.delete("/legal/contracts/{contract_id}")
async def delete_legal_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    contract = await db.legal_contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    await db.legal_contracts.update_one(
        {"id": contract_id},
        {"$set": {"status": "terminated"}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="terminate_legal_contract",
        entity_type="legal_contract",
        entity_id=contract_id,
        entity_name=contract.get("title"),
        details=f"إنهاء عقد: {contract.get('title')}"
    )
    
    return {"message": "Contract terminated successfully"}

# Legal Cases (القضايا القانونية)
@api_router.post("/legal/cases", response_model=LegalCase)
async def create_legal_case(case_data: LegalCaseCreate, current_user: dict = Depends(get_current_user)):
    count = await db.legal_cases.count_documents({})
    year = datetime.now().year
    case_number = f"CASE-{year}-{count + 1:04d}"
    
    case = LegalCase(**case_data.model_dump())
    case_dict = case.model_dump()
    case_dict["case_number"] = case_number
    case_dict["created_by"] = current_user["id"]
    
    await db.legal_cases.insert_one(case_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_legal_case",
        entity_type="legal_case",
        entity_id=case.id,
        entity_name=case_data.title,
        details=f"قضية قانونية: {case_data.title}"
    )
    
    return LegalCase(**case_dict)

@api_router.get("/legal/cases")
async def get_legal_cases(
    status: Optional[str] = None,
    case_type: Optional[str] = None,
    priority: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if case_type:
        query["case_type"] = case_type
    if priority:
        query["priority"] = priority
    
    cases = await db.legal_cases.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return cases

@api_router.put("/legal/cases/{case_id}", response_model=LegalCase)
async def update_legal_case(case_id: str, case_data: LegalCaseCreate, current_user: dict = Depends(get_current_user)):
    result = await db.legal_cases.update_one(
        {"id": case_id},
        {"$set": case_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case = await db.legal_cases.find_one({"id": case_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_legal_case",
        entity_type="legal_case",
        entity_id=case_id,
        entity_name=case.get("title"),
        details=f"تعديل قضية: {case.get('title')}"
    )
    
    return case

@api_router.put("/legal/cases/{case_id}/close")
async def close_legal_case(case_id: str, outcome: str, settlement_amount: Optional[float] = None, current_user: dict = Depends(get_current_user)):
    result = await db.legal_cases.update_one(
        {"id": case_id},
        {"$set": {
            "status": "closed",
            "outcome": outcome,
            "settlement_amount": settlement_amount,
            "closed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case = await db.legal_cases.find_one({"id": case_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="close_legal_case",
        entity_type="legal_case",
        entity_id=case_id,
        entity_name=case.get("title"),
        details=f"إغلاق قضية: {case.get('title')} - {outcome}"
    )
    
    return case

# Legal Consultations (الاستشارات القانونية)
@api_router.post("/legal/consultations", response_model=LegalConsultation)
async def create_legal_consultation(consultation_data: LegalConsultationCreate, current_user: dict = Depends(get_current_user)):
    consultation = LegalConsultation(**consultation_data.model_dump())
    await db.legal_consultations.insert_one(consultation.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_legal_consultation",
        entity_type="legal_consultation",
        entity_id=consultation.id,
        entity_name=consultation_data.subject,
        details=f"استشارة قانونية: {consultation_data.subject}"
    )
    
    return consultation

@api_router.get("/legal/consultations")
async def get_legal_consultations(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    
    consultations = await db.legal_consultations.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return consultations

@api_router.put("/legal/consultations/{consultation_id}/respond")
async def respond_to_consultation(consultation_id: str, response: str, current_user: dict = Depends(get_current_user)):
    result = await db.legal_consultations.update_one(
        {"id": consultation_id},
        {"$set": {
            "status": "completed",
            "response": response,
            "responded_by": current_user["full_name"],
            "responded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    consultation = await db.legal_consultations.find_one({"id": consultation_id}, {"_id": 0})
    return consultation

# Legal Documents (المستندات القانونية)
@api_router.post("/legal/documents", response_model=LegalDocument)
async def create_legal_document(document_data: LegalDocumentCreate, current_user: dict = Depends(get_current_user)):
    document = LegalDocument(**document_data.model_dump())
    document_dict = document.model_dump()
    document_dict["created_by"] = current_user["id"]
    
    await db.legal_documents.insert_one(document_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_legal_document",
        entity_type="legal_document",
        entity_id=document.id,
        entity_name=document_data.title,
        details=f"مستند قانوني: {document_data.title}"
    )
    
    return LegalDocument(**document_dict)

@api_router.get("/legal/documents")
async def get_legal_documents(
    document_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if document_type:
        query["document_type"] = document_type
    if status:
        query["status"] = status
    
    documents = await db.legal_documents.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return documents

# Legal Dashboard Stats
@api_router.get("/legal/dashboard")
async def get_legal_dashboard(current_user: dict = Depends(get_current_user)):
    contracts_active = await db.legal_contracts.count_documents({"status": "active"})
    contracts_expiring = await db.legal_contracts.count_documents({
        "status": "active",
        "end_date": {"$lte": (datetime.now() + timedelta(days=30)).isoformat()}
    })
    cases_open = await db.legal_cases.count_documents({"status": {"$in": ["open", "in_progress"]}})
    consultations_pending = await db.legal_consultations.count_documents({"status": "pending"})
    
    return {
        "contracts_active": contracts_active,
        "contracts_expiring_soon": contracts_expiring,
        "cases_open": cases_open,
        "consultations_pending": consultations_pending
    }

# ==================== PROJECTS MODULE ROUTES (قسم المشاريع) ====================

# Projects
@api_router.post("/projects", response_model=Project)
async def create_project(project_data: ProjectCreate, current_user: dict = Depends(get_current_user)):
    count = await db.projects.count_documents({})
    year = datetime.now().year
    project_code = f"PRJ-{year}-{count + 1:04d}"
    
    project = Project(**project_data.model_dump())
    project_dict = project.model_dump()
    project_dict["project_code"] = project_code
    project_dict["created_by"] = current_user["id"]
    
    await db.projects.insert_one(project_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_project",
        entity_type="project",
        entity_id=project.id,
        entity_name=project_data.name,
        details=f"مشروع جديد: {project_data.name}"
    )
    
    return Project(**project_dict)

@api_router.get("/projects")
async def get_projects(
    status: Optional[str] = None,
    project_type: Optional[str] = None,
    manager_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if project_type:
        query["project_type"] = project_type
    if manager_id:
        query["manager_id"] = manager_id
    
    projects = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return projects

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, project_data: ProjectCreate, current_user: dict = Depends(get_current_user)):
    result = await db.projects.update_one(
        {"id": project_id},
        {"$set": project_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_project",
        entity_type="project",
        entity_id=project_id,
        entity_name=project.get("name"),
        details=f"تعديل مشروع: {project.get('name')}"
    )
    
    return project

@api_router.put("/projects/{project_id}/status")
async def update_project_status(project_id: str, status: str, progress_percentage: Optional[float] = None, current_user: dict = Depends(get_current_user)):
    update_data = {"status": status}
    if progress_percentage is not None:
        update_data["progress_percentage"] = progress_percentage
    
    result = await db.projects.update_one(
        {"id": project_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_project_status",
        entity_type="project",
        entity_id=project_id,
        entity_name=project.get("name"),
        details=f"تحديث حالة مشروع: {project.get('name')} - {status}"
    )
    
    return project

# Project Tasks
@api_router.post("/projects/tasks", response_model=ProjectTask)
async def create_project_task(task_data: ProjectTaskCreate, current_user: dict = Depends(get_current_user)):
    task = ProjectTask(**task_data.model_dump())
    await db.project_tasks.insert_one(task.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_project_task",
        entity_type="project_task",
        entity_id=task.id,
        entity_name=task_data.task_name,
        details=f"مهمة جديدة: {task_data.task_name} - {task_data.project_name}"
    )
    
    return task

@api_router.get("/projects/{project_id}/tasks")
async def get_project_tasks(project_id: str, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"project_id": project_id}
    if status:
        query["status"] = status
    
    tasks = await db.project_tasks.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return tasks

@api_router.put("/projects/tasks/{task_id}", response_model=ProjectTask)
async def update_project_task(task_id: str, task_data: ProjectTaskCreate, current_user: dict = Depends(get_current_user)):
    result = await db.project_tasks.update_one(
        {"id": task_id},
        {"$set": task_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = await db.project_tasks.find_one({"id": task_id}, {"_id": 0})
    return task

@api_router.put("/projects/tasks/{task_id}/complete")
async def complete_project_task(task_id: str, actual_hours: float = 0, current_user: dict = Depends(get_current_user)):
    result = await db.project_tasks.update_one(
        {"id": task_id},
        {"$set": {
            "status": "completed",
            "progress_percentage": 100,
            "actual_hours": actual_hours,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = await db.project_tasks.find_one({"id": task_id}, {"_id": 0})
    return task

# Project Team Members
@api_router.post("/projects/team", response_model=ProjectTeamMember)
async def add_project_team_member(member_data: ProjectTeamMemberCreate, current_user: dict = Depends(get_current_user)):
    member = ProjectTeamMember(**member_data.model_dump())
    await db.project_team_members.insert_one(member.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="add_project_team_member",
        entity_type="project_team_member",
        entity_id=member.id,
        entity_name=member_data.employee_name,
        details=f"إضافة عضو للمشروع: {member_data.employee_name} - {member_data.project_name}"
    )
    
    return member

@api_router.get("/projects/{project_id}/team")
async def get_project_team(project_id: str, current_user: dict = Depends(get_current_user)):
    members = await db.project_team_members.find({"project_id": project_id, "is_active": True}, {"_id": 0}).to_list(100)
    return members

@api_router.delete("/projects/team/{member_id}")
async def remove_project_team_member(member_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.project_team_members.update_one(
        {"id": member_id},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")
    return {"message": "Team member removed"}

# Project Milestones
@api_router.post("/projects/milestones", response_model=ProjectMilestone)
async def create_project_milestone(milestone_data: ProjectMilestoneCreate, current_user: dict = Depends(get_current_user)):
    milestone = ProjectMilestone(**milestone_data.model_dump())
    await db.project_milestones.insert_one(milestone.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_project_milestone",
        entity_type="project_milestone",
        entity_id=milestone.id,
        entity_name=milestone_data.name,
        details=f"مرحلة جديدة: {milestone_data.name} - {milestone_data.project_name}"
    )
    
    return milestone

@api_router.get("/projects/{project_id}/milestones")
async def get_project_milestones(project_id: str, current_user: dict = Depends(get_current_user)):
    milestones = await db.project_milestones.find({"project_id": project_id}, {"_id": 0}).sort("due_date", 1).to_list(100)
    return milestones

@api_router.put("/projects/milestones/{milestone_id}/achieve")
async def achieve_milestone(milestone_id: str, notes: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    result = await db.project_milestones.update_one(
        {"id": milestone_id},
        {"$set": {
            "status": "achieved",
            "achieved_date": datetime.now(timezone.utc).isoformat(),
            "notes": notes
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    milestone = await db.project_milestones.find_one({"id": milestone_id}, {"_id": 0})
    return milestone

# Projects Dashboard
@api_router.get("/projects/dashboard/stats")
async def get_projects_dashboard(current_user: dict = Depends(get_current_user)):
    total_projects = await db.projects.count_documents({})
    active_projects = await db.projects.count_documents({"status": "in_progress"})
    completed_projects = await db.projects.count_documents({"status": "completed"})
    overdue_tasks = await db.project_tasks.count_documents({
        "status": {"$ne": "completed"},
        "due_date": {"$lt": datetime.now(timezone.utc).isoformat()}
    })
    
    # Get projects with budget
    projects = await db.projects.find({}, {"_id": 0, "budget": 1, "actual_cost": 1}).to_list(1000)
    total_budget = sum(p.get("budget", 0) for p in projects)
    total_actual_cost = sum(p.get("actual_cost", 0) for p in projects)
    
    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
        "overdue_tasks": overdue_tasks,
        "total_budget": total_budget,
        "total_actual_cost": total_actual_cost
    }

# ==================== OPERATIONS MODULE ROUTES (قسم العمليات) ====================

# Daily Operations
@api_router.post("/operations/daily", response_model=DailyOperation)
async def create_daily_operation(operation_data: DailyOperationCreate, current_user: dict = Depends(get_current_user)):
    operation = DailyOperation(**operation_data.model_dump())
    operation_dict = operation.model_dump()
    operation_dict["created_by"] = current_user["id"]
    
    await db.daily_operations.insert_one(operation_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_daily_operation",
        entity_type="daily_operation",
        entity_id=operation.id,
        entity_name=f"{operation_data.operation_date} - {operation_data.shift}",
        details=f"عملية يومية: {operation_data.operation_date} - {operation_data.shift}"
    )
    
    return DailyOperation(**operation_dict)

@api_router.get("/operations/daily")
async def get_daily_operations(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    center_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if start_date:
        query["operation_date"] = {"$gte": start_date}
    if end_date:
        if "operation_date" in query:
            query["operation_date"]["$lte"] = end_date
        else:
            query["operation_date"] = {"$lte": end_date}
    if center_id:
        query["center_id"] = center_id
    
    operations = await db.daily_operations.find(query, {"_id": 0}).sort("operation_date", -1).to_list(1000)
    return operations

@api_router.put("/operations/daily/{operation_id}", response_model=DailyOperation)
async def update_daily_operation(operation_id: str, operation_data: DailyOperationCreate, current_user: dict = Depends(get_current_user)):
    result = await db.daily_operations.update_one(
        {"id": operation_id},
        {"$set": operation_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Operation not found")
    
    operation = await db.daily_operations.find_one({"id": operation_id}, {"_id": 0})
    return operation

# Equipment
@api_router.post("/operations/equipment", response_model=Equipment)
async def create_equipment(equipment_data: EquipmentCreate, current_user: dict = Depends(get_current_user)):
    count = await db.equipment.count_documents({})
    equipment_code = f"EQP-{count + 1:04d}"
    
    equipment = Equipment(**equipment_data.model_dump())
    equipment_dict = equipment.model_dump()
    equipment_dict["equipment_code"] = equipment_code
    
    await db.equipment.insert_one(equipment_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_equipment",
        entity_type="equipment",
        entity_id=equipment.id,
        entity_name=equipment_data.name,
        details=f"معدة جديدة: {equipment_data.name}"
    )
    
    return Equipment(**equipment_dict)

@api_router.get("/operations/equipment")
async def get_equipment(
    equipment_type: Optional[str] = None,
    status: Optional[str] = None,
    center_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if equipment_type:
        query["equipment_type"] = equipment_type
    if status:
        query["status"] = status
    if center_id:
        query["center_id"] = center_id
    
    equipment = await db.equipment.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return equipment

@api_router.put("/operations/equipment/{equipment_id}", response_model=Equipment)
async def update_equipment(equipment_id: str, equipment_data: EquipmentCreate, current_user: dict = Depends(get_current_user)):
    result = await db.equipment.update_one(
        {"id": equipment_id},
        {"$set": equipment_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    equipment = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_equipment",
        entity_type="equipment",
        entity_id=equipment_id,
        entity_name=equipment.get("name"),
        details=f"تعديل معدة: {equipment.get('name')}"
    )
    
    return equipment

@api_router.put("/operations/equipment/{equipment_id}/status")
async def update_equipment_status(equipment_id: str, status: str, current_user: dict = Depends(get_current_user)):
    result = await db.equipment.update_one(
        {"id": equipment_id},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    equipment = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    return equipment

# Maintenance Records
@api_router.post("/operations/maintenance", response_model=MaintenanceRecord)
async def create_maintenance_record(maintenance_data: MaintenanceRecordCreate, current_user: dict = Depends(get_current_user)):
    maintenance = MaintenanceRecord(**maintenance_data.model_dump())
    maintenance_dict = maintenance.model_dump()
    maintenance_dict["created_by"] = current_user["id"]
    
    await db.maintenance_records.insert_one(maintenance_dict)
    
    # Update equipment last maintenance date
    await db.equipment.update_one(
        {"id": maintenance_data.equipment_id},
        {"$set": {
            "last_maintenance_date": maintenance_data.maintenance_date,
            "next_maintenance_date": maintenance_data.next_maintenance_date
        }}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_maintenance_record",
        entity_type="maintenance_record",
        entity_id=maintenance.id,
        entity_name=maintenance_data.equipment_name,
        details=f"صيانة: {maintenance_data.equipment_name} - {maintenance_data.maintenance_type}"
    )
    
    return MaintenanceRecord(**maintenance_dict)

@api_router.get("/operations/maintenance")
async def get_maintenance_records(
    equipment_id: Optional[str] = None,
    maintenance_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if equipment_id:
        query["equipment_id"] = equipment_id
    if maintenance_type:
        query["maintenance_type"] = maintenance_type
    
    records = await db.maintenance_records.find(query, {"_id": 0}).sort("maintenance_date", -1).to_list(1000)
    return records

# Incident Reports
@api_router.post("/operations/incidents", response_model=IncidentReport)
async def create_incident_report(incident_data: IncidentReportCreate, current_user: dict = Depends(get_current_user)):
    count = await db.incident_reports.count_documents({})
    year = datetime.now().year
    incident_number = f"INC-{year}-{count + 1:04d}"
    
    incident = IncidentReport(**incident_data.model_dump())
    incident_dict = incident.model_dump()
    incident_dict["incident_number"] = incident_number
    
    await db.incident_reports.insert_one(incident_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_incident_report",
        entity_type="incident_report",
        entity_id=incident.id,
        entity_name=incident_data.title,
        details=f"تقرير حادث: {incident_data.title} - {incident_data.severity}"
    )
    
    return IncidentReport(**incident_dict)

@api_router.get("/operations/incidents")
async def get_incident_reports(
    incident_type: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    center_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if incident_type:
        query["incident_type"] = incident_type
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    if center_id:
        query["center_id"] = center_id
    
    incidents = await db.incident_reports.find(query, {"_id": 0}).sort("incident_date", -1).to_list(1000)
    return incidents

@api_router.put("/operations/incidents/{incident_id}/resolve")
async def resolve_incident(incident_id: str, resolution_notes: str, current_user: dict = Depends(get_current_user)):
    result = await db.incident_reports.update_one(
        {"id": incident_id},
        {"$set": {
            "status": "resolved",
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "resolution_notes": resolution_notes,
            "investigated_by": current_user["full_name"]
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    incident = await db.incident_reports.find_one({"id": incident_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="resolve_incident",
        entity_type="incident_report",
        entity_id=incident_id,
        entity_name=incident.get("title"),
        details=f"حل حادث: {incident.get('title')}"
    )
    
    return incident

# Vehicle Fleet
@api_router.post("/operations/vehicles", response_model=Vehicle)
async def create_vehicle(vehicle_data: VehicleCreate, current_user: dict = Depends(get_current_user)):
    count = await db.vehicles.count_documents({})
    vehicle_code = f"VEH-{count + 1:04d}"
    
    vehicle = Vehicle(**vehicle_data.model_dump())
    vehicle_dict = vehicle.model_dump()
    vehicle_dict["vehicle_code"] = vehicle_code
    
    await db.vehicles.insert_one(vehicle_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_vehicle",
        entity_type="vehicle",
        entity_id=vehicle.id,
        entity_name=f"{vehicle_data.brand} {vehicle_data.model}",
        details=f"مركبة جديدة: {vehicle_data.brand} {vehicle_data.model} - {vehicle_data.plate_number}"
    )
    
    return Vehicle(**vehicle_dict)

@api_router.get("/operations/vehicles")
async def get_vehicles(
    vehicle_type: Optional[str] = None,
    status: Optional[str] = None,
    center_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if vehicle_type:
        query["vehicle_type"] = vehicle_type
    if status:
        query["status"] = status
    if center_id:
        query["center_id"] = center_id
    
    vehicles = await db.vehicles.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return vehicles

@api_router.put("/operations/vehicles/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(vehicle_id: str, vehicle_data: VehicleCreate, current_user: dict = Depends(get_current_user)):
    result = await db.vehicles.update_one(
        {"id": vehicle_id},
        {"$set": vehicle_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_vehicle",
        entity_type="vehicle",
        entity_id=vehicle_id,
        entity_name=f"{vehicle.get('brand')} {vehicle.get('model')}",
        details=f"تعديل مركبة: {vehicle.get('plate_number')}"
    )
    
    return vehicle

# Operations Dashboard
@api_router.get("/operations/dashboard")
async def get_operations_dashboard(current_user: dict = Depends(get_current_user)):
    equipment_operational = await db.equipment.count_documents({"status": "operational"})
    equipment_maintenance = await db.equipment.count_documents({"status": "maintenance"})
    equipment_out_of_order = await db.equipment.count_documents({"status": "out_of_order"})
    
    vehicles_available = await db.vehicles.count_documents({"status": "available"})
    vehicles_in_use = await db.vehicles.count_documents({"status": "in_use"})
    
    open_incidents = await db.incident_reports.count_documents({"status": {"$in": ["reported", "investigating"]}})
    
    # Today's operations
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_operations = await db.daily_operations.find({"operation_date": today}, {"_id": 0}).to_list(10)
    
    return {
        "equipment": {
            "operational": equipment_operational,
            "maintenance": equipment_maintenance,
            "out_of_order": equipment_out_of_order
        },
        "vehicles": {
            "available": vehicles_available,
            "in_use": vehicles_in_use
        },
        "open_incidents": open_incidents,
        "today_operations": today_operations
    }

# ==================== MARKETING MODULE ROUTES (قسم التسويق) ====================

# Marketing Campaigns
@api_router.post("/marketing/campaigns", response_model=MarketingCampaign)
async def create_marketing_campaign(campaign_data: MarketingCampaignCreate, current_user: dict = Depends(get_current_user)):
    count = await db.marketing_campaigns.count_documents({})
    year = datetime.now().year
    campaign_code = f"CMP-{year}-{count + 1:04d}"
    
    campaign = MarketingCampaign(**campaign_data.model_dump())
    campaign_dict = campaign.model_dump()
    campaign_dict["campaign_code"] = campaign_code
    campaign_dict["created_by"] = current_user["id"]
    
    await db.marketing_campaigns.insert_one(campaign_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_campaign",
        entity_type="marketing_campaign",
        entity_id=campaign.id,
        entity_name=campaign_data.name,
        details=f"حملة تسويقية جديدة: {campaign_data.name}"
    )
    
    return MarketingCampaign(**campaign_dict)

@api_router.get("/marketing/campaigns")
async def get_marketing_campaigns(
    status: Optional[str] = None,
    campaign_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if campaign_type:
        query["campaign_type"] = campaign_type
    
    campaigns = await db.marketing_campaigns.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return campaigns

@api_router.put("/marketing/campaigns/{campaign_id}", response_model=MarketingCampaign)
async def update_marketing_campaign(campaign_id: str, campaign_data: MarketingCampaignCreate, current_user: dict = Depends(get_current_user)):
    result = await db.marketing_campaigns.update_one(
        {"id": campaign_id},
        {"$set": campaign_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign = await db.marketing_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return campaign

@api_router.put("/marketing/campaigns/{campaign_id}/status")
async def update_campaign_status(campaign_id: str, status: str, current_user: dict = Depends(get_current_user)):
    result = await db.marketing_campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign = await db.marketing_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return campaign

# Leads (العملاء المحتملين)
@api_router.post("/marketing/leads", response_model=Lead)
async def create_lead(lead_data: LeadCreate, current_user: dict = Depends(get_current_user)):
    count = await db.marketing_leads.count_documents({})
    lead_code = f"LEAD-{count + 1:05d}"
    
    lead = Lead(**lead_data.model_dump())
    lead_dict = lead.model_dump()
    lead_dict["lead_code"] = lead_code
    lead_dict["created_by"] = current_user["id"]
    
    await db.marketing_leads.insert_one(lead_dict)
    
    # Increment campaign leads if associated
    if lead_data.campaign_id:
        await db.marketing_campaigns.update_one(
            {"id": lead_data.campaign_id},
            {"$inc": {"leads_generated": 1}}
        )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_lead",
        entity_type="lead",
        entity_id=lead.id,
        entity_name=lead_data.name,
        details=f"عميل محتمل جديد: {lead_data.name}"
    )
    
    return Lead(**lead_dict)

@api_router.get("/marketing/leads")
async def get_leads(
    status: Optional[str] = None,
    lead_source: Optional[str] = None,
    assigned_to_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if lead_source:
        query["lead_source"] = lead_source
    if assigned_to_id:
        query["assigned_to_id"] = assigned_to_id
    
    leads = await db.marketing_leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return leads

@api_router.put("/marketing/leads/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, lead_data: LeadCreate, current_user: dict = Depends(get_current_user)):
    result = await db.marketing_leads.update_one(
        {"id": lead_id},
        {"$set": lead_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead = await db.marketing_leads.find_one({"id": lead_id}, {"_id": 0})
    return lead

@api_router.put("/marketing/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, status: str, notes: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    update_data = {"status": status, "last_contact_date": datetime.now(timezone.utc).isoformat()}
    
    if status == "won":
        update_data["conversion_date"] = datetime.now(timezone.utc).isoformat()
        # Update campaign conversions
        lead = await db.marketing_leads.find_one({"id": lead_id})
        if lead and lead.get("campaign_id"):
            await db.marketing_campaigns.update_one(
                {"id": lead["campaign_id"]},
                {"$inc": {"conversions": 1}}
            )
    elif status == "lost" and notes:
        update_data["lost_reason"] = notes
    
    result = await db.marketing_leads.update_one(
        {"id": lead_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead = await db.marketing_leads.find_one({"id": lead_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_lead_status",
        entity_type="lead",
        entity_id=lead_id,
        entity_name=lead.get("name"),
        details=f"تحديث حالة عميل محتمل: {lead.get('name')} - {status}"
    )
    
    return lead

# Social Media Posts
@api_router.post("/marketing/social-posts", response_model=SocialMediaPost)
async def create_social_post(post_data: SocialMediaPostCreate, current_user: dict = Depends(get_current_user)):
    post = SocialMediaPost(**post_data.model_dump())
    post_dict = post.model_dump()
    post_dict["created_by"] = current_user["id"]
    
    await db.social_media_posts.insert_one(post_dict)
    
    return SocialMediaPost(**post_dict)

@api_router.get("/marketing/social-posts")
async def get_social_posts(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if platform:
        query["platform"] = platform
    if status:
        query["status"] = status
    
    posts = await db.social_media_posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return posts

@api_router.put("/marketing/social-posts/{post_id}/publish")
async def publish_social_post(post_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.social_media_posts.update_one(
        {"id": post_id},
        {"$set": {
            "status": "published",
            "published_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post = await db.social_media_posts.find_one({"id": post_id}, {"_id": 0})
    return post

# Sales Offers
@api_router.post("/marketing/offers", response_model=SalesOffer)
async def create_sales_offer(offer_data: SalesOfferCreate, current_user: dict = Depends(get_current_user)):
    count = await db.sales_offers.count_documents({})
    offer_code = f"OFFER-{count + 1:04d}"
    
    offer = SalesOffer(**offer_data.model_dump())
    offer_dict = offer.model_dump()
    offer_dict["offer_code"] = offer_code
    offer_dict["created_by"] = current_user["id"]
    
    await db.sales_offers.insert_one(offer_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_offer",
        entity_type="sales_offer",
        entity_id=offer.id,
        entity_name=offer_data.title,
        details=f"عرض مبيعات جديد: {offer_data.title}"
    )
    
    return SalesOffer(**offer_dict)

@api_router.get("/marketing/offers")
async def get_sales_offers(
    status: Optional[str] = None,
    offer_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if offer_type:
        query["offer_type"] = offer_type
    
    offers = await db.sales_offers.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return offers

@api_router.put("/marketing/offers/{offer_id}/activate")
async def activate_offer(offer_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.sales_offers.update_one(
        {"id": offer_id},
        {"$set": {"status": "active"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    offer = await db.sales_offers.find_one({"id": offer_id}, {"_id": 0})
    return offer

# Market Returns (مرتجعات السوق)
@api_router.post("/marketing/returns", response_model=MarketReturn)
async def create_market_return(return_data: MarketReturnCreate, current_user: dict = Depends(get_current_user)):
    count = await db.market_returns.count_documents({})
    year = datetime.now().year
    return_code = f"RTN-{year}-{count + 1:04d}"
    
    market_return = MarketReturn(**return_data.model_dump())
    return_dict = market_return.model_dump()
    return_dict["return_code"] = return_code
    return_dict["created_by"] = current_user["id"]
    
    await db.market_returns.insert_one(return_dict)
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_market_return",
        entity_type="market_return",
        entity_id=market_return.id,
        entity_name=return_data.customer_name,
        details=f"مرتجع سوق: {return_data.quantity_liters} لتر من {return_data.customer_name}"
    )
    
    return MarketReturn(**return_dict)

@api_router.get("/marketing/returns")
async def get_market_returns(
    status: Optional[str] = None,
    center_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if center_id:
        query["center_id"] = center_id
    if start_date:
        query["return_date"] = {"$gte": start_date}
    if end_date:
        if "return_date" in query:
            query["return_date"]["$lte"] = end_date
        else:
            query["return_date"] = {"$lte": end_date}
    
    returns = await db.market_returns.find(query, {"_id": 0}).sort("return_date", -1).to_list(1000)
    return returns

@api_router.put("/marketing/returns/{return_id}/approve")
async def approve_market_return(return_id: str, disposal_method: str, current_user: dict = Depends(get_current_user)):
    result = await db.market_returns.update_one(
        {"id": return_id},
        {"$set": {
            "status": "approved",
            "disposal_method": disposal_method,
            "approved_by": current_user["full_name"],
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Return not found")
    
    market_return = await db.market_returns.find_one({"id": return_id}, {"_id": 0})
    return market_return

# Market Sales Summary
@api_router.post("/marketing/sales-summary", response_model=MarketSalesSummary)
async def create_market_sales_summary(summary_data: MarketSalesSummaryCreate, current_user: dict = Depends(get_current_user)):
    summary = MarketSalesSummary(**summary_data.model_dump())
    summary_dict = summary.model_dump()
    summary_dict["created_by"] = current_user["id"]
    
    # Calculate net values
    summary_dict["net_quantity"] = summary_data.total_quantity_sold - summary_data.total_returns
    summary_dict["net_revenue"] = summary_data.total_revenue - (summary_data.total_returns * 0.5)  # Adjust based on return policy
    
    await db.market_sales_summaries.insert_one(summary_dict)
    
    return MarketSalesSummary(**summary_dict)

@api_router.get("/marketing/sales-summary")
async def get_market_sales_summaries(
    center_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if center_id:
        query["center_id"] = center_id
    if start_date:
        query["report_date"] = {"$gte": start_date}
    if end_date:
        if "report_date" in query:
            query["report_date"]["$lte"] = end_date
        else:
            query["report_date"] = {"$lte": end_date}
    
    summaries = await db.market_sales_summaries.find(query, {"_id": 0}).sort("report_date", -1).to_list(1000)
    return summaries

# Marketing Dashboard
@api_router.get("/marketing/dashboard")
async def get_marketing_dashboard(current_user: dict = Depends(get_current_user)):
    # Campaigns stats
    active_campaigns = await db.marketing_campaigns.count_documents({"status": "active"})
    total_campaigns = await db.marketing_campaigns.count_documents({})
    
    # Leads stats
    total_leads = await db.marketing_leads.count_documents({})
    new_leads = await db.marketing_leads.count_documents({"status": "new"})
    qualified_leads = await db.marketing_leads.count_documents({"status": "qualified"})
    converted_leads = await db.marketing_leads.count_documents({"status": "won"})
    
    # Calculate conversion rate
    conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
    
    # Active offers
    active_offers = await db.sales_offers.count_documents({"status": "active"})
    
    # Returns stats - this month
    this_month_start = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    monthly_returns = await db.market_returns.find(
        {"return_date": {"$gte": this_month_start}},
        {"_id": 0, "quantity_liters": 1, "refund_amount": 1}
    ).to_list(1000)
    
    total_return_quantity = sum(r.get("quantity_liters", 0) for r in monthly_returns)
    total_refund_amount = sum(r.get("refund_amount", 0) or 0 for r in monthly_returns)
    
    # Campaign budget vs actual
    campaigns = await db.marketing_campaigns.find({}, {"_id": 0, "budget": 1, "actual_cost": 1}).to_list(1000)
    total_budget = sum(c.get("budget", 0) for c in campaigns)
    total_actual_cost = sum(c.get("actual_cost", 0) for c in campaigns)
    
    return {
        "campaigns": {
            "total": total_campaigns,
            "active": active_campaigns,
            "total_budget": total_budget,
            "actual_cost": total_actual_cost
        },
        "leads": {
            "total": total_leads,
            "new": new_leads,
            "qualified": qualified_leads,
            "converted": converted_leads,
            "conversion_rate": round(conversion_rate, 2)
        },
        "offers": {
            "active": active_offers
        },
        "returns": {
            "monthly_quantity": total_return_quantity,
            "monthly_refund": total_refund_amount
        }
    }

# ==================== CENTRAL DASHBOARD (لوحة التحكم المركزية) ====================

@api_router.get("/dashboard/central")
async def get_central_dashboard(current_user: dict = Depends(get_current_user)):
    """Central dashboard showing data from all centers"""
    
    # Get all centers
    centers = await db.collection_centers.find({"is_active": True}, {"_id": 0}).to_list(100)
    
    # Today's date
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    this_month_start = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    
    center_stats = []
    total_milk_today = 0
    total_milk_month = 0
    total_sales_today = 0
    total_suppliers = 0
    
    for center in centers:
        center_id = center["id"]
        
        # Today's milk reception for this center
        today_milk = await db.milk_receptions.find(
            {"center_id": center_id, "reception_date": {"$regex": f"^{today}"}},
            {"_id": 0, "quantity_liters": 1, "total_amount": 1}
        ).to_list(1000)
        
        center_milk_today = sum(m.get("quantity_liters", 0) for m in today_milk)
        center_amount_today = sum(m.get("total_amount", 0) for m in today_milk)
        
        # Monthly milk for this center
        monthly_milk = await db.milk_receptions.find(
            {"center_id": center_id, "reception_date": {"$gte": this_month_start}},
            {"_id": 0, "quantity_liters": 1}
        ).to_list(10000)
        
        center_milk_month = sum(m.get("quantity_liters", 0) for m in monthly_milk)
        
        # Suppliers count for this center
        center_suppliers = await db.suppliers.count_documents({"center_id": center_id, "is_active": True})
        
        center_stats.append({
            "center_id": center_id,
            "center_name": center["name"],
            "center_code": center.get("code", ""),
            "today_milk_liters": center_milk_today,
            "today_amount": center_amount_today,
            "monthly_milk_liters": center_milk_month,
            "suppliers_count": center_suppliers
        })
        
        total_milk_today += center_milk_today
        total_milk_month += center_milk_month
        total_suppliers += center_suppliers
    
    # Total sales today
    today_sales = await db.sales.find(
        {"sale_date": {"$regex": f"^{today}"}},
        {"_id": 0, "total_amount": 1, "quantity_liters": 1}
    ).to_list(1000)
    
    total_sales_amount = sum(s.get("total_amount", 0) for s in today_sales)
    total_sales_liters = sum(s.get("quantity_liters", 0) for s in today_sales)
    
    # Inventory status
    inventory = await db.inventory.find_one({"product_type": "raw_milk"}, {"_id": 0})
    current_stock = inventory.get("quantity_liters", 0) if inventory else 0
    
    # HR stats
    total_employees = await db.hr_employees.count_documents({"is_active": True})
    present_today = await db.hr_attendance.count_documents({"date": today, "check_in": {"$ne": None}})
    
    # Pending approvals
    pending_leaves = await db.hr_leave_requests.count_documents({"status": "pending"})
    pending_expenses = await db.hr_expense_requests.count_documents({"status": "pending"})
    
    # Financial summary
    monthly_payments = await db.payments.find(
        {"payment_date": {"$gte": this_month_start}},
        {"_id": 0, "amount": 1, "payment_type": 1}
    ).to_list(10000)
    
    supplier_payments = sum(p.get("amount", 0) for p in monthly_payments if p.get("payment_type") == "supplier_payment")
    customer_receipts = sum(p.get("amount", 0) for p in monthly_payments if p.get("payment_type") == "customer_receipt")
    
    return {
        "summary": {
            "total_centers": len(centers),
            "total_suppliers": total_suppliers,
            "total_employees": total_employees,
            "present_today": present_today
        },
        "milk": {
            "today_liters": total_milk_today,
            "monthly_liters": total_milk_month,
            "current_stock": current_stock
        },
        "sales": {
            "today_liters": total_sales_liters,
            "today_amount": total_sales_amount
        },
        "financial": {
            "monthly_supplier_payments": supplier_payments,
            "monthly_customer_receipts": customer_receipts
        },
        "pending_approvals": {
            "leaves": pending_leaves,
            "expenses": pending_expenses
        },
        "centers": center_stats
    }

# ==================== ATTENDANCE IMPORT FROM EXCEL ====================

@api_router.post("/hr/attendance/import")
async def import_attendance_from_excel(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Import attendance records from Excel file"""
    import openpyxl
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported")
    
    try:
        contents = await file.read()
        wb = openpyxl.load_workbook(io.BytesIO(contents))
        ws = wb.active
        
        imported_count = 0
        errors = []
        
        # Expected columns: employee_code, date, check_in, check_out
        headers = [cell.value for cell in ws[1]]
        
        for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            if not any(row):  # Skip empty rows
                continue
            
            try:
                employee_code = str(row[0]) if row[0] else None
                date = str(row[1]) if row[1] else None
                check_in = str(row[2]) if row[2] else None
                check_out = str(row[3]) if row[3] else None
                
                if not employee_code or not date:
                    errors.append(f"Row {row_num}: Missing employee code or date")
                    continue
                
                # Find employee
                employee = await db.hr_employees.find_one(
                    {"$or": [{"employee_code": employee_code}, {"id": employee_code}]},
                    {"_id": 0}
                )
                
                if not employee:
                    errors.append(f"Row {row_num}: Employee {employee_code} not found")
                    continue
                
                # Check if attendance already exists
                existing = await db.hr_attendance.find_one({
                    "employee_id": employee["id"],
                    "date": date
                })
                
                if existing:
                    # Update existing record
                    update_data = {}
                    if check_in:
                        update_data["check_in"] = check_in
                    if check_out:
                        update_data["check_out"] = check_out
                    update_data["source"] = "excel_import"
                    
                    await db.hr_attendance.update_one(
                        {"id": existing["id"]},
                        {"$set": update_data}
                    )
                else:
                    # Create new record
                    attendance = {
                        "id": str(uuid.uuid4()),
                        "employee_id": employee["id"],
                        "employee_name": employee["name"],
                        "date": date,
                        "check_in": check_in,
                        "check_out": check_out,
                        "source": "excel_import",
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.hr_attendance.insert_one(attendance)
                
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        await log_activity(
            user_id=current_user["id"],
            user_name=current_user["full_name"],
            action="import_attendance",
            details=f"استيراد {imported_count} سجل حضور من Excel"
        )
        
        return {
            "success": True,
            "imported_count": imported_count,
            "errors": errors[:10] if errors else [],  # Return first 10 errors
            "total_errors": len(errors)
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

# ==================== PAYROLL ROUTES (الرواتب) ====================

@api_router.post("/hr/payroll/periods")
async def create_payroll_period(
    name: str = Form(...),
    start_date: str = Form(...),
    end_date: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Create a new payroll period (e.g., 16 Nov - 15 Dec)"""
    # Calculate total days
    from datetime import datetime as dt
    start = dt.strptime(start_date, "%Y-%m-%d")
    end = dt.strptime(end_date, "%Y-%m-%d")
    total_days = (end - start).days + 1
    
    period = PayrollPeriod(
        name=name,
        start_date=start_date,
        end_date=end_date,
        total_days=total_days
    )
    
    await db.payroll_periods.insert_one(period.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_payroll_period",
        entity_type="payroll",
        entity_id=period.id,
        entity_name=name,
        details=f"إنشاء فترة رواتب: {name}"
    )
    
    return period.model_dump()

@api_router.get("/hr/payroll/periods")
async def get_payroll_periods(current_user: dict = Depends(get_current_user)):
    """Get all payroll periods"""
    periods = await db.payroll_periods.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return periods

@api_router.get("/hr/payroll/periods/{period_id}")
async def get_payroll_period(period_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific payroll period with its records"""
    period = await db.payroll_periods.find_one({"id": period_id}, {"_id": 0})
    if not period:
        raise HTTPException(status_code=404, detail="Payroll period not found")
    
    records = await db.payroll_records.find({"period_id": period_id}, {"_id": 0}).to_list(1000)
    
    return {
        "period": period,
        "records": records,
        "summary": {
            "total_employees": len(records),
            "total_gross": sum(r.get("gross_salary", 0) for r in records),
            "total_deductions": sum(r.get("deductions", 0) for r in records),
            "total_net": sum(r.get("net_salary", 0) for r in records)
        }
    }

@api_router.post("/hr/payroll/periods/{period_id}/calculate")
async def calculate_payroll(period_id: str, current_user: dict = Depends(get_current_user)):
    """Calculate payroll for all employees based on attendance"""
    period = await db.payroll_periods.find_one({"id": period_id}, {"_id": 0})
    if not period:
        raise HTTPException(status_code=404, detail="Payroll period not found")
    
    # Get all active employees
    employees = await db.hr_employees.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    # Get attendance records for the period
    start_date = period["start_date"]
    end_date = period["end_date"]
    
    attendance_records = await db.hr_attendance.find({
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(10000)
    
    # Delete existing payroll records for this period
    await db.payroll_records.delete_many({"period_id": period_id})
    
    payroll_records = []
    
    for emp in employees:
        # Filter attendance for this employee
        emp_attendance = [a for a in attendance_records if a.get("employee_id") == emp.get("id") or a.get("employee_name") == emp.get("name")]
        
        # Count attendance types
        working_days = len([a for a in emp_attendance if a.get("status") == "present"])
        day_off = len([a for a in emp_attendance if a.get("status") in ["off", "weekend"]])
        sick_leave = len([a for a in emp_attendance if a.get("status") == "sick_leave"])
        annual_leave = len([a for a in emp_attendance if a.get("status") == "annual_leave"])
        public_holiday = len([a for a in emp_attendance if a.get("status") == "public_holiday"])
        emergency_leave = len([a for a in emp_attendance if a.get("status") == "emergency_leave"])
        on_duty = len([a for a in emp_attendance if a.get("status") == "on_duty"])
        absent_days = len([a for a in emp_attendance if a.get("status") == "absent"])
        unpaid_leave = len([a for a in emp_attendance if a.get("status") == "unpaid_leave"])
        
        # Calculate salary
        basic_salary = emp.get("salary", 0)
        daily_rate = basic_salary / 30 if basic_salary > 0 else 0
        
        # Total pay days = working + paid leaves
        total_pay_days = working_days + day_off + sick_leave + annual_leave + public_holiday + emergency_leave + on_duty
        
        # Gross salary
        gross_salary = daily_rate * total_pay_days
        
        # Deductions for unpaid leave and absences
        deductions = daily_rate * (absent_days + unpaid_leave)
        
        # Net salary
        net_salary = gross_salary - deductions
        
        record = PayrollRecord(
            period_id=period_id,
            employee_id=emp.get("id"),
            employee_name=emp.get("name"),
            employee_code=emp.get("employee_code"),
            department=emp.get("department"),
            position=emp.get("position"),
            working_days=working_days,
            day_off=day_off,
            sick_leave=sick_leave,
            annual_leave=annual_leave,
            public_holiday=public_holiday,
            emergency_leave=emergency_leave,
            on_duty=on_duty,
            absent_days=absent_days,
            unpaid_leave=unpaid_leave,
            basic_salary=basic_salary,
            daily_rate=round(daily_rate, 3),
            total_pay_days=total_pay_days,
            gross_salary=round(gross_salary, 3),
            deductions=round(deductions, 3),
            net_salary=round(net_salary, 3)
        )
        
        await db.payroll_records.insert_one(record.model_dump())
        payroll_records.append(record.model_dump())
    
    # Update period status
    await db.payroll_periods.update_one(
        {"id": period_id},
        {"$set": {
            "status": "calculated",
            "calculated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="calculate_payroll",
        entity_type="payroll",
        entity_id=period_id,
        entity_name=period["name"],
        details=f"حساب رواتب {len(payroll_records)} موظف"
    )
    
    return {
        "message": f"تم حساب رواتب {len(payroll_records)} موظف",
        "period_id": period_id,
        "records_count": len(payroll_records)
    }

@api_router.get("/hr/payroll/records")
async def get_payroll_records(
    period_id: Optional[str] = None,
    employee_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get payroll records with optional filters"""
    query = {}
    if period_id:
        query["period_id"] = period_id
    if employee_id:
        query["employee_id"] = employee_id
    
    records = await db.payroll_records.find(query, {"_id": 0}).to_list(1000)
    return records

@api_router.put("/hr/payroll/records/{record_id}")
async def update_payroll_record(
    record_id: str,
    deductions: Optional[float] = Form(None),
    overtime_pay: Optional[float] = Form(None),
    allowances: Optional[float] = Form(None),
    notes: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Update a payroll record with manual adjustments"""
    record = await db.payroll_records.find_one({"id": record_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    
    update_data = {}
    if deductions is not None:
        update_data["deductions"] = deductions
    if overtime_pay is not None:
        update_data["overtime_pay"] = overtime_pay
    if allowances is not None:
        update_data["allowances"] = allowances
    if notes is not None:
        update_data["notes"] = notes
    
    if update_data:
        # Recalculate net salary
        gross = record.get("gross_salary", 0)
        ded = update_data.get("deductions", record.get("deductions", 0))
        ot = update_data.get("overtime_pay", record.get("overtime_pay", 0))
        allow = update_data.get("allowances", record.get("allowances", 0))
        update_data["net_salary"] = round(gross - ded + ot + allow, 3)
        
        await db.payroll_records.update_one(
            {"id": record_id},
            {"$set": update_data}
        )
    
    updated_record = await db.payroll_records.find_one({"id": record_id}, {"_id": 0})
    return updated_record

@api_router.post("/hr/payroll/periods/{period_id}/approve")
async def approve_payroll(period_id: str, current_user: dict = Depends(get_current_user)):
    """Approve a payroll period"""
    period = await db.payroll_periods.find_one({"id": period_id}, {"_id": 0})
    if not period:
        raise HTTPException(status_code=404, detail="Payroll period not found")
    
    await db.payroll_periods.update_one(
        {"id": period_id},
        {"$set": {
            "status": "approved",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": current_user["full_name"]
        }}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="approve_payroll",
        entity_type="payroll",
        entity_id=period_id,
        entity_name=period["name"],
        details=f"اعتماد كشف رواتب: {period['name']}"
    )
    
    return {"message": "تم اعتماد كشف الرواتب بنجاح"}

@api_router.delete("/hr/payroll/periods/{period_id}")
async def delete_payroll_period(period_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a payroll period and its records"""
    period = await db.payroll_periods.find_one({"id": period_id}, {"_id": 0})
    if not period:
        raise HTTPException(status_code=404, detail="Payroll period not found")
    
    if period.get("status") == "approved":
        raise HTTPException(status_code=400, detail="لا يمكن حذف كشف رواتب معتمد")
    
    await db.payroll_records.delete_many({"period_id": period_id})
    await db.payroll_periods.delete_one({"id": period_id})
    
    return {"message": "تم حذف فترة الرواتب بنجاح"}

# ==================== AI ANALYSIS (التحليل الذكي) ====================

class AnalysisRequest(BaseModel):
    question: str
    category: Optional[str] = "general"  # general, hr, attendance, sales, milk

# Initialize Gemini chat with Emergent key
def get_llm_chat(session_id: str = "analysis"):
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
    
    system_message = """أنت مساعد تحليل بيانات ذكي لنظام ERP لمركز تجميع الحليب "المروج للألبان".
    
مهمتك هي تحليل البيانات والإجابة على أسئلة المستخدم بشكل واضح ومفيد.

البيانات المتاحة:
- بيانات الموظفين والحضور والانصراف
- بيانات المبيعات والعملاء
- بيانات استلام الحليب من الموردين
- بيانات الرواتب والمدفوعات

قواعد مهمة:
1. أجب باللغة العربية إذا كان السؤال بالعربية
2. قدم إحصائيات وأرقام محددة عند توفرها
3. اقترح تحسينات إذا كانت مناسبة
4. كن موجزاً ومفيداً
5. استخدم التنسيق المناسب (قوائم، جداول) لتوضيح البيانات"""

    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=system_message
    ).with_model("gemini", "gemini-2.5-flash")
    
    return chat

@api_router.post("/analysis/query")
async def analyze_query(request: AnalysisRequest, current_user: dict = Depends(get_current_user)):
    """Analyze natural language query and return data insights using Gemini 2.5 Flash"""
    
    try:
        # Get data context based on category
        context_data = {}
        
        # Fetch relevant data for context
        if request.category in ["general", "hr", "attendance"]:
            # Get attendance summary
            attendance = await db.hr_attendance.find({}).to_list(1000)
            employees = await db.hr_employees.find({"is_active": True}, {"_id": 0}).to_list(1000)
            
            present_count = len([a for a in attendance if a.get("status") == "present"])
            absent_count = len([a for a in attendance if a.get("status") == "absent"])
            leave_count = len([a for a in attendance if a.get("status") == "leave"])
            
            context_data["attendance"] = {
                "total_employees": len(employees),
                "present_days_total": present_count,
                "absent_days_total": absent_count,
                "leave_days_total": leave_count,
                "departments": list(set([e.get("department", "unknown") for e in employees]))
            }
        
        if request.category in ["general", "sales"]:
            # Get sales summary
            sales = await db.sales.find({}, {"_id": 0}).to_list(1000)
            customers = await db.customers.find({"is_active": True}, {"_id": 0}).to_list(1000)
            context_data["sales"] = {
                "total_sales": len(sales),
                "total_amount": sum([s.get("total_amount", 0) for s in sales]),
                "total_customers": len(customers),
            }
        
        if request.category in ["general", "milk"]:
            # Get milk reception summary
            receptions = await db.milk_receptions.find({}, {"_id": 0}).to_list(1000)
            suppliers = await db.suppliers.find({"is_active": True}, {"_id": 0}).to_list(1000)
            context_data["milk"] = {
                "total_receptions": len(receptions),
                "total_quantity_liters": sum([r.get("quantity", 0) for r in receptions]),
                "total_amount": sum([r.get("total_amount", 0) for r in receptions]),
                "total_suppliers": len(suppliers),
            }
        
        if request.category in ["general", "hr"]:
            # Get payroll summary
            payroll_records = await db.payroll_records.find({}, {"_id": 0}).to_list(1000)
            context_data["payroll"] = {
                "total_records": len(payroll_records),
                "total_gross": sum([p.get("gross_salary", 0) for p in payroll_records]),
                "total_net": sum([p.get("net_salary", 0) for p in payroll_records]),
            }
        
        # Create user message with context
        user_prompt = f"""السؤال: {request.question}

البيانات الحالية من النظام:
{context_data}

قدم إجابة تحليلية مفصلة بناءً على البيانات المتاحة."""

        # Call Gemini API using emergentintegrations
        chat = get_llm_chat(session_id=f"analysis_{current_user['id']}")
        user_message = UserMessage(text=user_prompt)
        answer = await chat.send_message(user_message)
        
        # Log the analysis
        await log_activity(
            user_id=current_user["id"],
            user_name=current_user["full_name"],
            action="ai_analysis",
            details=f"سؤال: {request.question[:100]}..."
        )
        
        return {
            "question": request.question,
            "answer": answer,
            "category": request.category,
            "data_summary": context_data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logging.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"خطأ في التحليل: {str(e)}")

@api_router.get("/analysis/summary")
async def get_analysis_summary(current_user: dict = Depends(get_current_user)):
    """Get quick summary statistics for analysis dashboard"""
    
    # Attendance stats
    employees = await db.hr_employees.find({"is_active": True}, {"_id": 0}).to_list(1000)
    attendance = await db.hr_attendance.find({}).to_list(5000)
    
    present_count = len([a for a in attendance if a.get("status") == "present"])
    absent_count = len([a for a in attendance if a.get("status") == "absent"])
    
    # Sales stats
    sales = await db.sales.find({}, {"_id": 0}).to_list(1000)
    total_sales_amount = sum([s.get("total_amount", 0) for s in sales])
    
    # Milk reception stats
    receptions = await db.milk_receptions.find({}, {"_id": 0}).to_list(1000)
    total_milk = sum([r.get("quantity", 0) for r in receptions])
    
    # Supplier stats
    suppliers = await db.suppliers.find({"is_active": True}, {"_id": 0}).to_list(500)
    
    # Department breakdown
    departments = {}
    for emp in employees:
        dept = emp.get("department", "unknown")
        departments[dept] = departments.get(dept, 0) + 1
    
    return {
        "employees": {
            "total": len(employees),
            "by_department": departments
        },
        "attendance": {
            "present_total": present_count,
            "absent_total": absent_count,
            "attendance_rate": round(present_count / (present_count + absent_count) * 100, 2) if (present_count + absent_count) > 0 else 0
        },
        "sales": {
            "total_transactions": len(sales),
            "total_amount": total_sales_amount
        },
        "milk": {
            "total_receptions": len(receptions),
            "total_quantity": total_milk
        },
        "suppliers": {
            "total_active": len(suppliers)
        }
    }

# ==================== USER SETTINGS / APPEARANCE ====================

# System background images
SYSTEM_BACKGROUNDS = [
    {"id": "bg1", "url": "https://customer-assets.emergentagent.com/job_agrodairy/artifacts/368sq9v2_12.jpg", "name": "خلفية 1"},
    {"id": "bg2", "url": "https://customer-assets.emergentagent.com/job_agrodairy/artifacts/41nbrw0w_2.jpg", "name": "خلفية 2"},
    {"id": "bg3", "url": "https://customer-assets.emergentagent.com/job_agrodairy/artifacts/ftlid6jo_4.jpg", "name": "خلفية 3"},
    {"id": "bg4", "url": "https://customer-assets.emergentagent.com/job_agrodairy/artifacts/o1tpk5s2_6.jpg", "name": "خلفية 4"},
    {"id": "bg5", "url": "https://customer-assets.emergentagent.com/job_agrodairy/artifacts/roy1cp0e_10.jpg", "name": "خلفية 5"},
]

class UserAppearanceSettings(BaseModel):
    background_id: Optional[str] = "bg1"
    background_url: Optional[str] = None
    theme: str = "light"  # light, dark
    sidebar_collapsed: bool = False

@api_router.get("/user/settings")
async def get_user_settings(current_user: dict = Depends(get_current_user)):
    """Get user appearance settings"""
    settings = await db.user_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not settings:
        # Return default settings
        default_bg = SYSTEM_BACKGROUNDS[0]
        return {
            "user_id": current_user["id"],
            "background_id": "bg1",
            "background_url": default_bg["url"],
            "theme": "light",
            "sidebar_collapsed": False
        }
    return settings

@api_router.put("/user/settings")
async def update_user_settings(settings: UserAppearanceSettings, current_user: dict = Depends(get_current_user)):
    """Update user appearance settings"""
    
    # Get background URL from ID
    background_url = settings.background_url
    if settings.background_id:
        for bg in SYSTEM_BACKGROUNDS:
            if bg["id"] == settings.background_id:
                background_url = bg["url"]
                break
    
    settings_data = {
        "user_id": current_user["id"],
        "background_id": settings.background_id,
        "background_url": background_url,
        "theme": settings.theme,
        "sidebar_collapsed": settings.sidebar_collapsed,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": settings_data},
        upsert=True
    )
    
    return settings_data

@api_router.get("/system/backgrounds")
async def get_system_backgrounds(current_user: dict = Depends(get_current_user)):
    """Get available system background images"""
    return SYSTEM_BACKGROUNDS

@api_router.get("/")
async def root():
    return {"message": "Milk Collection Center ERP API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
