from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

# Marketing Campaign Models
class MarketingCampaignBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    campaign_type: str
    description: Optional[str] = None
    start_date: str
    end_date: str
    budget: float
    target_audience: Optional[str] = None
    channels: Optional[List[str]] = None
    objectives: Optional[str] = None
    kpis: Optional[str] = None
    responsible_employee_id: Optional[str] = None
    responsible_employee_name: Optional[str] = None

class MarketingCampaignCreate(MarketingCampaignBase):
    pass

class MarketingCampaign(MarketingCampaignBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "draft"
    actual_spend: float = 0.0
    roi: Optional[float] = None
    results: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Lead Models
class LeadBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: str
    source: str
    interest: str
    estimated_value: Optional[float] = None
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    notes: Optional[str] = None
    next_follow_up: Optional[str] = None

class LeadCreate(LeadBase):
    pass

class Lead(LeadBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "new"
    converted_to_customer_id: Optional[str] = None
    converted_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Social Media Post Models
class SocialMediaPostBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    platform: str
    content: str
    media_urls: Optional[List[str]] = None
    scheduled_date: Optional[str] = None
    campaign_id: Optional[str] = None
    hashtags: Optional[List[str]] = None

class SocialMediaPostCreate(SocialMediaPostBase):
    pass

class SocialMediaPost(SocialMediaPostBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "draft"
    published_at: Optional[str] = None
    engagement_likes: int = 0
    engagement_comments: int = 0
    engagement_shares: int = 0
    reach: int = 0
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Sales Offer Models
class SalesOfferBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str
    description: str
    offer_type: str
    discount_percentage: Optional[float] = None
    discount_amount: Optional[float] = None
    start_date: str
    end_date: str
    terms_conditions: Optional[str] = None
    target_products: Optional[List[str]] = None
    target_customers: Optional[str] = None
    min_purchase: Optional[float] = None

class SalesOfferCreate(SalesOfferBase):
    pass

class SalesOffer(SalesOfferBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "draft"
    usage_count: int = 0
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Market Return Models
class MarketReturnBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    sale_id: Optional[str] = None
    customer_id: str
    customer_name: str
    return_date: str
    quantity_liters: float
    reason: str
    condition: str
    disposal_method: str
    refund_amount: float = 0.0
    notes: Optional[str] = None

class MarketReturnCreate(MarketReturnBase):
    pass

class MarketReturn(MarketReturnBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    processed_by: Optional[str] = None
    processed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Market Sales Summary Models
class MarketSalesSummaryBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    date: str
    center_id: Optional[str] = None
    center_name: Optional[str] = None
    total_sales: int = 0
    total_quantity: float = 0.0
    total_revenue: float = 0.0
    total_returns: int = 0
    return_quantity: float = 0.0
    net_sales: float = 0.0

class MarketSalesSummaryCreate(MarketSalesSummaryBase):
    pass

class MarketSalesSummary(MarketSalesSummaryBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
