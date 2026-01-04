"""
Routes Package - حزمة المسارات
"""

from .feed_routes import router as feed_router
from .hr_routes import router as hr_router
from .treasury_routes import router as treasury_router
from .suppliers_routes import router as suppliers_router

__all__ = [
    "feed_router",
    "hr_router", 
    "treasury_router",
    "suppliers_router"
]
