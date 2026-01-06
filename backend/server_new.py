"""
Milk Collection Center ERP - Main Application Entry Point
نقطة الدخول الرئيسية لنظام ERP لمركز تجميع الحليب

هذا الملف هو النسخة المعاد هيكلتها من server.py
يتم استخدامه كمرجع للهيكل المستهدف

ملاحظة: الملف الحالي المستخدم هو server.py
سيتم الانتقال لهذا الملف بعد اكتمال إعادة الهيكلة
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging

# Database
from database import db, client

# Configuration
from config import DEFAULT_CENTERS

# Import all routers (when ready)
# from routes.auth_routes import router as auth_router
# from routes.suppliers_routes import router as suppliers_router
# from routes.milk_routes import router as milk_router
# from routes.customers_routes import router as customers_router
# from routes.sales_routes import router as sales_router
# from routes.payments_routes import router as payments_router
# from routes.inventory_routes import router as inventory_router
# from routes.feed_routes import router as feed_router
# from routes.treasury_routes import router as treasury_router
# from routes.hr_routes import router as hr_router
# from routes.finance_routes import router as finance_router
# from routes.legal_routes import router as legal_router
# from routes.projects_routes import router as projects_router
# from routes.operations_routes import router as operations_router
# from routes.marketing_routes import router as marketing_router
# from routes.reports_routes import router as reports_router
# from routes.settings_routes import router as settings_router
# from routes.sms_routes import router as sms_router

# Import models for startup initialization
from models.all_models import CollectionCenter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(
    title="Milk Collection Center ERP",
    description="نظام ERP لمركز تجميع الحليب - المروج للألبان",
    version="2.0.0"
)


@app.on_event("startup")
async def startup_event():
    """Initialize default collection centers on startup"""
    try:
        for center_data in DEFAULT_CENTERS:
            existing = await db.collection_centers.find_one({"code": center_data["code"]})
            if not existing:
                center = CollectionCenter(**center_data)
                await db.collection_centers.insert_one(center.model_dump())
                logging.info(f"Created default center: {center_data['name']}")
            else:
                logging.info(f"Center already exists: {center_data['name']}")
    except Exception as e:
        logging.error(f"Error initializing default centers: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    """Close database connection on shutdown"""
    client.close()


# Include all routers
# app.include_router(auth_router)
# app.include_router(suppliers_router)
# app.include_router(milk_router)
# app.include_router(customers_router)
# app.include_router(sales_router)
# app.include_router(payments_router)
# app.include_router(inventory_router)
# app.include_router(feed_router)
# app.include_router(treasury_router)
# app.include_router(hr_router)
# app.include_router(finance_router)
# app.include_router(legal_router)
# app.include_router(projects_router)
# app.include_router(operations_router)
# app.include_router(marketing_router)
# app.include_router(reports_router)
# app.include_router(settings_router)
# app.include_router(sms_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/")
async def root():
    """Root endpoint"""
    return {"message": "Milk Collection Center ERP API", "version": "2.0.0"}
