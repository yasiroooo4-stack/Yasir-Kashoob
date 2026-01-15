# نظام ERP لمزرعة الألبان - PRD

## نظرة عامة
نظام ERP متكامل لإدارة مزرعة الألبان يشمل:
- إدارة الموردين واستلام الحليب
- إدارة الموارد البشرية والرواتب
- إدارة المبيعات والعملاء
- النظام المالي والخزينة
- إدارة المستودعات المتكاملة
- نظام التنبيهات الذكي
- نظام الموافقة على البدلات الإضافية

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Languages:** Arabic (primary) + English

## الميزات المُنجزة

### 15 يناير 2026 - الجزء الثالث

#### استيراد بيانات Ekomilk من المراكز ✅
تم تحديث API `/api/milk-receptions/import` لدعم ملفات Ekomilk:

**دعم الأعمدة الجديدة:**
| عمود Ekomilk | الحقل الداخلي |
|-------------|--------------|
| M. Code | supplier_code |
| M. Name | supplier_name |
| Qty(Ltr.) | quantity_liters |
| Fat % | fat_percentage |
| RTPL | price_per_liter |
| Amount (OMR) | total_amount |
| Date | reception_date |
| Shift | shift |
| Milk Type | milk_type |
| SNF % | snf_percentage |
| CLR | clr |
| Water(%) | water_content |
| Protein | protein_percentage |
| Density | density |
| Lactose | lactose |

**الميزات:**
- ✅ دعم ملفات `.xls` القديمة باستخدام xlrd
- ✅ دعم ملفات `.xlsx` و `.csv`
- ✅ تحويل صيغة التاريخ `dd/mm/yyyy` → ISO
- ✅ تحويل نوع الحليب (Camel → camel, Cow → cow)
- ✅ إنشاء موردين جدد تلقائياً
- ✅ حفظ كود المورد `M. Code`
- ✅ نتيجة الاختبار: 1082 سجل، 187 مورد جديد، 0 أخطاء

#### تحسين منطق الإجازة في الرواتب ✅
عند الموافقة على طلب إجازة:
- ✅ تحديث سجلات الحضور من `absent` إلى `leave`
- ✅ خصم أيام الإجازة من رصيد الموظف `leave_balance`
- ✅ احتساب أيام الإجازة كأيام حضور مدفوعة (لا خصم من الراتب)

**حالة `leave` في حساب الرواتب:**
```python
elif status == "leave":
    leave_type = attendance.get("leave_type", "annual")
    if leave_type in ["annual", "سنوية"]:
        annual_leave += 1  # تُحسب ضمن total_pay_days
    elif leave_type in ["sick", "مرضية"]:
        sick_leave += 1
    # ... إلخ
```

### 15 يناير 2026 - الجزء الثاني

#### صفحة تسجيل الدخول الجديدة ✅
- شعار Almorooj Dairy المتحرك
- خلفية خضراء متدرجة

#### إعدادات الحساب في Header ✅
- تعديل الملف الشخصي
- تغيير كلمة المرور
- تغيير الخلفية

### 15 يناير 2026 - الجزء الأول

#### دمج الصفحات في تبويبات ✅
- صفحة التقارير: 6 تبويبات مع "متقدمة"
- إعدادات النظام: 7 تبويبات

#### نظام الموافقة على البدلات الإضافية ✅
- صفحة `/extra-pay-approvals`

## API Endpoints المحدثة

### استيراد Ekomilk
```
POST /api/milk-receptions/import
Content-Type: multipart/form-data

Supports:
- .xls (Ekomilk old format via xlrd)
- .xlsx (modern Excel)
- .csv

Response:
{
  "success": true,
  "message": "تم استيراد 1082 سجل بنجاح وإنشاء 187 مورد جديد",
  "imported_count": 1082,
  "new_suppliers_count": 187,
  "errors_count": 0,
  "skipped_count": 0
}
```

### الموافقة على الإجازة (محدث)
```
PUT /api/hr/leave-requests/{request_id}/approve

Effects:
1. Updates leave request status to "approved"
2. Updates attendance records: absent → leave
3. Deducts days from employee leave_balance
4. Creates leave_balance_log entry
```

## منطق حساب الرواتب

### حالات الحضور وكيفية احتسابها:
| الحالة | الوصف | يُحتسب ضمن |
|--------|-------|-----------|
| present | حضور عادي | working_days |
| leave | إجازة معتمدة | annual_leave/sick_leave/etc |
| absent | غياب | absent_days (يُخصم) |
| sick_leave | إجازة مرضية | sick_leave (لا يُخصم) |
| annual_leave | إجازة سنوية | annual_leave (لا يُخصم) |
| off/weekend | يوم راحة | day_off (لا يُخصم) |

### الصيغة:
```
total_pay_days = working_days + day_off + sick_leave + annual_leave + 
                 public_holiday + emergency_leave + ...
gross_salary = daily_rate × total_pay_days
absence_deduction = daily_rate × absent_days × ABSENCE_FACTOR
net_salary = gross_salary - absence_deduction
```

## المهام المعلقة

### P1 - قيد التنفيذ
- [ ] إصلاح زر التحديث في صفحة الحضور
- [ ] تكامل SMS للتنبيهات
- [ ] إعادة هيكلة server.py

### P2 - قادم
- [ ] تكامل Hikvision للبث المباشر
- [ ] تكامل Ekomilk Scale عبر RS232

## بيانات الاختبار
- Admin: `yasir` / `admin123`
- ملف اختبار Ekomilk: `/tmp/milk_data.xls`

## نتائج الاختبارات
- ✅ **100%** iteration_14.json - الموافقة على البدلات
- ✅ **100%** iteration_15.json - دمج الصفحات
- ✅ **100%** iteration_16.json - صفحة الدخول، إعدادات الحساب
- ✅ **93%** iteration_17.json - استيراد Ekomilk، منطق الإجازة

## آخر تحديث: 15 يناير 2026
