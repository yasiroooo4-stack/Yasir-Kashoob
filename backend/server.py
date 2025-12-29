from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
    letter_type: str  # salary_certificate, employment_letter, experience_letter, mission_letter, no_objection
    purpose: Optional[str] = None
    recipient: Optional[str] = None
    content: Optional[str] = None

class OfficialLetterCreate(OfficialLetterBase):
    pass

class OfficialLetter(OfficialLetterBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    letter_number: Optional[str] = None
    status: str = "pending"  # pending, issued, delivered
    issued_by: Optional[str] = None
    issued_at: Optional[str] = None
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
    feed_type_id: str
    feed_type_name: str
    company_name: str
    quantity: float
    price_per_unit: float
    unit: str = "kg"

class FeedPurchaseCreate(FeedPurchaseBase):
    pass

class FeedPurchase(FeedPurchaseBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    purchase_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    total_amount: float = 0.0
    created_by: Optional[str] = None

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
    if not user or not verify_password(credentials.password, user["password"]):
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
        user={"id": user["id"], "username": user["username"], "email": user["email"], "full_name": user["full_name"], "role": user["role"], "phone": user.get("phone"), "avatar_url": user.get("avatar_url")}
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
    if not verify_password(password_data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hash = hash_password(password_data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password": new_hash}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="password_change",
        details="تغيير كلمة المرور"
    )
    
    return {"message": "Password changed successfully"}

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
    return center

@api_router.delete("/centers/{center_id}")
async def delete_center(center_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.collection_centers.update_one(
        {"id": center_id},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Center not found")
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
    return supplier

@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.suppliers.update_one(
        {"id": supplier_id},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
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
    return customer

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.customers.update_one(
        {"id": customer_id},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
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
    return inventory

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate, current_user: dict = Depends(require_role(["admin", "accountant"]))):
    payment = Payment(**payment_data.model_dump())
    payment.created_by = current_user["id"]
    
    await db.payments.insert_one(payment.model_dump())
    
    # Update balances
    if payment.payment_type == "supplier_payment":
        await db.suppliers.update_one(
            {"id": payment.related_id},
            {"$inc": {"balance": -payment.amount}}
        )
    elif payment.payment_type == "customer_receipt":
        await db.customers.update_one(
            {"id": payment.related_id},
            {"$inc": {"balance": -payment.amount}}
        )
    
    return payment

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(
    payment_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if payment_type:
        query["payment_type"] = payment_type
    if start_date:
        query["payment_date"] = {"$gte": start_date}
    if end_date:
        if "payment_date" in query:
            query["payment_date"]["$lte"] = end_date
        else:
            query["payment_date"] = {"$lte": end_date}
    
    payments = await db.payments.find(query, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    return payments

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
    result = await db.employees.update_one(
        {"id": employee_id},
        {"$set": employee_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
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
    
    purchase = FeedPurchase(**purchase_data.model_dump())
    purchase.total_amount = total_amount
    purchase.created_by = current_user["id"]
    
    await db.feed_purchases.insert_one(purchase.model_dump())
    
    # Deduct from supplier balance
    await db.suppliers.update_one(
        {"id": purchase.supplier_id},
        {"$inc": {"balance": -total_amount}}
    )
    
    return purchase

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
    
    # Refund supplier balance
    await db.suppliers.update_one(
        {"id": existing["supplier_id"]},
        {"$inc": {"balance": existing.get("total_amount", 0)}}
    )
    
    # Delete purchase
    await db.feed_purchases.delete_one({"id": purchase_id})
    
    return {"message": "Feed purchase deleted and amount refunded to supplier"}

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
    result = await db.hr_employees.update_one(
        {"id": employee_id},
        {"$set": employee_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    employee = await db.hr_employees.find_one({"id": employee_id}, {"_id": 0})
    return employee

@api_router.delete("/hr/employees/{employee_id}")
async def delete_hr_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.hr_employees.update_one(
        {"id": employee_id},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
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
    return request

# ==================== HR - EXPENSE REQUESTS (طلبات المصاريف) ====================

@api_router.post("/hr/expense-requests", response_model=ExpenseRequest)
async def create_expense_request(request_data: ExpenseRequestCreate, current_user: dict = Depends(get_current_user)):
    expense_request = ExpenseRequest(**request_data.model_dump())
    await db.hr_expense_requests.insert_one(expense_request.model_dump())
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
    return request

# ==================== HR - CAR CONTRACTS (عقود السيارات) ====================

@api_router.post("/hr/car-contracts", response_model=CarContract)
async def create_car_contract(contract_data: CarContractCreate, current_user: dict = Depends(get_current_user)):
    contract = CarContract(**contract_data.model_dump())
    await db.hr_car_contracts.insert_one(contract.model_dump())
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
    result = await db.hr_car_contracts.update_one(
        {"id": contract_id},
        {"$set": {"status": "cancelled"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Car contract not found")
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
    return letter

# ==================== HR - FINGERPRINT DEVICES (أجهزة البصمة) ====================

@api_router.post("/hr/fingerprint-devices", response_model=FingerprintDevice)
async def create_fingerprint_device(device_data: FingerprintDeviceCreate, current_user: dict = Depends(require_role(["admin"]))):
    device = FingerprintDevice(**device_data.model_dump())
    await db.hr_fingerprint_devices.insert_one(device.model_dump())
    return device

@api_router.get("/hr/fingerprint-devices")
async def get_fingerprint_devices(current_user: dict = Depends(get_current_user)):
    devices = await db.hr_fingerprint_devices.find({"is_active": True}, {"_id": 0}).to_list(100)
    return devices

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
        
        async with aiohttp.ClientSession() as session:
            # Login to device
            login_data = {
                "id": device.get("login_id"),
                "password": device.get("password")
            }
            
            async with session.post(device_url, data=login_data) as response:
                if response.status != 200:
                    raise HTTPException(status_code=500, detail="Failed to connect to fingerprint device")
                
                # Get attendance records
                # Note: Actual implementation depends on Hikvision API
                attendance_url = f"http://{device['ip_address']}/csl/attendance"
                async with session.get(attendance_url) as att_response:
                    if att_response.status == 200:
                        # Process attendance data
                        # This is a simplified example - actual implementation needs Hikvision SDK
                        pass
        
        # Update last sync time
        await db.hr_fingerprint_devices.update_one(
            {"id": device_id},
            {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"message": "Sync initiated successfully", "device": device["name"]}
    
    except Exception as e:
        logging.error(f"Fingerprint sync error: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

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
]

PERMISSIONS = {
    "admin": ["all"],
    "it": ["all"],
    "hr": ["hr", "employees", "attendance", "leave", "expense", "car_contracts", "letters"],
    "finance": ["finance", "payments", "reports", "expense"],
    "purchasing": ["suppliers", "feed_purchases", "inventory"],
    "milk_reception": ["milk_reception", "suppliers", "quality"],
    "sales": ["sales", "customers", "inventory"],
    "inventory": ["inventory", "reports"]
}

@api_router.get("/hr/departments")
async def get_departments():
    return DEPARTMENTS

@api_router.get("/hr/permissions/{department}")
async def get_department_permissions(department: str):
    return {"department": department, "permissions": PERMISSIONS.get(department, [])}

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

# ==================== ROOT ROUTE ====================

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
