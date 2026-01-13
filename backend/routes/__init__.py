"""
Routes Package - حزمة المسارات

يحتوي هذا المجلد على جميع مسارات API مقسمة حسب الوظيفة.

الهيكل:
- auth_routes.py: المصادقة والمستخدمين
- suppliers_routes.py: الموردين وبوابة الموردين
- milk_routes.py: استقبال الحليب
- customers_routes.py: العملاء
- sales_routes.py: المبيعات
- inventory_routes.py: المخزون
- payments_routes.py: المدفوعات
- feed_routes.py: الأعلاف
- treasury_routes.py: الخزينة
- hr_routes.py: الموارد البشرية
- cctv_routes.py: نظام المراقبة
- hikconnect_routes.py: Hik-Connect
- operations_routes.py: العمليات
- procurement_routes.py: المشتريات
- sms_routes.py: الرسائل النصية
- reports_routes.py: التقارير
- settings_routes.py: الإعدادات
"""

from .customers_routes import router as customers_router
from .sales_routes import router as sales_router
from .inventory_routes import router as inventory_router
from .milk_routes import router as milk_router

__all__ = [
    "customers_router",
    "sales_router",
    "inventory_router",
    "milk_router",
]
