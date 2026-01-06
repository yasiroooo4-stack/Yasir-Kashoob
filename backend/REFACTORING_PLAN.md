# خطة إعادة هيكلة Backend

## الوضع الحالي
- `server.py`: 12,737 سطر (خطر!)
- جميع الـ routes في ملف واحد
- جميع النماذج في ملف واحد

## الهيكل المستهدف

```
/app/backend/
├── server.py              # نقطة الدخول فقط (~ 100 سطر)
├── config.py              # ✅ تم إنشاؤه - إعدادات التطبيق
├── database.py            # ✅ تم إنشاؤه - اتصال قاعدة البيانات
├── auth.py                # معلق - دوال المصادقة
│
├── models/
│   ├── __init__.py
│   └── all_models.py      # ✅ تم إنشاؤه - جميع نماذج Pydantic
│
├── utils/
│   ├── __init__.py        # ✅ تم إنشاؤه
│   └── helpers.py         # ✅ تم إنشاؤه - الأدوات المساعدة
│
└── routes/
    ├── __init__.py        # تجميع جميع الـ routers
    ├── auth_routes.py     # ✅ تم إنشاؤه - المصادقة والمراكز
    ├── suppliers_routes.py   # الموردين وبوابة الموردين
    ├── milk_routes.py        # استقبال الحليب
    ├── customers_routes.py   # العملاء
    ├── sales_routes.py       # المبيعات
    ├── payments_routes.py    # المدفوعات
    ├── inventory_routes.py   # المخزون
    ├── feed_routes.py        # الأعلاف
    ├── treasury_routes.py    # الخزينة
    ├── hr_routes.py          # الموارد البشرية (الأكبر)
    ├── finance_routes.py     # النظام المالي
    ├── legal_routes.py       # القانون
    ├── projects_routes.py    # المشاريع
    ├── operations_routes.py  # العمليات
    ├── marketing_routes.py   # التسويق
    ├── reports_routes.py     # التقارير
    ├── settings_routes.py    # الإعدادات
    └── sms_routes.py         # ✅ تم إنشاؤه - الرسائل النصية
```

## الأولوية

### المرحلة 1 - الأساسيات (تم)
- [x] إنشاء `database.py`
- [x] إنشاء `config.py`
- [x] إنشاء `models/all_models.py`
- [x] إنشاء `utils/helpers.py`

### المرحلة 2 - المسارات الأساسية
- [x] إنشاء `routes/auth_routes.py` (قالب)
- [x] إنشاء `routes/sms_routes.py` (قالب)
- [ ] نقل المسارات من `server.py`

### المرحلة 3 - المسارات المتقدمة
- [ ] `routes/hr_routes.py` (الأكبر - ~3000 سطر)
- [ ] `routes/finance_routes.py` (~1500 سطر)
- [ ] `routes/suppliers_routes.py` (~1000 سطر)
- [ ] باقي المسارات

### المرحلة 4 - التنظيف
- [ ] حذف الكود المكرر من `server.py`
- [ ] تحديث `__init__.py`
- [ ] اختبار شامل

## ملاحظات مهمة

1. **لا تكسر الكود الموجود** - نقل تدريجي
2. **اختبار بعد كل تغيير** - التأكد أن API يعمل
3. **الحفاظ على التوافق** - نفس URLs و responses

## كيفية استخدام الهيكل الجديد

```python
# في server.py الجديد
from fastapi import FastAPI
from database import db
from config import DEFAULT_CENTERS

# Import routers
from routes.auth_routes import router as auth_router
from routes.sms_routes import router as sms_router
# ... المزيد

app = FastAPI(title="Milk Collection Center ERP")

# Include routers
app.include_router(auth_router)
app.include_router(sms_router)
# ... المزيد
```

## تاريخ التحديث
- 2025-01-06: بدء الهيكلة، إنشاء الملفات الأساسية
