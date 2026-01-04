# نظام ERP مركز تجميع الحليب - PRD

## المشكلة الأصلية
نظام ERP كامل لمركز تجميع الحليب يشمل جميع الأقسام

## ما تم تنفيذه - 4 يناير 2026

### 1. صفحة ربط الموظفين بأرقام البصمة ✅
- **مكون جديد:** `/app/frontend/src/components/hr/FingerprintManager.jsx`
- **تبويب جديد:** "ربط البصمات" في صفحة HR
- **الميزات:**
  - إحصائيات: مرتبطين / غير مرتبطين
  - بحث بالاسم أو رقم البصمة
  - ربط فردي لكل موظف
  - **ربط مجمع** (bulk link) - لصق قائمة بتنسيق: `رقم_البصمة,اسم_الموظف`
  - حالة الربط (مرتبط/غير مرتبط) بألوان واضحة

### 2. APIs مزامنة البصمة الجديدة ✅
- `POST /api/hr/attendance/bulk-sync` - مزامنة مجمعة سريعة
- `POST /api/hr/attendance/sync` - مزامنة سجل واحد
- البحث التلقائي عن الموظف بـ: fingerprint_id، employee_id، أو الاسم
- إنشاء السجلات حتى لو لم يُعثر على الموظف (needs_review: true)

### 3. بدء إعادة هيكلة الملفات ✅
- **هيكل جديد:**
  ```
  /app/backend/routes/
  ├── __init__.py
  ├── feed_routes.py      # مسارات الأعلاف
  ├── hr_routes.py        # مسارات HR
  ├── treasury_routes.py  # مسارات الخزينة
  └── suppliers_routes.py # مسارات الموردين
  
  /app/frontend/src/components/hr/
  └── FingerprintManager.jsx  # إدارة البصمات
  ```

### 4. تحسينات سابقة ✅
- تنبيهات انخفاض مخزون الأعلاف
- صفحة طباعة طلب الشراء (Purchase Request) مع الشعار
- ربط مشتريات الأعلاف بالمخزون والمالية

## تطبيق سطح المكتب
- **ملف جديد:** `fingerprint_sync_v3.zip`
- يستخدم `/api/hr/attendance/bulk-sync`
- مزامنة مجمعة أسرع

## المهام المتبقية

### P1 - عاجل:
- [ ] نقل routes من server.py للملفات المنفصلة (تدريجي)
- [ ] تقسيم HR.jsx لمكونات أصغر

### P2 - قريباً:
- [ ] ربط موازين Ekomilk
- [ ] كاميرا AI لمسح QR

## البنية التقنية
- **Backend:** FastAPI, MongoDB, JWT
- **Frontend:** React 18, Tailwind CSS, shadcn/ui
- **Desktop:** Python + PyQt5 + pyzk

## بيانات الاختبار
- **Admin:** yasir / admin123
- **HR:** hassan / Hassan@123
