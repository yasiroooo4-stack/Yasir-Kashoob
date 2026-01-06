# نظام ERP مركز تجميع الحليب - المروج للألبان

## المشكلة الأصلية
نظام ERP شامل لمركز تجميع الحليب (المروج للألبان)

---

## ✅ تطبيق الموبايل للموردين (PWA) - جاهز للاستخدام!

### 🔗 الرابط:
```
https://dairy-collection.preview.emergentagent.com/supplier-app
```

### كيفية إضافته للشاشة الرئيسية على الهاتف:

#### Android:
1. افتح الرابط في Chrome
2. اضغط على قائمة (⋮) 
3. اختر "إضافة إلى الشاشة الرئيسية"

#### iPhone:
1. افتح الرابط في Safari
2. اضغط على زر المشاركة (⬆️)
3. اختر "إضافة إلى الشاشة الرئيسية"

### الميزات:
1. **تسجيل الدخول** - بكود المورد + 0000
2. **لوحة التحكم** - الرصيد، التوريدات، الخدمات
3. **طلب أعلاف** - اختيار النوع والكمية
4. **سجل التوريدات** - عرض جميع التوريدات
5. **إرسال رسالة** - التواصل مع الإدارة
6. **الإعدادات** - تغيير كلمة المرور

---

## ✅ النظام المالي الشامل (P1) - تم الإنجاز! 🆕

### تاريخ الإنجاز: 6 يناير 2026

### الميزات المنفذة:

#### 1. شجرة الحسابات (Chart of Accounts)
- 35+ حساب افتراضي مهيأ
- أنواع الحسابات: أصول، خصوم، حقوق ملكية، إيرادات، مصروفات
- إمكانية إضافة حسابات جديدة

#### 2. القيود اليومية (Journal Entries)
- إنشاء قيود متوازنة (مدين = دائن)
- ترحيل القيود إلى الحسابات
- التحقق التلقائي من التوازن

#### 3. الأصول الثابتة (Fixed Assets)
- تسجيل الأصول مع ترقيم تلقائي (FA-XXXX)
- تصنيفات: مباني، معدات، سيارات، أثاث، كمبيوترات
- حساب الإهلاك (straight-line)
- تتبع العمر الإنتاجي وقيمة الخردة

#### 4. الميزانيات (Budgets)
- إنشاء ميزانيات سنوية
- مقارنة المخطط بالفعلي

#### 5. التقارير المالية
- **ميزان المراجعة** - التحقق من توازن الحسابات
- **قائمة الدخل** - الإيرادات والمصروفات وصافي الدخل
- **الميزانية العمومية** - الأصول والخصوم وحقوق الملكية

#### 6. الحسابات الدائنة/المدينة
- تتبع مستحقات الموردين (AP)
- تتبع مستحقات العملاء (AR)

### الوصول:
- الرابط: `/finance-system`
- الصلاحيات: Admin, Accountant, Finance Department

---

## ما تم تنفيذه سابقاً

### ✅ الميزات المُنفذة:
- رسالة ترحيب كبيرة مع الشعار
- صفحة جدولة الموظفين `/employee-scheduling`
- نقل المورد لمركز آخر (يحتاج موافقة المدير)
- إصلاح استيراد ZKTeco
- دمج منطق الإجازات في الرواتب
- تحسين صفحة إدارة الموردين
- كلمة مرور 0000 لجميع الموردين
- نظام موافقة المدير
- **تطبيق PWA للموردين**

---

## المهام المتبقية

### 🟡 P2 - تحسين وحدة الرواتب:
- [ ] إضافة حقول البدلات
- [ ] الراتب الأساسي المفصل
- [ ] مكونات الراتب الأخرى

### 🔵 مهام مستقبلية:
- [ ] إعادة هيكلة `server.py` و `HR.jsx` (ديون تقنية)
- [ ] إشعارات Push
- [ ] ربط موازين Ekomilk عبر RS232
- [ ] تصدير التقارير إلى Excel
- [ ] كاميرا AI لمسح QR
- [ ] تفعيل SMS لاستعادة كلمة المرور (يحتاج مزود SMS مثل Twilio)

---

## بيانات الاختبار
- **Admin:** yasir / admin123
- **HR:** hassan / Hassan@123
- **مورد:** 1108 / 0000

## الروابط
- **لوحة التحكم:** `/dashboard`
- **النظام المالي:** `/finance-system` ⭐ 🆕
- **المالية (المدفوعات):** `/finance`
- **تطبيق الموردين (PWA):** `/supplier-app` ⭐
- **بوابة الموردين (الويب):** `/supplier-portal`

---

## البنية التقنية

### Backend APIs المالية:
```
GET    /api/finance/accounts
POST   /api/finance/accounts
POST   /api/finance/accounts/initialize
PUT    /api/finance/accounts/{id}

GET    /api/finance/journal-entries
POST   /api/finance/journal-entries
PUT    /api/finance/journal-entries/{id}/post

GET    /api/finance/fixed-assets
POST   /api/finance/fixed-assets
POST   /api/finance/fixed-assets/calculate-depreciation

GET    /api/finance/budgets
POST   /api/finance/budgets

GET    /api/finance/accounts-payable
GET    /api/finance/accounts-payable/summary
GET    /api/finance/accounts-receivable
GET    /api/finance/accounts-receivable/summary

GET    /api/finance/reports/trial-balance
GET    /api/finance/reports/income-statement
GET    /api/finance/reports/balance-sheet

GET    /api/finance/dashboard
```

### الملفات الرئيسية:
- `/app/backend/server.py` - Backend APIs
- `/app/frontend/src/pages/FinanceSystem.jsx` - واجهة النظام المالي
- `/app/frontend/src/pages/Finance.jsx` - صفحة المدفوعات
- `/app/frontend/src/pages/SupplierApp.jsx` - تطبيق الموردين PWA
