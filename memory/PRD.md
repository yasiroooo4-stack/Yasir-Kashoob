# نظام المروج للألبان - PRD

## ملخص المشروع
نظام متكامل لإدارة شركة ألبان يشمل:
- إدارة الموردين والاستلام
- نظام تتبع مواقع الموظفين
- بوابة تسجيل الموردين الجدد
- إدارة الموارد البشرية
- إدارة المخزون والمالية

## الميزات المُنجزة

### ✅ نظام تتبع الموظفين (مكتمل)
- خريطة تفاعلية تعرض مواقع الموظفين باستخدام Leaflet.js
- علامات مخصصة تظهر الاسم ورقم الهوية
- تلوين حسب الحالة (أخضر: داخل النطاق، أحمر: خارج النطاق)
- تنبيهات تلقائية عند خروج الموظف من نطاق العمل

### ✅ بوابة تسجيل الموردين (مكتمل)
- صفحة عامة لتسجيل الموردين الجدد
- دعم ثنائي اللغة (عربي/إنجليزي)
- **إيصال محسّن بعد التسجيل:**
  - رقم الطلب كبير وواضح (SUP-YYYY-XXXX)
  - زر طباعة الإيصال ✅
  - زر نسخ رقم الطلب ✅
- لوحة تحكم للإدارة مع **زر الحذف** لـ:
  - طلبات الأعلاف ✅
  - الرسائل ✅
  - تسجيل الموردين ✅

### ✅ تطبيق الموظفين للتتبع (مكتمل)
- تسجيل دخول برقم الموظف وآخر 4 أرقام من الهاتف
- نظام التقاط صورة الوجه للتحقق
- كود الكاميرا محسّن مع رسائل خطأ واضحة

### ✅ تطبيق الجوال الأصلي (Capacitor) - مُعد
- تم إعداد مشروع Capacitor مع:
  - `@capacitor/core@5.7.4`
  - `@capacitor/android@5.7.4`
  - `@capacitor-community/background-geolocation@1.2.26`
- تم تحديث كود التتبع لدعم Background Geolocation
- تعليمات البناء: `/app/frontend/BUILD_INSTRUCTIONS.md`

## الملفات الرئيسية

### Frontend
```
/app/frontend/src/pages/
├── EmployeeApp.jsx              # تطبيق الموظفين (PWA)
├── MobileTrackingApp.jsx        # تطبيق التتبع (Native)
├── SupplierRegistration.jsx     # تسجيل الموردين
└── SupplierManagement.jsx       # إدارة بوابة الموردين

/app/frontend/src/components/
└── EmployeeTrackingAdmin.jsx    # خريطة التتبع
```

### Backend
```
/app/backend/routes/
├── tracking_routes.py              # APIs التتبع
└── supplier_registration_routes.py # APIs الموردين (مع الحذف)

/app/backend/server.py              # APIs الحذف لطلبات الأعلاف والرسائل
```

## APIs الجديدة (الحذف)
- `DELETE /api/admin/supplier-feed-requests/{id}` - حذف طلب علف
- `DELETE /api/admin/supplier-messages/{id}` - حذف رسالة
- `DELETE /api/supplier-registration/requests/{id}` - حذف طلب تسجيل

## المهام القادمة

### P2 - إشعارات بوابة الموردين (خارجية)
- إرسال إيصال عبر البريد الإلكتروني (Resend)
- إرسال SMS (Twilio)
- **يحتاج:** مفاتيح API من المستخدم

### P3 - تحسين تقارير الحضور
- دمج بيانات الحضور المبني على الموقع في الصفحة الرئيسية

## الاختبارات
- آخر تقرير: `/app/test_reports/iteration_31.json`
- **Backend:** 100% نجاح
- **Frontend:** 100% نجاح

## بيانات الاختبار
- **المستخدم:** testadmin / admin123
- **URL:** https://location-attendance.preview.emergentagent.com

## تاريخ التحديث
- **ديسمبر 2025:**
  - ✅ إصلاح طباعة الإيصال
  - ✅ إضافة زر الحذف في إدارة بوابة الموردين
  - ✅ إعداد Capacitor للتطبيق الأصلي
  - ✅ تكامل Background Geolocation plugin
