# نظام ERP مركز تجميع الحليب - المروج للألبان

## المشكلة الأصلية
نظام ERP شامل لمركز تجميع الحليب (المروج للألبان)

---

## ✅ ما تم إنجازه في هذه الجلسة (7 يناير 2026 - الجزء 2)

### 11. إضافة سجل حضور للموظف 202116 ✅ 🆕 (P0)
- الموظف: Mohammed Ahmed Salim Qatan
- التاريخ: 2026-01-07 الساعة 08:52
- الموقع: المدخل الرئيسي
- تم إضافة السجل يدوياً في قاعدة البيانات

### 12. إضافة حقل "الرأي القانوني" للقضايا ✅ 🆕 (P0)
- إضافة حقل `legal_opinion` في نموذج القضايا (`caseForm`)
- يظهر في نافذة إضافة/تعديل القضية
- نص توضيحي: "أدخل الرأي القانوني للقضية..."

### 13. تصدير التقارير المالية بصيغة Excel و PDF ✅ 🆕 (P1)
- **أزرار تصدير رئيسية:**
  - زر "تصدير الكل Excel" - يصدر جميع التقارير في ملف واحد
  - زر "تصدير PDF" - يصدر تقرير شامل بصيغة PDF
- **أزرار تصدير فردية لكل تقرير:**
  - ميزان المراجعة → Excel
  - قائمة الدخل → Excel
  - الميزانية العمومية → Excel
- **أزرار تصدير في الأقسام الأخرى:**
  - شجرة الحسابات → Excel
  - القيود المحاسبية → Excel
- **المكتبات المستخدمة:** xlsx, jspdf, jspdf-autotable

### 14. تحسين إعدادات نظام الكاميرات CCTV ✅ 🆕 (P1)
- **زر "تحديث تلقائي"** - يملأ رابط النظام و API Key تلقائياً
- **قسم "ربط نظام الألبان"** بتصميم محسّن:
  - رابط نظام الألبان: `https://dairy-erp-1.preview.emergentagent.com`
  - API Key: `sk-emergent-57a636238E2E8C04f1`
  - زر إظهار/إخفاء كلمة المرور
- **زر "اختبار الاتصال"** مع أيقونة WiFi
- **خيارات محسّنة:** المزامنة التلقائية، كشف الحركة، بريد التنبيهات، مدة الاحتفاظ

### 15. نظام Hik-Connect الكامل ✅ 🆕 (P0)
- **Backend APIs الجديدة (`/app/backend/routes/hikconnect_routes.py`):**
  - `POST /api/hikconnect/devices/connect` - إضافة جهاز NVR/DVR جديد
  - `GET /api/hikconnect/devices` - عرض جميع الأجهزة
  - `DELETE /api/hikconnect/devices/{id}` - حذف جهاز
  - `POST /api/hikconnect/devices/{id}/refresh` - تحديث حالة الجهاز
  - `GET /api/hikconnect/devices/{id}/channels` - عرض القنوات
  - `POST /api/hikconnect/stream/info` - معلومات البث (RTSP URLs)
  - `GET /api/hikconnect/stream/snapshot/{device_id}/{channel}` - لقطة مباشرة
  - `POST /api/hikconnect/playback/search` - البحث في التسجيلات
  - `POST /api/hikconnect/playback/url` - رابط تشغيل التسجيل
  - `GET /api/hikconnect/events` - أحداث كشف الحركة
  - `POST /api/hikconnect/ptz/{device_id}/{channel}` - التحكم في PTZ
  - `GET /api/hikconnect/dashboard` - إحصائيات لوحة التحكم

- **واجهة المستخدم الجديدة:**
  - تبويب "Hik-Connect" بتصميم احترافي (أحمر/برتقالي)
  - Header مع إحصائيات سريعة (الأجهزة، المتصلة، الكاميرات)
  - شبكة عرض الكاميرات على نمط تطبيق Hik-Connect
  - نافذة إضافة جهاز جديد مع جميع الإعدادات
  - أزرار التسجيلات والتصدير لكل جهاز
  - عرض لقطات مباشرة من الكاميرات

