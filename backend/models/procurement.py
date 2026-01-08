from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from enum import Enum
import uuid
from datetime import datetime, timezone

# Enums
class RequisitionStatus(str, Enum):
    DRAFT = "draft"
    PENDING_DEPT_APPROVAL = "pending_dept_approval"
    PENDING_FINANCE_APPROVAL = "pending_finance_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class POStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    CONFIRMED = "confirmed"
    PARTIALLY_RECEIVED = "partially_received"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class VendorStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLACKLISTED = "blacklisted"

class PaymentTerms(str, Enum):
    CASH = "cash"
    NET_15 = "net_15"
    NET_30 = "net_30"
    NET_60 = "net_60"
    NET_90 = "net_90"

# Vendor/Supplier for Procurement
class VendorBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    name_ar: Optional[str] = None
    category: str  # e.g., "equipment", "supplies", "services", "feed"
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    tax_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    payment_terms: PaymentTerms = PaymentTerms.NET_30
    rating: int = 3  # 1-5 stars
    notes: Optional[str] = None

class VendorCreate(VendorBase):
    pass

class Vendor(VendorBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: VendorStatus = VendorStatus.ACTIVE
    total_orders: int = 0
    total_amount: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None

# Purchase Requisition Item
class RequisitionItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_name: str
    description: Optional[str] = None
    quantity: float
    unit: str = "piece"
    estimated_price: float = 0.0
    total_estimated: float = 0.0
    inventory_item_id: Optional[str] = None

# Purchase Requisition
class RequisitionBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str
    department: str
    priority: str = "medium"  # low, medium, high, urgent
    required_date: Optional[str] = None
    justification: Optional[str] = None
    items: List[RequisitionItem] = []

class RequisitionCreate(RequisitionBase):
    pass

class ApprovalHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    step: str
    approver_id: str
    approver_name: str
    action: str  # approved, rejected
    comments: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Requisition(RequisitionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    requisition_number: str = ""
    status: RequisitionStatus = RequisitionStatus.DRAFT
    total_estimated: float = 0.0
    requested_by: str = ""
    requested_by_name: str = ""
    current_approver: Optional[str] = None
    approval_history: List[ApprovalHistory] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

# Purchase Order Item
class POItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_name: str
    description: Optional[str] = None
    quantity: float
    unit: str = "piece"
    unit_price: float
    total_price: float = 0.0
    quantity_received: float = 0.0
    requisition_item_id: Optional[str] = None

# Purchase Order
class POBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    vendor_id: str
    vendor_name: str
    requisition_id: Optional[str] = None
    delivery_date: Optional[str] = None
    delivery_address: Optional[str] = None
    payment_terms: PaymentTerms = PaymentTerms.NET_30
    notes: Optional[str] = None
    items: List[POItem] = []

class POCreate(POBase):
    pass

class PurchaseOrder(POBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    po_number: str = ""
    status: POStatus = POStatus.DRAFT
    subtotal: float = 0.0
    tax_rate: float = 0.0
    tax_amount: float = 0.0
    total_amount: float = 0.0
    amount_paid: float = 0.0
    created_by: str = ""
    created_by_name: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    sent_at: Optional[str] = None
    confirmed_at: Optional[str] = None
    completed_at: Optional[str] = None

# Goods Receipt
class GoodsReceiptItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    po_item_id: str
    item_name: str
    quantity_ordered: float
    quantity_received: float
    quantity_accepted: float = 0.0
    quantity_rejected: float = 0.0
    rejection_reason: Optional[str] = None
    unit: str = "piece"

class GoodsReceiptBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    po_id: str
    po_number: str
    vendor_id: str
    vendor_name: str
    receipt_date: str
    delivery_note_number: Optional[str] = None
    notes: Optional[str] = None
    items: List[GoodsReceiptItem] = []

class GoodsReceiptCreate(GoodsReceiptBase):
    pass

class GoodsReceipt(GoodsReceiptBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    receipt_number: str = ""
    received_by: str = ""
    received_by_name: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Inventory Item
class InventoryItemBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    name_ar: Optional[str] = None
    sku: Optional[str] = None
    category: str
    unit: str = "piece"
    min_quantity: float = 0.0
    max_quantity: float = 0.0
    reorder_point: float = 0.0
    location: Optional[str] = None
    notes: Optional[str] = None

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItem(InventoryItemBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    current_quantity: float = 0.0
    average_cost: float = 0.0
    total_value: float = 0.0
    last_purchase_date: Optional[str] = None
    last_purchase_price: Optional[float] = None
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

# Vendor Evaluation
class VendorEvaluation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    vendor_name: str
    period: str  # e.g., "2025-Q4"
    quality_score: int = 3  # 1-5
    delivery_score: int = 3  # 1-5
    price_score: int = 3  # 1-5
    service_score: int = 3  # 1-5
    overall_score: float = 3.0
    comments: Optional[str] = None
    evaluated_by: str = ""
    evaluated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
