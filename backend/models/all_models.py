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


# ==================== WAREHOUSE MANAGEMENT MODELS ====================

# المخازن
class WarehouseBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str                           # اسم المخزن
    code: str                           # رمز المخزن
    location: str                       # الموقع
    warehouse_type: str = "main"        # نوع المخزن: main, branch, cold, internal, external
    warehouse_category: Optional[str] = None  # تصنيف المخزن: lab, maintenance, cleaning, ppe, feed, equipment
    center_id: Optional[str] = None     # معرف المركز
    center_name: Optional[str] = None   # اسم المركز (زيك، حجيف، غدو، طاقة، ثمريت، مرباط)
    parent_warehouse_id: Optional[str] = None  # المخزن الأب (للمخازن الفرعية)
    parent_warehouse_name: Optional[str] = None
    capacity: Optional[float] = None    # السعة
    temperature_controlled: bool = False # تحكم بالحرارة
    required_temperature: Optional[str] = None  # درجة الحرارة المطلوبة
    manager_id: Optional[str] = None    # مدير المخزن
    manager_name: Optional[str] = None
    supervisor_id: Optional[str] = None # مشرف المركز (للتنبيهات)
    supervisor_name: Optional[str] = None
    supervisor_email: Optional[str] = None
    supervisor_phone: Optional[str] = None
    warehouse_manager_id: Optional[str] = None  # مسؤول إدارة المخازن (للتنبيهات)
    warehouse_manager_name: Optional[str] = None
    warehouse_manager_email: Optional[str] = None
    warehouse_manager_phone: Optional[str] = None
    status: str = "active"              # حالة المخزن
    notes: Optional[str] = None
    # إعدادات التنبيهات
    alert_on_low_stock: bool = True     # تنبيه عند نقص المخزون
    alert_on_expiry: bool = True        # تنبيه عند قرب انتهاء الصلاحية
    expiry_alert_days: int = 30         # أيام قبل انتهاء الصلاحية للتنبيه

