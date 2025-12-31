# ZKTeco Fingerprint Sync Agent
# برنامج مزامنة أجهزة البصمة ZKTeco

## نظرة عامة
هذا البرنامج يقوم بقراءة بيانات الحضور من أجهزة البصمة ZKTeco وإرسالها تلقائياً إلى نظام ERP.

## المتطلبات
- Python 3.8+
- مكتبة requests
- أداة mdb-export (mdbtools على Linux)

### تثبيت المتطلبات على Windows:
```bash
pip install requests
# تحميل mdbtools من: https://github.com/mdbtools/mdbtools
```

### تثبيت المتطلبات على Linux:
```bash
pip install requests
sudo apt-get install mdbtools
```

## الإعداد

### 1. إنشاء ملف التكوين
```bash
python sync_agent.py --create-config
```
سيتم إنشاء ملف `config_sample.json`. قم بتعديله وحفظه باسم `config.json`.

### 2. تعديل ملف التكوين
```json
{
  "api_url": "https://your-erp-url.com",
  "username": "your_username",
  "password": "your_password",
  "sync_interval": 3600,
  "mdb_paths": [
    "C:/ZKTeco/att2000.mdb"
  ]
}
```

## الاستخدام

### مزامنة ملف واحد
```bash
python sync_agent.py --mdb C:/ZKTeco/att2000.mdb -u yasir -p password123
```

### مزامنة باستخدام ملف التكوين
```bash
python sync_agent.py --config config.json
```

### تشغيل كخدمة مستمرة (Daemon)
```bash
python sync_agent.py --daemon --config config.json
```

## جدولة التشغيل التلقائي

### على Windows (Task Scheduler):
1. افتح Task Scheduler
2. أنشئ مهمة جديدة
3. حدد المشغل (Trigger): كل ساعة
4. حدد الإجراء (Action): تشغيل البرنامج
   - Program: `python`
   - Arguments: `C:\path\to\sync_agent.py --config C:\path\to\config.json`

### على Linux (Cron):
```bash
# تعديل crontab
crontab -e

# إضافة هذا السطر للتشغيل كل ساعة
0 * * * * /usr/bin/python3 /path/to/sync_agent.py --config /path/to/config.json
```

## سجلات التشغيل
يتم حفظ سجلات التشغيل في ملف `sync_agent.log` في نفس مجلد البرنامج.

## استكشاف الأخطاء

### خطأ: الملف غير موجود
تأكد من صحة مسار ملف MDB في ملف التكوين.

### خطأ: فشل تسجيل الدخول
تحقق من صحة اسم المستخدم وكلمة المرور وعنوان API.

### خطأ: فشل قراءة ملف MDB
تأكد من تثبيت mdbtools وأن الملف ليس مقفلاً.

## الدعم
للمساعدة، تواصل مع فريق الدعم الفني.