- **الميزات المدعومة:**
  - ✅ البث المباشر (RTSP)
  - ✅ مشاهدة التسجيلات (Playback)
  - ✅ تنبيهات كشف الحركة
  - ✅ تصدير مقاطع الفيديو
  - ✅ التحكم في PTZ
  - ✅ إدارة متعددة الأجهزة

---

## ✅ ما تم إنجازه سابقاً (7 يناير 2026 - الجزء 1)

### 1. إصلاح حفظ أسعار الحليب ✅ (P0)
- إنشاء API جديد: `GET/POST /api/settings/milk-prices`
- ربط دالة `savePrice` في SystemSettings.jsx بالـ backend
- الآن يتم حفظ الأسعار بشكل دائم في قاعدة البيانات

### 2. إضافة زر تحديث لتقرير الحضور ✅ 🆕 (P0)
- زر "تحديث" في صفحة HR تبويب الحضور
- `data-testid="refresh-attendance-btn"`

### 3. تحديث تخطيط صفحة CCTV ✅ 🆕 (P0)
- 5 خانات منفصلة للكاميرات (grid layout)
- كل خانة تعرض: رقم، اسم الكاميرا، حالة الاتصال، معاينة البث
- إمكانية إضافة كاميرات إضافية بعد الـ 5 الأولى

### 4. إصلاح صفحة إعدادات المظهر ✅ 🆕 (P0)
- إضافة route `/settings` في App.js
- تبويب "المظهر" يعمل مع 8 ثيمات
- خيار الوضع الليلي

### 5. تكامل Hikvision CCTV ✅ 🆕 (P1)
- نافذة تسجيل دخول Hikvision (عنوان الخادم، اسم المستخدم، كلمة المرور)
- اكتشاف الأجهزة والكاميرات تلقائياً
- عرض الأجهزة المكتشفة مع إمكانية إضافتها للنظام
- APIs: `/api/cctv/hikvision/connect`, `/api/cctv/hikvision/disconnect`, `/api/cctv/hikvision/devices`

### 6. إضافة سعر حليب الأغنام ✅ 🆕 (P0)
- إضافة "حليب الأغنام" للأسعار الافتراضية (0.300 ريال/لتر)

### 7. مسح بصمات الموظف EMP202126 ✅ 🆕 (P0)
- حذف 53 سجل حضور للموظف Ali Ben Mubarak
- مسح معرف البصمة (202126)
- إضافة APIs: `DELETE /api/hr/attendance/employee/{id}/all`, `PUT /api/hr/employees/{id}/clear-fingerprint`

### 8. واجهة عرض أجهزة Hikvision المحسّنة ✅ 🆕 (P1)
- عرض جميع الأجهزة المرتبطة بحساب Hikvision (مثل Hik-Connect)
- معاينة مصغرة مع مؤشر LIVE
- أزرار: بث مباشر | التسجيلات | الأحداث | الإعدادات
- دعم NVR مع عرض الكاميرات الفرعية

### 9. نافذة البث المباشر ✅ 🆕 (P1)
- نافذة dialog للبث المباشر
- عرض معلومات الجهاز (الاسم، IP، الحالة)
- رابط RTSP للمشاهدة

### 10. إعدادات كشف الأحداث والتنبيهات ✅ 🆕 (P1)
- تبويب جديد "كشف الأحداث"
- أنواع الكشف: حركة، تسلل، عبور خط، وجوه
- إعدادات الإشعارات: فورية، SMS، بريد إلكتروني
- APIs: `GET/PUT /api/cctv/event-settings`, `POST /api/cctv/events/notify`

---

## ✅ ما تم إنجازه سابقاً (6 يناير 2026)