class Warehouse(WarehouseBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None


# نموذج تنبيهات المخزون
class StockAlertBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    alert_type: str                     # نوع التنبيه: low_stock, expiry_warning, expired
    product_id: str
    product_name: str
    product_code: str
    warehouse_id: str
    warehouse_name: str
    center_name: Optional[str] = None
    current_quantity: float = 0
    min_quantity: float = 0
    expiry_date: Optional[str] = None
    days_to_expiry: Optional[int] = None
    message: str
    priority: str = "medium"            # low, medium, high, critical
    is_read: bool = False
    is_resolved: bool = False

class StockAlert(StockAlertBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None
    notified_via_email: bool = False
    notified_via_sms: bool = False


# فئات المنتجات
class ProductCategoryBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str                           # اسم الفئة
    code: str                           # رمز الفئة
    description: Optional[str] = None
    parent_category_id: Optional[str] = None  # فئة أب
    status: str = "active"

class ProductCategory(ProductCategoryBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# المنتجات/الأصناف
class WarehouseProductBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str                           # اسم المنتج
    code: str                           # رمز/باركود المنتج
    barcode: Optional[str] = None       # الباركود (EAN-13, UPC, etc.)
    qr_code: Optional[str] = None       # رمز QR
    category_id: Optional[str] = None   # فئة المنتج
    category_name: Optional[str] = None
    unit: str = "piece"                 # وحدة القياس: piece, kg, liter, box
    unit_price: float = 0               # سعر الوحدة
    cost_price: float = 0               # سعر التكلفة
    min_quantity: float = 0             # الحد الأدنى للكمية
    max_quantity: Optional[float] = None # الحد الأقصى
    safety_stock: float = 0             # مخزون الأمان
    reorder_point: float = 0            # نقطة إعادة الطلب
    reorder_quantity: float = 0         # كمية إعادة الطلب
    auto_reorder_enabled: bool = False  # تفعيل إعادة الطلب التلقائي
    abc_classification: str = "C"       # تصنيف ABC: A (مهم جداً), B (متوسط), C (منخفض)
    annual_consumption: float = 0       # الاستهلاك السنوي (لحساب ABC)
    annual_value: float = 0             # القيمة السنوية (لحساب ABC)
    expiry_tracking: bool = False       # تتبع الصلاحية
    batch_tracking: bool = False        # تتبع الدفعات
    description: Optional[str] = None
    status: str = "active"

class WarehouseProduct(WarehouseProductBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None


# مخزون المنتجات (الكميات في كل مخزن)
class ProductStockBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str                     # معرف المنتج
    product_name: str
    product_code: str
    warehouse_id: str                   # معرف المخزن
    warehouse_name: str
    quantity: float = 0                 # الكمية الحالية
    reserved_quantity: float = 0        # الكمية المحجوزة
    available_quantity: float = 0       # الكمية المتاحة
    batch_number: Optional[str] = None  # رقم الدفعة
    expiry_date: Optional[str] = None   # تاريخ الصلاحية
    location_in_warehouse: Optional[str] = None  # الموقع داخل المخزن (رف/قسم)

class ProductStock(ProductStockBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# حركات المخزون
class StockMovementBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    movement_type: str                  # نوع الحركة: receive, issue, transfer, adjust, return
    movement_number: str                # رقم الحركة
    product_id: str
    product_name: str
    product_code: str
    quantity: float                     # الكمية
    unit_price: float = 0               # سعر الوحدة
    total_value: float = 0              # القيمة الإجمالية
    from_warehouse_id: Optional[str] = None  # من مخزن
    from_warehouse_name: Optional[str] = None
    to_warehouse_id: Optional[str] = None    # إلى مخزن
    to_warehouse_name: Optional[str] = None
    reference_type: Optional[str] = None     # نوع المرجع: purchase_order, sales_order, transfer
    reference_id: Optional[str] = None       # معرف المرجع
    reference_number: Optional[str] = None   # رقم المرجع
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    supplier_id: Optional[str] = None        # المورد
    supplier_name: Optional[str] = None
    customer_id: Optional[str] = None        # العميل
    customer_name: Optional[str] = None
    notes: Optional[str] = None
    status: str = "completed"               # حالة الحركة

class StockMovement(StockMovementBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    movement_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[str] = None


# طلبات إعادة الطلب التلقائي
class AutoReorderRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_number: str                     # رقم الطلب
    product_id: str
    product_name: str
    product_code: str
    current_quantity: float                 # الكمية الحالية
    reorder_point: float                    # نقطة إعادة الطلب
    reorder_quantity: float                 # كمية إعادة الطلب المقترحة
    warehouse_id: str
    warehouse_name: str
    suggested_supplier_id: Optional[str] = None
    suggested_supplier_name: Optional[str] = None
    estimated_cost: float = 0               # التكلفة المقدرة
    status: str = "pending"                 # pending, approved, rejected, ordered
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    purchase_order_id: Optional[str] = None # رقم أمر الشراء بعد الموافقة
    notes: Optional[str] = None


# إعدادات تصنيف ABC وإعادة الطلب
class InventorySettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "inventory_settings"
    # إعدادات إعادة الطلب التلقائي
    auto_reorder_enabled: bool = False      # تفعيل/إغلاق إعادة الطلب التلقائي على مستوى النظام
    auto_reorder_check_interval: int = 24   # فترة الفحص بالساعات
    auto_reorder_notification_email: Optional[str] = None
    auto_reorder_notification_phone: Optional[str] = None
    # إعدادات تصنيف ABC
    abc_a_percentage: float = 80            # المنتجات A تمثل 80% من القيمة
    abc_b_percentage: float = 15            # المنتجات B تمثل 15% من القيمة
    abc_auto_calculate: bool = True         # حساب ABC تلقائياً
    abc_calculation_period_months: int = 12 # فترة حساب ABC (بالأشهر)
    # إعدادات الباركود
    barcode_auto_generate: bool = True      # توليد باركود تلقائي للمنتجات الجديدة
    barcode_prefix: str = "PRD"             # بادئة الباركود
    qr_code_include_price: bool = False     # تضمين السعر في QR
    qr_code_include_expiry: bool = True     # تضمين تاريخ الصلاحية في QR
    # إعدادات تقييم المخزون
    inventory_valuation_method: str = "weighted_average"  # FIFO, LIFO, weighted_average
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


# ==================== تتبع الدفعات (Batch/Lot Tracking) ====================
class ProductBatch(BaseModel):
    """نموذج دفعة الإنتاج"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    batch_number: str                       # رقم الدفعة
    product_id: str
    product_name: str
    product_code: str
    warehouse_id: str
    warehouse_name: str
    quantity: float                         # الكمية المتبقية
    initial_quantity: float                 # الكمية الأولية
    unit_cost: float = 0                    # تكلفة الوحدة
    production_date: Optional[str] = None   # تاريخ الإنتاج
    expiry_date: Optional[str] = None       # تاريخ انتهاء الصلاحية
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    supplier_batch_number: Optional[str] = None  # رقم دفعة المورد
    quality_status: str = "approved"        # approved, pending, rejected, quarantine
    quality_notes: Optional[str] = None
    status: str = "active"                  # active, depleted, expired, recalled
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None


# ==================== الجرد الدوري (Cycle Count) ====================
class CycleCount(BaseModel):
    """نموذج الجرد الدوري"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    count_number: str                       # رقم الجرد
    warehouse_id: str
    warehouse_name: str
    count_type: str = "full"                # full (جرد كامل), partial (جرد جزئي), abc (جرد ABC)
    status: str = "draft"                   # draft, in_progress, completed, approved, cancelled
    scheduled_date: str                     # تاريخ الجرد المجدول
    started_at: Optional[str] = None        # تاريخ بدء الجرد
    completed_at: Optional[str] = None      # تاريخ انتهاء الجرد
    counted_by: Optional[str] = None        # من قام بالجرد
    counted_by_name: Optional[str] = None
    approved_by: Optional[str] = None       # من وافق على الجرد
    approved_by_name: Optional[str] = None
    approved_at: Optional[str] = None
    total_items: int = 0                    # عدد الأصناف
    items_counted: int = 0                  # عدد الأصناف المجرودة
    variance_count: int = 0                 # عدد الفروقات
    variance_value: float = 0               # قيمة الفروقات
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None


class CycleCountItem(BaseModel):
    """عنصر الجرد"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cycle_count_id: str
    product_id: str
    product_name: str
    product_code: str
    batch_number: Optional[str] = None
    system_quantity: float                  # الكمية في النظام
    counted_quantity: Optional[float] = None  # الكمية الفعلية
    variance: Optional[float] = None        # الفرق
    variance_value: Optional[float] = None  # قيمة الفرق
    unit_cost: float = 0
    status: str = "pending"                 # pending, counted, verified
    notes: Optional[str] = None
    counted_at: Optional[str] = None


# ==================== إدارة المرتجعات ====================
class ProductReturn(BaseModel):
    """نموذج مرتجع"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    return_number: str                      # رقم المرتجع
    return_type: str                        # supplier (مرتجع للمورد), customer (مرتجع من العميل)
    status: str = "pending"                 # pending, approved, rejected, completed
    # تفاصيل المورد/العميل
    party_type: str                         # supplier أو customer
    party_id: str
    party_name: str
    # تفاصيل المنتج
    product_id: str
    product_name: str
    product_code: str
    batch_number: Optional[str] = None
    quantity: float
    unit_price: float
    total_value: float
    # سبب المرتجع
    return_reason: str                      # damaged, expired, quality_issue, wrong_item, excess
    reason_notes: Optional[str] = None
    # المخزن
    warehouse_id: str
    warehouse_name: str
    # المرجع
    reference_type: Optional[str] = None    # purchase_order, sales_order
    reference_id: Optional[str] = None
    reference_number: Optional[str] = None
    # التواريخ والموافقات
    return_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[str] = None
    notes: Optional[str] = None


# ==================== ربط المنتجات بالموردين ====================
class ProductSupplier(BaseModel):
    """ربط منتج بمورد"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_name: str
    supplier_id: str
    supplier_name: str
    supplier_product_code: Optional[str] = None  # رمز المنتج لدى المورد
    is_primary: bool = False                # المورد الأساسي
    unit_price: float = 0                   # سعر الوحدة
    min_order_quantity: float = 0           # الحد الأدنى للطلب
    lead_time_days: int = 0                 # وقت التوريد بالأيام
    currency: str = "OMR"
    last_purchase_date: Optional[str] = None
    last_purchase_price: Optional[float] = None
    quality_rating: Optional[int] = None    # تقييم الجودة 1-5
    notes: Optional[str] = None
    status: str = "active"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None


# المحاليل والفحوصات (خاص بالمختبرات)
class LabSolutionBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str                           # اسم المحلول
    code: str                           # رمز المحلول
    solution_type: str                  # نوع المحلول: reagent, buffer, standard, cleaning
    unit: str = "ml"                    # وحدة القياس
    current_quantity: float = 0         # الكمية الحالية
    min_quantity: float = 0             # الحد الأدنى
    warehouse_id: Optional[str] = None  # المخزن
    warehouse_name: Optional[str] = None
    expiry_date: Optional[str] = None   # تاريخ الصلاحية
    batch_number: Optional[str] = None  # رقم الدفعة
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    cost_per_unit: float = 0            # التكلفة لكل وحدة
    status: str = "active"
    notes: Optional[str] = None

class LabSolution(LabSolutionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None


# استهلاك المحاليل اليومي
class SolutionConsumptionBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    solution_id: str
    solution_name: str
    solution_code: str
    consumption_date: str               # تاريخ الاستهلاك
    quantity_consumed: float            # الكمية المستهلكة
    test_type: Optional[str] = None     # نوع الفحص
    test_count: int = 0                 # عدد الفحوصات
    notes: Optional[str] = None

class SolutionConsumption(SolutionConsumptionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None


# طلبات الشراء للمخزون
class PurchaseRequestBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    request_number: str                 # رقم الطلب
    request_date: str                   # تاريخ الطلب
    requester_id: str                   # طالب الشراء
    requester_name: str
    department: str                     # القسم
    priority: str = "normal"            # الأولوية: low, normal, high, urgent
    total_amount: float = 0             # المبلغ الإجمالي
    status: str = "pending"             # حالة الطلب: pending, approved, rejected, ordered, received
    notes: Optional[str] = None
    items: List[dict] = []              # قائمة المنتجات المطلوبة

class PurchaseRequest(PurchaseRequestBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[str] = None


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

# FixedAsset class moved to Fixed Assets System section below

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
    # دعم البصمات المتعددة (أكثر من 2)
    # كل عنصر: {"fingerprint_id": "12345", "center": "غدو", "device_ip": "192.168.1.1"}
    additional_fingerprints: Optional[List[dict]] = None
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
    substitute_employee_id: Optional[str] = None
    substitute_employee_name: Optional[str] = None
    delegate_permissions_to_id: Optional[str] = None
    delegate_permissions_to_name: Optional[str] = None
    attachment_url: Optional[str] = None  # رابط المستند المرفق

class LeaveRequestCreate(LeaveRequestBase):
    pass

class LeaveRequest(LeaveRequestBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== ADVANCE REQUEST MODELS ====================

class AdvanceRequestBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    request_type: str  # advance, expense, reimbursement
    amount: float
    reason: str
    notes: Optional[str] = None

class AdvanceRequestCreate(AdvanceRequestBase):
    pass

class AdvanceRequest(AdvanceRequestBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending_hr"  # pending_hr, pending_finance, approved, rejected_hr, rejected_finance
    hr_approved_by: Optional[str] = None
    hr_approved_by_name: Optional[str] = None
    hr_approved_at: Optional[str] = None
    hr_rejection_reason: Optional[str] = None
    finance_approved_by: Optional[str] = None
    finance_approved_by_name: Optional[str] = None
    finance_approved_at: Optional[str] = None
    finance_rejection_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== LOGIN TRACKING MODELS ====================

class LoginRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    ip_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    is_within_allowed_area: bool = True
    login_time: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    user_agent: Optional[str] = None

# ==================== EXCUSE REQUEST MODELS ====================

class ExcuseRequestBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    employee_name: str
    excuse_date: str  # تاريخ البداية (للتوافق مع القديم)
    excuse_date_to: Optional[str] = None  # تاريخ النهاية (اختياري)
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
    # Attendance counts
    present_days: int = 0
    working_days: int = 0
    day_off: int = 0
    weekly_off_days_count: int = 0
    sick_leave: int = 0
    compensation_leave: int = 0
    public_holiday: int = 0
    official_holidays: int = 0
    annual_leave: int = 0
    emergency_leave: int = 0
    on_duty: int = 0
    exam_leave: int = 0
    father_leave: int = 0
    accompanying_leave: int = 0
    unpaid_leave: int = 0
    absent_days: int = 0
    leave_days: int = 0
    otp_days: int = 0
    total_days: int = 0
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
    name_en: Optional[str] = None
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
    """نموذج مرحلة المشروع"""
    model_config = ConfigDict(extra="ignore")
    project_id: str
    project_name: str
    name: str  # اسم المرحلة (مثل: الحفر، الأساس، البناء)
    description: Optional[str] = None
    due_date: str
    deliverables: Optional[str] = None  # المخرجات المتوقعة
    payment_amount: Optional[float] = None  # مبلغ الدفعة
    order: int = 1  # ترتيب المرحلة

class ProjectMilestoneCreate(ProjectMilestoneBase):
    pass

class ProjectMilestone(ProjectMilestoneBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"  # pending, in_progress, completed
    start_date: Optional[str] = None
    achieved_date: Optional[str] = None
    completion_percentage: int = 0
    notes: Optional[str] = None
    # بيانات الفاتورة المرتبطة
    invoice_id: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_amount: Optional[float] = None
    invoice_status: Optional[str] = None  # pending, approved, paid
    # المرفقات
    attachments: List[str] = []  # قائمة روابط المرفقات
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# نموذج مرفق المرحلة
class MilestoneAttachment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    milestone_id: str
    file_name: str
    file_type: str  # invoice, document, image, contract
    file_url: str
    file_size: Optional[int] = None
    description: Optional[str] = None
    uploaded_by: Optional[str] = None
    uploaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== PROJECT CONTRACT & INVOICE MODELS ====================

class ProjectContractBase(BaseModel):
    """نموذج عقد المشروع"""
    model_config = ConfigDict(extra="ignore")
    project_id: str
    project_name: str
    contractor_name: str  # اسم المقاول/المورد
    contractor_phone: Optional[str] = None
    contractor_email: Optional[str] = None
    contract_value: float  # قيمة العقد
    currency: str = "OMR"
    start_date: str  # تاريخ البداية
    end_date: str  # تاريخ النهاية
    payment_terms: str  # شروط الدفع
    payment_schedule: Optional[str] = None  # جدول الدفعات
    scope_of_work: Optional[str] = None  # نطاق العمل
    terms_and_conditions: Optional[str] = None  # الشروط والأحكام
    attachments: List[str] = []  # مرفقات

class ProjectContractCreate(ProjectContractBase):
    pass

class ProjectContract(ProjectContractBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contract_number: Optional[str] = None  # رقم العقد
    status: str = "draft"  # draft, active, completed, cancelled
    total_paid: float = 0.0  # إجمالي المدفوع
    remaining_amount: float = 0.0  # المبلغ المتبقي
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProjectInvoiceBase(BaseModel):
    """نموذج فاتورة المشروع"""
    model_config = ConfigDict(extra="ignore")
    project_id: str
    project_name: str
    contract_id: Optional[str] = None  # معرف العقد
    invoice_type: str = "milestone"  # milestone (مرحلة) أو partial (دفعة جزئية)
    milestone_name: Optional[str] = None  # اسم المرحلة
    description: str  # وصف الفاتورة
    amount: float  # المبلغ
    currency: str = "OMR"
    due_date: Optional[str] = None  # تاريخ الاستحقاق
    notes: Optional[str] = None

class ProjectInvoiceCreate(ProjectInvoiceBase):
    pass

class ProjectInvoice(ProjectInvoiceBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: Optional[str] = None  # رقم الفاتورة
    status: str = "pending_project_manager"  # حالة الفاتورة
    # مراحل الموافقة
    project_manager_approval: bool = False
    project_manager_name: Optional[str] = None
    project_manager_date: Optional[str] = None
    project_manager_notes: Optional[str] = None
    finance_approval: bool = False
    finance_name: Optional[str] = None
    finance_date: Optional[str] = None
    finance_notes: Optional[str] = None
    gm_approval: bool = False  # موافقة المدير العام
    gm_name: Optional[str] = None
    gm_date: Optional[str] = None
    gm_notes: Optional[str] = None
    # معلومات الصرف
    is_paid: bool = False
    paid_date: Optional[str] = None
    paid_by: Optional[str] = None
    payment_reference: Optional[str] = None
    # تتبع
    created_by: Optional[str] = None
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
    app_theme: str = "default"  # Theme color: default, ocean, forest, sunset, royal, rose, dark, slate
    dark_mode: bool = False     # Dark mode toggle

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


# ==================== جدول السائقين الشهري (Driver Schedule) ====================

class DriverScheduleBase(BaseModel):
    """جدول السائقين الشهري - كل صف يمثل رحلة/مهمة لسائق"""
    model_config = ConfigDict(extra="ignore")
    
    # بيانات السائق
    driver_id: str
    driver_name: str
    
    # التاريخ والوقت
    schedule_date: str  # YYYY-MM-DD
    start_time: Optional[str] = None  # HH:MM
    end_time: Optional[str] = None  # HH:MM
    
    # المواقع
    collection_centers: List[str] = []  # مراكز التجميع (زيك، حجيف، غدو...)
    customer_company: str  # شركة العميل
    customer_id: Optional[str] = None
    
    # الشاحنة
    truck_number: str  # رقم الشاحنة
    truck_id: Optional[str] = None
    
    # كمية الحليب
    expected_quantity: float = 0  # الكمية المتوقعة (لتر)
    actual_quantity: Optional[float] = None  # الكمية الفعلية
    
    # الحالة والملاحظات
    status: str = "scheduled"  # scheduled, in_progress, completed, cancelled, reassigned
    notes: Optional[str] = None
    
    # في حالة إعادة التعيين بسبب غياب
    original_driver_id: Optional[str] = None
    original_driver_name: Optional[str] = None
    reassignment_reason: Optional[str] = None


class DriverSchedule(DriverScheduleBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    updated_by: Optional[str] = None
    updated_by_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None


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
    # لوحة التحكم
    "dashboard_view",           # عرض لوحة التحكم
    "dashboard_stats",          # عرض الإحصائيات
    
    # التحليلات
    "analysis_view",            # عرض التحليلات
    "analysis_reports",         # تقارير التحليلات
    "analysis_export",          # تصدير التحليلات
    
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
    "hr_employee_schedule_view", # عرض جدول الموظفين
    "hr_employee_schedule_edit", # تعديل جدول الموظفين
    "hr_driver_schedule_view",  # عرض جدول السائقين
    "hr_driver_schedule_edit",  # تعديل جدول السائقين
    "hr_letters_view",          # عرض الخطابات
    "hr_letters_create",        # إنشاء خطاب
    "hr_extra_pay_view",        # عرض البدلات الإضافية
    "hr_extra_pay_approve",     # الموافقة على البدلات الإضافية
    "hr_documents_view",        # عرض المستندات
    "hr_documents_upload",      # رفع المستندات
    
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
    
    # القانون
    "legal_contracts_view",     # عرض العقود
    "legal_contracts_create",   # إنشاء عقد
    "legal_contracts_edit",     # تعديل عقد
    "legal_cases_view",         # عرض القضايا
    "legal_cases_create",       # إنشاء قضية
    "legal_cases_edit",         # تعديل قضية
    
    # المشاريع
    "projects_view",            # عرض المشاريع
    "projects_create",          # إنشاء مشروع
    "projects_edit",            # تعديل مشروع
    "projects_delete",          # حذف مشروع
    
    # العمليات
    "operations_view",          # عرض العمليات
    "operations_edit",          # تعديل العمليات
    "operations_reports",       # تقارير العمليات
    
    # المشتريات
    "purchases_view",           # عرض المشتريات
    "purchases_create",         # إنشاء عملية شراء
    "purchases_edit",           # تعديل عملية شراء
    "purchases_approve",        # الموافقة على المشتريات
    
    # إدارة المخازن
    "warehouse_view",           # عرض المخازن
    "warehouse_create",         # إنشاء مخزن
    "warehouse_edit",           # تعديل مخزن
    "warehouse_delete",         # حذف مخزن
    "warehouse_products_view",  # عرض المنتجات
    "warehouse_products_create", # إضافة منتج
    "warehouse_products_edit",  # تعديل منتج
    "warehouse_stock_receive",  # استلام بضاعة
    "warehouse_stock_issue",    # صرف بضاعة
    "warehouse_stock_transfer", # تحويل بضاعة
    "warehouse_stock_adjust",   # تعديل/جرد المخزون
    "warehouse_solutions_view", # عرض المحاليل
    "warehouse_solutions_create", # إضافة محلول
    "warehouse_solutions_edit", # تعديل محلول
    "warehouse_consumption_record", # تسجيل استهلاك
    "warehouse_reports",        # تقارير المخازن
    "warehouse_export",         # تصدير بيانات المخازن
    
    # صلاحيات صرف المواد حسب نوع المخزن
    "warehouse_issue_lab",      # صرف من مخزن المختبر
    "warehouse_issue_cleaning", # صرف من مخزن مواد التنظيف
    "warehouse_issue_maintenance", # صرف من مخزن الصيانة
    "warehouse_issue_ppe",      # صرف من مخزن معدات الحماية
    "warehouse_issue_feed",     # صرف من مخزن الأعلاف
    "warehouse_issue_equipment", # صرف من مخزن المعدات وقطع الغيار
    "warehouse_issue_supplies", # صرف من مخزن مستلزمات الموردين
    "warehouse_issue_all",      # صرف من جميع المخازن
    "warehouse_approve_issue",  # الموافقة على طلبات الصرف
    
    # بوابة الموردين
    "supplier_portal_view",     # عرض بوابة الموردين
    "supplier_portal_messages", # رسائل الموردين
    "supplier_portal_feed_requests", # طلبات الأعلاف
    
    # التسويق
    "marketing_view",           # عرض التسويق
    "marketing_create",         # إنشاء حملة تسويقية
    "marketing_edit",           # تعديل حملة تسويقية
    "marketing_reports",        # تقارير التسويق
    
    # المالية
    "finance_view",             # عرض المالية
    "finance_transactions",     # المعاملات المالية
    "finance_reports",          # التقارير المالية
    "finance_approve",          # الموافقة على المعاملات المالية
    
    # الموافقات العامة
    "approvals_view",           # عرض الموافقات
    "approvals_hr",             # موافقات الموارد البشرية
    "approvals_finance",        # موافقات المالية
    "approvals_gm",             # موافقات المدير العام
    
    # المهام
    "tasks_view",               # عرض المهام
    "tasks_create",             # إنشاء مهمة
    "tasks_new",                # مهمة جديدة (إنشاء وتعيين)
    "tasks_assign",             # تعيين مهام للموظفين
    "tasks_manage",             # إدارة جميع المهام
    "tasks_reports",            # تقارير المهام
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


# ==================== نظام المهام ====================

class TaskBase(BaseModel):
    """نموذج المهمة الأساسي"""
    model_config = ConfigDict(extra="ignore")
    title: str                              # عنوان المهمة
    description: str                        # وصف المهمة
    task_type: str = "general"              # نوع المهمة: general, routine_maintenance, equipment_inspection, cleaning, report
    assigned_to_id: str                     # معرف الموظف المكلف
    assigned_to_name: str                   # اسم الموظف المكلف
    assigned_by_id: str                     # معرف المسؤول الذي أنشأ المهمة
    assigned_by_name: str                   # اسم المسؤول
    priority: str = "medium"                # الأولوية: low, medium, high, urgent
    due_date: str                           # تاريخ الإنجاز المطلوب
    category: Optional[str] = None          # تصنيف المهمة
    department: Optional[str] = None        # القسم
    center_id: Optional[str] = None         # المركز
    center_name: Optional[str] = None
    recurring: bool = False                 # مهمة متكررة
    recurrence_pattern: Optional[str] = None  # daily, weekly, monthly
    requires_document: bool = False         # هل تتطلب مستند إنجاز؟

# أنواع المهام
TASK_TYPES = [
    {"id": "general", "name_ar": "مهمة عامة", "name_en": "General Task"},
    {"id": "routine_maintenance", "name_ar": "صيانة روتينية", "name_en": "Routine Maintenance"},
    {"id": "equipment_inspection", "name_ar": "فحص المعدات", "name_en": "Equipment Inspection"},
    {"id": "cleaning", "name_ar": "تنظيف", "name_en": "Cleaning"},
    {"id": "report", "name_ar": "تقرير", "name_en": "Report"},
    {"id": "inventory", "name_ar": "جرد المخزون", "name_en": "Inventory Check"},
    {"id": "delivery", "name_ar": "توصيل", "name_en": "Delivery"},
    {"id": "meeting", "name_ar": "اجتماع", "name_en": "Meeting"},
]

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_number: Optional[str] = None       # رقم المهمة
    status: str = "pending"                 # pending, in_progress, completed, delayed, cancelled
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None
    started_at: Optional[str] = None        # تاريخ بدء العمل
    completed_at: Optional[str] = None      # تاريخ الإنجاز الفعلي
    is_delayed: bool = False                # هل تأخرت المهمة؟
    delay_days: int = 0                     # عدد أيام التأخير
    completion_notes: Optional[str] = None  # ملاحظات الإنجاز
    attachment_url: Optional[str] = None    # رابط مرفق الإنجاز
    attachment_name: Optional[str] = None   # اسم الملف المرفق
    completion_document_url: Optional[str] = None  # رابط مستند الإنجاز
    completion_document_name: Optional[str] = None  # اسم مستند الإنجاز

class TaskResponse(BaseModel):
    """رد الموظف على المهمة"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str
    responder_id: str
    responder_name: str
    message: str
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TaskNotification(BaseModel):
    """إشعار المهمة"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str
    user_id: str
    notification_type: str                  # new_task, task_updated, task_response, task_reminder
    title: str
    message: str
    is_read: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    read_at: Optional[str] = None


# ==================== نظام الأصول الثابتة ====================

class FixedAssetBase(BaseModel):
    """نموذج الأصول الثابتة"""
    model_config = ConfigDict(extra="ignore")
    name: str                               # اسم الأصل
    asset_code: str                         # رمز الأصل
    asset_type: str                         # نوع الأصل: equipment, vehicle, machinery, furniture, electronics
    category: str                           # الفئة: fixed_assets, consumables, spare_parts
    brand: Optional[str] = None             # الماركة
    model: Optional[str] = None             # الموديل
    serial_number: Optional[str] = None     # الرقم التسلسلي
    purchase_date: Optional[str] = None     # تاريخ الشراء
    purchase_price: float = 0               # سعر الشراء
    current_value: float = 0                # القيمة الحالية
    depreciation_rate: float = 0            # نسبة الإهلاك السنوي
    supplier_id: Optional[str] = None       # المورد
    supplier_name: Optional[str] = None
    warranty_expiry: Optional[str] = None   # تاريخ انتهاء الضمان
    # معلومات الموقع
    warehouse_id: Optional[str] = None      # المخزن
    warehouse_name: Optional[str] = None
    center_id: Optional[str] = None         # المركز
    center_name: Optional[str] = None
    location_details: Optional[str] = None  # تفاصيل الموقع (مبنى، طابق، غرفة)
    assigned_to_id: Optional[str] = None    # الموظف المسؤول
    assigned_to_name: Optional[str] = None
    # معلومات الحالة
    status: str = "active"                  # active, in_maintenance, disposed, transferred
    condition: str = "good"                 # excellent, good, fair, poor
    last_maintenance_date: Optional[str] = None
    next_maintenance_date: Optional[str] = None
    notes: Optional[str] = None

class FixedAsset(FixedAssetBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None

class AssetMovementBase(BaseModel):
    """حركات الأصول (تحويل، صيانة، إهلاك)"""
    model_config = ConfigDict(extra="ignore")
    asset_id: str
    asset_name: str
    asset_code: str
    movement_type: str                      # transfer, maintenance, disposal, status_change
    from_location: Optional[str] = None     # الموقع السابق
    to_location: Optional[str] = None       # الموقع الجديد
    from_warehouse_id: Optional[str] = None
    to_warehouse_id: Optional[str] = None
    reason: Optional[str] = None            # سبب الحركة
    notes: Optional[str] = None
    performed_by: str
    performed_by_name: str

class AssetMovement(AssetMovementBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    movement_number: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ==================== فئات المخازن المحسنة ====================

# فئات المنتجات المتاحة
PRODUCT_CATEGORIES = [
    {"id": "fixed_assets", "name_ar": "الأصول الثابتة", "name_en": "Fixed Assets"},
    {"id": "consumables", "name_ar": "المواد الاستهلاكية", "name_en": "Consumables"},
    {"id": "spare_parts", "name_ar": "قطع الغيار", "name_en": "Spare Parts"},
    {"id": "lab_solutions", "name_ar": "المحاليل المخبرية", "name_en": "Lab Solutions"},
    {"id": "cleaning", "name_ar": "مواد التنظيف", "name_en": "Cleaning Materials"},
    {"id": "ppe", "name_ar": "معدات الوقاية", "name_en": "PPE"},
    {"id": "feed", "name_ar": "الأعلاف", "name_en": "Feed"},
    {"id": "maintenance", "name_ar": "أدوات الصيانة", "name_en": "Maintenance Tools"},
]

# أنواع المخازن
WAREHOUSE_TYPES = [
    {"id": "external", "name_ar": "مخزن خارجي", "name_en": "External Warehouse"},
    {"id": "internal", "name_ar": "مخزن داخلي", "name_en": "Internal Warehouse"},
    {"id": "sub", "name_ar": "مخزن فرعي", "name_en": "Sub Warehouse"},
]

