# نظام ERP مركز تجميع الحليب - المروج للألبان

## المشكلة الأصلية
نظام ERP شامل لمركز تجميع الحليب (المروج للألبان)

---

## ✅ ما تم إنجازه في هذه الجلسة (6 يناير 2026)

### 1. P2: تحسين وحدة الرواتب ✅
- 9 أنواع بدلات مفصلة (سكن، نقل، طعام، هاتف، وقود، تعليم، طبي، خاص، أخرى)
- صفحة `/salary-structures` لإدارة هياكل الرواتب

### 2. ربط النظام المالي بالشراء/المبيعات ✅
- قيود محاسبية آلية عند استلام الحليب والبيع
- الحسابات: 5100 (مشتريات)، 2110 (موردين)، 1111 (صندوق)، 1120 (عملاء)، 4100 (إيرادات)

### 3. منطق العطل الرسمية ✅
- نظام إدارة العطل الرسمية
- أجر مضاعف للعمل في العطل (2x) والإجازات الأسبوعية (1.5x)

### 4. تقارير مقارنة الرواتب الشهرية ✅ 🆕
- مقارنة بين فترتين
- عرض التغييرات في الراتب والبدلات والخصومات
- إحصائيات: زيادة، نقص، ثابت، جديد، محذوف

### 5. تقارير مالية وتشغيلية مفصلة ✅ 🆕
- التقرير المالي الشهري (إيرادات، مصروفات، ربحية)
- تقرير أداء مراكز التجميع مع الترتيب

### 6. تنبيهات المخزون المنخفض ✅ 🆕
- كشف المخزون المنخفض تلقائياً
- مستويات: حرج (critical) وتحذيري (warning)
- إرسال التنبيهات بالبريد الإلكتروني

---

## الروابط الجديدة
- **التقارير المتقدمة:** `/advanced-reports` 🆕
- **هيكل الرواتب:** `/salary-structures`
- **النظام المالي:** `/finance-system`
- **تطبيق الموردين (PWA):** `/supplier-app`

---

## المهام المتبقية

### 🔵 تحتاج موارد/توضيح:
- [ ] تفعيل SMS (مزود محلي عُماني) - يحتاج اسم المزود
- [ ] ربط موازين Ekomilk عبر RS232 - يحتاج دليل الاتصال (Protocol documentation)

### ⚠️ ديون تقنية:
- [ ] إعادة هيكلة `server.py` (أصبح كبيراً جداً)
- [ ] إعادة هيكلة `HR.jsx`

---

## بيانات الاختبار
- **Admin:** yasir / admin123
- **HR:** hassan / Hassan@123
- **مورد:** 1108 / 0000

---

## نتائج الاختبارات الأخيرة

### iteration_4.json (6 يناير 2026)
- **Backend:** 100% (14/15 اختبار)
- **Frontend:** 100%
- **الميزات:** 
  - مقارنة الرواتب ✅
  - التقرير المالي الشهري ✅
  - أداء المراكز ✅
  - تنبيهات المخزون ✅

### iteration_3.json
- هيكل الرواتب والبدلات ✅
- العطل الرسمية ✅
- القيود المحاسبية الآلية ✅

---

## APIs الجديدة

### التقارير المتقدمة:
```
GET  /api/reports/payroll/comparison?period1_id=X&period2_id=Y
GET  /api/reports/financial/monthly?year=2026&month=1
GET  /api/reports/centers/performance
GET  /api/reports/inventory/alerts
POST /api/reports/inventory/set-threshold
POST /api/reports/inventory/send-alerts
GET  /api/notifications/settings
POST /api/notifications/settings
```

### هيكل الرواتب:
```
GET  /api/hr/salary-structures
GET  /api/hr/salary-structures/{employee_id}
POST /api/hr/salary-structures
```

### العطل الرسمية:
```
GET    /api/hr/public-holidays
POST   /api/hr/public-holidays
DELETE /api/hr/public-holidays/{id}
```

---

## إعدادات البريد الإلكتروني (SMTP)

لتفعيل إرسال تنبيهات المخزون بالبريد، أضف في `/app/backend/.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```
