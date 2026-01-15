# نظام ERP لمزرعة الألبان - PRD

## نظرة عامة
نظام ERP متكامل لإدارة مزرعة الألبان يشمل:
- إدارة الموردين واستلام الحليب
- إدارة الموارد البشرية والرواتب
- إدارة المبيعات والعملاء
- النظام المالي والخزينة
- **إدارة المستودعات المتكاملة مع النظام المالي**
- **نظام التنبيهات الذكي للمخزون**
- **نظام الموافقة على البدلات الإضافية**

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Languages:** Arabic (primary) + English

## الميزات المُنجزة

### يناير 2026

#### نظام الموافقة على البدلات الإضافية (15 يناير 2026) ✅
- ✅ صفحة جديدة `/extra-pay-approvals` لإدارة طلبات أجر العمل في العطل
- ✅ عرض بطاقات إحصائيات (الإجمالي، المعلق، الموافق، المرفوض)
- ✅ جدول يعرض تفاصيل كل طلب مع أزرار الموافقة/الرفض
- ✅ موافقة جماعية على عدة طلبات
- ✅ فلترة حسب التاريخ والحالة والبحث بالاسم
- ✅ إصلاح خطأ الصلاحيات - السماح للمدير و hr_manager

#### منتقي تاريخ الإجازة في نموذج الخطاب الرسمي (15 يناير 2026) ✅
- ✅ عند اختيار "طلب إجازة" يظهر قسم تحديد فترة الإجازة
- ✅ منتقي تاريخ للبداية والنهاية مع حساب المدة تلقائياً
- ✅ دعم اللغة العربية والإنجليزية في التقويم

#### إعادة تنظيم القائمة الجانبية (15 يناير 2026) ✅
- ✅ إضافة رابط "الموافقة على البدلات" تحت قسم الموارد البشرية
- ✅ حذف الروابط المستقلة: التقارير المتقدمة، إعدادات المظهر، إعدادات الإشعارات، نظام الكاميرات
- ✅ إعادة ترتيب الروابط بشكل منطقي حسب الأقسام
- ✅ القائمة النهائية تحتوي 25 رابط

#### التكامل المالي للمستودعات (14 يناير 2026) ✅
##### القيود اليومية الآلية
- ✅ **استلام البضاعة**: من حـ/ المخزون (1300) إلى حـ/ الدائنون (2100) أو النقدية (1111)
- ✅ **صرف للمبيعات**: من حـ/ تكلفة البضاعة المباعة (5100) إلى حـ/ المخزون (1300)
- ✅ **صرف للاستهلاك**: من حـ/ المصروفات (حسب التصنيف) إلى حـ/ المخزون (1300)

##### ربط تصنيف المخزن بحساب المصروفات
| تصنيف المخزن | رقم الحساب | اسم الحساب |
|------------|-----------|------------|
| أعلاف | 6201 | مصروفات الأعلاف |
| صيانة | 6202 | مصروفات الصيانة |
| مختبر | 6203 | مصروفات المختبر |
| تنظيف | 6204 | مصروفات التنظيف |
| معدات حماية | 6205 | مصروفات معدات الحماية |
| معدات | 6206 | مصروفات المعدات |
| مستلزمات | 6200 | مصروفات المستلزمات |

##### APIs التكامل مع المبيعات
- `GET /api/warehouse/stock/check-availability` - التحقق من توفر الكمية
- `POST /api/warehouse/stock/reserve` - حجز كمية لعملية بيع
- `POST /api/warehouse/stock/release-reservation/{id}` - إلغاء الحجز
- `POST /api/warehouse/stock/issue-from-sale` - صرف مخزون لعملية بيع

##### تقارير التكامل المالي
- `GET /api/warehouse/finance/stock-value-report` - تقرير قيمة المخزون
- `GET /api/warehouse/finance/movements-summary` - ملخص الحركات المالية

#### هيكلة المخازن حسب المراكز (14 يناير 2026) ✅
- ✅ 6 مراكز: زيك، حجيف، غدو، طاقة، ثمريت، مرباط
- ✅ 54 مخزن تم إنشاؤهم تلقائياً (9 لكل مركز)
- ✅ مخزن داخلي: مختبر، صيانة، تنظيف، معدات حماية
- ✅ مخزن خارجي: أعلاف، معدات، مستلزمات موردين

