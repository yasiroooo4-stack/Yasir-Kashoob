# نظام ERP لمزرعة الألبان - PRD

## نظرة عامة
نظام ERP متكامل لإدارة مزرعة الألبان يشمل:
- إدارة الموردين واستلام الحليب
- إدارة الموارد البشرية والرواتب
- إدارة المبيعات والعملاء
- النظام المالي والخزينة
- إدارة المخزون والأعلاف

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

## المهام المعلقة

### P0 - مكتمل ✅

### P1 - قيد التنفيذ
- [x] إكمال ترجمة الصفحات (i18n): ✅ **(تم - يناير 2026)**
  - [x] AdvancedReports.jsx - ترجمة كاملة ثنائية اللغة
  - [x] CCTVSystem.jsx - ترجمة رسائل toast والنصوص الأساسية
  - [x] SupplierManagement.jsx - ترجمة كاملة ثنائية اللغة
- [ ] إعادة هيكلة server.py الضخم (12,133 سطر) - **قيد التنفيذ**

### P2 - قادم
- [x] إصلاح ProtectedRoute race condition ✅ **(تم الإصلاح)**
- [ ] تكامل Hikvision للبث المباشر
- [ ] تكوين SMS Provider
- [ ] تكامل Ekomilk Scale (RS232)

### P3 - مستقبلي
- [ ] تعديل منطق حساب الغياب
- [ ] AI Camera لمسح QR
- [ ] تحسين بوابة الموردين
- [ ] تصدير بيانات الرواتب لملف Excel للبنك

## مشاكل معروفة
1. ~~**ProtectedRoute Race Condition:** التنقل المباشر عبر URL قد يفشل ويعيد التوجيه للـ dashboard~~ ✅ **تم الإصلاح (يناير 2026)**
2. **نظام i18n مختلط:** بعض الصفحات تستخدم `useLanguage` hook وأخرى تستخدم `react-i18next`

## API Endpoints الرئيسية
- `PUT /api/hr/employees/{id}/leave-rate` - تحديث معدل الإجازة
- `PUT /api/hr/salary-structures/{id}` - تحديث هيكل الراتب
- `GET /api/suppliers` - قائمة الموردين
- `GET /api/centers` - قائمة المراكز
- `GET /api/hr/attendance/report` - تقرير الحضور

## بيانات الاختبار
- Admin: `yasir` / `admin123`
- Test Admin: `testadmin` / `admin123`

## هيكل المشروع
```
/app
├── backend/
│   ├── models/all_models.py   # Pydantic models
│   └── server.py              # Main API server
└── frontend/
    └── src/
        ├── pages/HR.jsx       # HR management
        ├── pages/Suppliers.jsx
        └── components/ui/     # Shadcn components
```

## آخر تحديث: 13 يناير 2026