### 1. إعادة هيكلة الكود ✅ (P1 - Critical)
- **تقليل حجم server.py** من 12,737 سطر إلى ~11,200 سطر
- **استخراج النماذج** (~100 نموذج) إلى `/app/backend/models/all_models.py`
- **إنشاء ملفات تكوين منفصلة:**
  - `database.py` - اتصال MongoDB
  - `config.py` - إعدادات التطبيق
  - `routes/base.py` - أدوات المصادقة المشتركة
  - `utils/helpers.py` - الأدوات المساعدة
- **تنظيف الكود:**
  - حذف `/app/mobile-app` المهجور
  - حذف الملفات المؤقتة
  - توثيق الهيكل الجديد في `REFACTORING_PLAN.md`

### 2. تحسين وحدة الرواتب (P2) ✅
- 9 أنواع بدلات مفصلة
- صفحة `/salary-structures`

### 3. ربط النظام المالي بالشراء/المبيعات ✅
- قيود محاسبية آلية

### 4. منطق العطل الرسمية ✅
- أجر مضاعف للعمل في العطل

### 5. التقارير المتقدمة ✅
- مقارنة الرواتب الشهرية
- التقرير المالي الشهري
- أداء المراكز
- تنبيهات المخزون

### 6. تكامل SMS مع Tamimah ✅
- إرسال رسائل نصية عبر Tamimah SMS (عُمان)
- API قابل للتخصيص
- معالجة أخطاء محسنة مع رسائل واضحة

### 7. جدولة التقارير التلقائية ✅
- 4 أنواع تقارير: يومي، أسبوعي، شهري، تنبيهات المخزون
- إرسال تلقائي بالبريد الإلكتروني
- تشغيل يدوي للتقارير

---

## الهيكل الجديد للكود

```
/app/backend/
├── server.py              # الخادم الرئيسي (~11,200 سطر)
├── config.py              # ✅ إعدادات التطبيق
├── database.py            # ✅ اتصال قاعدة البيانات
├── REFACTORING_PLAN.md    # ✅ توثيق إعادة الهيكلة
│
├── models/
│   ├── __init__.py
│   └── all_models.py      # ✅ جميع نماذج Pydantic (~1,500 سطر)
│
├── utils/
│   ├── __init__.py
│   └── helpers.py         # ✅ الأدوات المساعدة
│
└── routes/
    ├── __init__.py
    ├── base.py            # ✅ أدوات المصادقة المشتركة
    └── ...                # قوالب جاهزة للتقسيم المستقبلي
```

---

## الروابط الرئيسية
| الصفحة | الرابط |
|--------|--------|
| لوحة التحكم | `/dashboard` |
| النظام المالي | `/finance-system` |
| هيكل الرواتب | `/salary-structures` |
| التقارير المتقدمة | `/advanced-reports` |
| إعدادات الإشعارات | `/notification-settings` |
| تطبيق الموردين PWA | `/supplier-app` |

---

## إعدادات مطلوبة

### إعدادات SMS (Tamimah):
من خلال صفحة `/notification-settings` أو `.env`:
```
SMS_API_URL=https://api.tamimahsms.com/send
SMS_USERNAME=your_username
SMS_PASSWORD=your_password
SMS_SENDER_ID=MAROOJ
```

### إعدادات البريد (SMTP):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## المهام المتبقية

### 🔴 P0 - عاجل:
- [x] إصلاح حفظ سعر الحليب ✅ (7 يناير 2026)
- [x] إضافة زر تحديث للحضور ✅ (7 يناير 2026)
- [x] تحديث تخطيط CCTV ✅ (7 يناير 2026)
- [x] إصلاح صفحة المظهر ✅ (7 يناير 2026)
- [x] إضافة سعر حليب الأغنام ✅ (7 يناير 2026)
- [x] مسح بصمات الموظف EMP202126 ✅ (7 يناير 2026)

