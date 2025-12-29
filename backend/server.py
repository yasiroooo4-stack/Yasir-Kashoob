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

# ==================== MODELS ====================

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    username: str
    email: str
    full_name: str
    role: str = "employee"  # admin, employee, accountant

class UserCreate(UserBase):
    password: str

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

# Employee Models
class EmployeeBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    phone: str
    position: str
    department: str
    salary: float
    hire_date: str

class EmployeeCreate(EmployeeBase):
    pass

class Employee(EmployeeBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
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
    return Token(
        access_token=token,
        token_type="bearer",
        user={"id": user["id"], "username": user["username"], "email": user["email"], "full_name": user["full_name"], "role": user["role"]}
    )

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# ==================== SUPPLIER ROUTES ====================

@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(supplier_data: SupplierCreate, current_user: dict = Depends(get_current_user)):
    supplier = Supplier(**supplier_data.model_dump())
    await db.suppliers.insert_one(supplier.model_dump())
    return supplier

@api_router.get("/suppliers", response_model=List[Supplier])
async def get_suppliers(current_user: dict = Depends(get_current_user)):
    suppliers = await db.suppliers.find({"is_active": True}, {"_id": 0}).to_list(1000)
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