#### نظام التنبيهات الذكي (14 يناير 2026) ✅
- ✅ تنبيهات نقص المخزون وانتهاء الصلاحية
- ✅ إرسال لمشرف المركز + مسؤول المخازن
- ✅ تبويب التنبيهات في صفحة المستودعات

## API Endpoints الجديدة

### البدلات الإضافية
```
GET  /api/hr/attendance/pending-extra-pay           # جلب طلبات البدلات المعلقة
POST /api/hr/attendance/{id}/approve-extra-pay      # الموافقة على طلب
POST /api/hr/attendance/{id}/reject-extra-pay       # رفض طلب
POST /api/hr/attendance/bulk-approve-extra-pay      # الموافقة الجماعية
```

### التكامل المالي
```
POST /api/warehouse/movements/receive  # مع create_journal=true
POST /api/warehouse/movements/issue    # مع issue_type=sales/consumption
GET  /api/warehouse/stock/check-availability
POST /api/warehouse/stock/reserve
POST /api/warehouse/stock/release-reservation/{id}
POST /api/warehouse/stock/issue-from-sale
GET  /api/warehouse/finance/stock-value-report
GET  /api/warehouse/finance/movements-summary
```

### هيكلة المخازن
```
GET  /api/warehouse/centers
GET  /api/warehouse/warehouse-categories
POST /api/warehouse/warehouses/initialize-all
GET  /api/warehouse/warehouses/by-center
```

### التنبيهات
```
GET  /api/warehouse/alerts
GET  /api/warehouse/alerts/summary
POST /api/warehouse/alerts/{id}/resolve
POST /api/warehouse/alerts/check
PUT  /api/warehouse/warehouses/{id}/alert-recipients
```

## المهام المعلقة

### P1 - قيد التنفيذ
- [ ] إصلاح زر التحديث في صفحة الحضور (مبلغ عنه من المستخدم)
- [ ] تكامل SMS للتنبيهات
- [ ] تكامل Email للتنبيهات (إعداد SMTP)
- [ ] إعادة هيكلة server.py

### P2 - قادم
- [ ] تكامل Hikvision للبث المباشر
- [ ] تكامل Ekomilk Scale
- [ ] تكامل WMS مع المبيعات (التحقق من المخزون قبل البيع)

## التغييرات الهيكلية (15 يناير 2026)

### الملفات الجديدة
- ✅ `/app/frontend/src/pages/ExtraPayApprovals.jsx` - صفحة الموافقة على البدلات

### الملفات المعدلة
- ✅ `/app/frontend/src/components/LetterRequestButton.jsx` - إضافة منتقي التاريخ
- ✅ `/app/frontend/src/components/Layout.jsx` - إعادة تنظيم القائمة الجانبية
- ✅ `/app/frontend/src/App.js` - إضافة مسار /extra-pay-approvals
- ✅ `/app/frontend/src/i18n.js` - إضافة الترجمات الجديدة
- ✅ `/app/backend/server.py` - إصلاح فحص الصلاحيات في APIs البدلات

### الروابط المحذوفة من القائمة الجانبية
- /advanced-reports (تم دمجه مع التقارير)
- /settings (إعدادات المظهر - تم نقلها لإعدادات النظام)
- /notification-settings (تم نقلها لإعدادات النظام)
- /cctv (نظام الكاميرات - تم نقله لإعدادات النظام)

### الصلاحيات
- ✅ المسؤول (yasir) يتحكم في منح الصلاحيات
- ✅ admin و hr_manager يمكنهم الموافقة على البدلات الإضافية

## بيانات الاختبار
- Admin: `yasir` / `admin123`
- عدد طلبات البدلات المعلقة: ~130

## نتائج الاختبارات
- ✅ **100%** Backend tests passed (7/7 tests)
- ✅ **100%** Frontend tests passed
- ✅ iteration_14.json - الموافقة على البدلات، منتقي التاريخ، إعادة تنظيم القائمة

## آخر تحديث: 15 يناير 2026
