# نظام ERP لمزرعة الألبان - PRD

## نظرة عامة
نظام ERP متكامل لإدارة مزرعة الألبان يشمل:
- إدارة الموردين واستلام الحليب
- إدارة الموارد البشرية والرواتب
- إدارة المبيعات والعملاء
- النظام المالي والخزينة
- إدارة المخزون والأعلاف
- **إدارة المستودعات الشاملة (جديد)**

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Languages:** Arabic (primary) + English

## الميزات المُنجزة

### ديسمبر 2025 - يناير 2026

#### استيراد البيانات
- ✅ استيراد رواتب الموظفين من Excel
- ✅ استيراد بيانات الحسابات البنكية للموظفين
- ✅ استيراد بيانات 1,148 مورد من 6 ملفات Excel
- ✅ إضافة حقول Bank Name و Bank Account في صفحة Salary Structures

#### إدارة رصيد الإجازات (يناير 2026)
- ✅ واجهة إدارة معدل الإجازات الشهرية
- ✅ دعم المعدل التلقائي والمعدل اليدوي
- ✅ API endpoint: `PUT /api/hr/employees/{id}/leave-rate`

#### إصلاحات الأخطاء (يناير 2026)
- ✅ إصلاح خطأ حفظ معدل الإجازة الشهري
- ✅ جعل حقول phone و address اختيارية في نموذج Supplier
- ✅ إصلاح صفحة System Settings لعرض المراكز

#### نظام إدارة المستودعات (14 يناير 2026) ✅
- ✅ CRUD كامل للمخازن (إنشاء، قراءة، تحديث، حذف)
- ✅ CRUD كامل للمنتجات مع فئات المنتجات
- ✅ حركات المخزون: استلام، صرف، تحويل، تعديل
- ✅ إدارة المحاليل والكواشف للمختبر
- ✅ تسجيل استهلاك المحاليل
- ✅ تصدير التقارير (Excel): المخزون، الحركات، المحاليل
- ✅ ملخص المخزون: إجمالي المنتجات، المخازن، المنخفض، المنتهي الصلاحية
- ✅ واجهة مستخدم شاملة مع تبويبات متعددة

#### معامل خصم الغياب (14 يناير 2026) ✅
- ✅ API للحصول على معامل الخصم: `GET /api/hr/settings/absence-deduction-factor`
- ✅ API لتحديث معامل الخصم: `PUT /api/hr/settings/absence-deduction-factor`
- ✅ دعم القيم: 0 (بدون خصم)، 0.5 (نصف يوم)، 1.0 (يوم كامل)، 1.5، 2.0
- ✅ تطبيق المعامل في حساب الرواتب
- ✅ واجهة تعديل المعامل في صفحة كشف الرواتب

#### تنظيف الكود (14 يناير 2026) ✅
- ✅ حذف ملف Inventory.jsx القديم
- ✅ إزالة الـ route والـ import من App.js

## المهام المعلقة

### P1 - قيد التنفيذ
- [ ] إعادة هيكلة server.py الضخم (~12,500 سطر)
  - [x] إنشاء customers_routes.py
  - [x] إنشاء sales_routes.py
  - [x] إنشاء inventory_routes.py
  - [x] إنشاء milk_routes.py
  - [x] إنشاء warehouse_routes.py
  - [ ] نقل المزيد من endpoints (payments, reports, settings)

### P2 - قادم
- [ ] تكامل Hikvision للبث المباشر
- [ ] تكوين SMS Provider
- [ ] تكامل Ekomilk Scale (RS232)
- [ ] دمج المستودعات مع المالية والمبيعات

### P3 - مستقبلي
- [ ] AI Camera لمسح QR
- [ ] تحسين بوابة الموردين
- [ ] تصدير بيانات الرواتب لملف Excel للبنك

## مشاكل معروفة
1. **نظام i18n مختلط:** بعض الصفحات تستخدم `useLanguage` hook وأخرى تستخدم `react-i18next`

## API Endpoints الرئيسية

### إدارة المستودعات
- `GET /api/warehouse/warehouses` - قائمة المخازن
- `POST /api/warehouse/warehouses` - إنشاء مخزن
- `GET /api/warehouse/products` - قائمة المنتجات
- `POST /api/warehouse/products` - إنشاء منتج
- `GET /api/warehouse/stock` - المخزون الحالي
- `GET /api/warehouse/stock/summary` - ملخص المخزون
- `POST /api/warehouse/movements/receive` - استلام بضاعة
- `POST /api/warehouse/movements/issue` - صرف بضاعة
- `POST /api/warehouse/movements/transfer` - تحويل بين المخازن
- `GET /api/warehouse/solutions` - المحاليل
- `POST /api/warehouse/solutions/consumption` - تسجيل استهلاك
- `GET /api/warehouse/export/stock/excel` - تصدير المخزون

### معامل خصم الغياب
- `GET /api/hr/settings/absence-deduction-factor` - جلب المعامل
- `PUT /api/hr/settings/absence-deduction-factor` - تحديث المعامل

### الحضور والرواتب
- `GET /api/hr/attendance/report` - تقرير الحضور
- `GET /api/hr/attendance` - سجلات الحضور
- `POST /api/hr/payroll/periods/{id}/calculate` - حساب الرواتب

## بيانات الاختبار
- Admin: `yasir` / `admin123`
- Test Admin: `testadmin` / `admin123`

## هيكل المشروع
```
/app
├── backend/
│   ├── models/all_models.py
│   ├── routes/
│   │   ├── warehouse_routes.py   # إدارة المستودعات
│   │   ├── customers_routes.py
│   │   ├── sales_routes.py
│   │   ├── permissions_routes.py
│   │   └── ...
│   └── server.py
└── frontend/
    └── src/
        ├── App.js
        ├── pages/
        │   ├── WarehouseManagement.jsx  # صفحة المستودعات
        │   ├── Payroll.jsx              # كشف الرواتب + معامل الخصم
        │   ├── HR.jsx
        │   └── ...
        └── components/ui/
```

## آخر تحديث: 14 يناير 2026

### التحديثات الأخيرة:
1. ✅ نظام إدارة المستودعات الشامل
2. ✅ معامل خصم الغياب القابل للتعديل
3. ✅ حذف صفحة Inventory القديمة
4. ✅ إصلاح prefix الـ API للمستودعات