### 🟠 P1 - مهم:
- [x] إعادة هيكلة `server.py` ✅ (تم جزئياً - النماذج)
- [x] تكامل Hikvision CCTV ✅ (7 يناير 2026) - نافذة تسجيل دخول واكتشاف الأجهزة
- [x] واجهة عرض أجهزة Hikvision المحسّنة ✅ (7 يناير 2026)
- [x] البث المباشر من Hikvision ✅ (7 يناير 2026)
- [x] إعدادات كشف الأحداث والتنبيهات ✅ (7 يناير 2026)
- [ ] **Ekomilk RS232:** تكامل ميزان الحليب
- [ ] إعادة هيكلة `HR.jsx` (ديون تقنية)
- [ ] نقل routes من server.py إلى مجلدات منفصلة

### 🔵 P2 - تحسينات:
- [ ] كاميرا AI لمسح QR
- [ ] تحسين واجهة التقارير
- [ ] إضافة تسجيل فيديو فعلي من الكاميرات
- [ ] ربط إشعارات CCTV مع SMS

---

## بيانات الاختبار
- **Admin:** yasir / admin123
- **HR:** hassan / Hassan@123
- **مورد:** 1108 / 0000

---

## نتائج الاختبارات

### iteration_7.json ✅ (7 يناير 2026)
- **Frontend:** 100% (4/4 ميزات)
- **الميزات:** حفظ أسعار الحليب، زر تحديث الحضور، 5 خانات CCTV، صفحة المظهر

### iteration_6.json ✅
- **Backend:** 100% (26/26 اختبار)
- بعد إعادة هيكلة النماذج

### iteration_5.json ✅
- **Backend:** 100% (19/19 اختبار)
- **Frontend:** 100%
- **الميزات:** SMS, جدولة التقارير

### iteration_4.json ✅
- التقارير المتقدمة

### iteration_3.json ✅
- هيكل الرواتب والبدلات

---

## APIs الجديدة

### SMS:
```
GET  /api/sms/settings
POST /api/sms/settings
POST /api/sms/send
POST /api/sms/send-otp
GET  /api/sms/logs
```

### جدولة التقارير:
```
GET    /api/reports/schedules
POST   /api/reports/schedules
PUT    /api/reports/schedules/{id}
DELETE /api/reports/schedules/{id}
POST   /api/reports/schedules/{id}/run
GET    /api/reports/logs
```

### التقارير المتقدمة:
```
GET  /api/reports/payroll/comparison
GET  /api/reports/financial/monthly
GET  /api/reports/centers/performance
GET  /api/reports/inventory/alerts
```

### أسعار الحليب (جديد):
```
GET  /api/settings/milk-prices
POST /api/settings/milk-prices
```

### إدارة الحضور والبصمات:
```
DELETE /api/hr/attendance/employee/{id}/all  # حذف جميع سجلات حضور موظف
PUT    /api/hr/employees/{id}/clear-fingerprint  # مسح بصمة موظف
```

### Hikvision CCTV (جديد):
```
GET  /api/cctv/hikvision/config
POST /api/cctv/hikvision/connect
POST /api/cctv/hikvision/disconnect
GET  /api/cctv/hikvision/devices
GET  /api/cctv/hikvision/stream/{device_id}
GET  /api/cctv/event-settings
PUT  /api/cctv/event-settings
POST /api/cctv/events/notify
```

---

## الصفحات الرئيسية
| الصفحة | الرابط | الوصف |
|--------|--------|-------|
| لوحة التحكم | `/dashboard` | الصفحة الرئيسية |
| إعدادات المظهر | `/settings` | تغيير الثيمات والوضع الليلي |
| إعدادات النظام | `/system-settings` | المراكز، الأسعار، الأعلاف |
| نظام CCTV | `/cctv` | 5 خانات كاميرات |
| الموارد البشرية | `/hr` | الموظفين والحضور |
