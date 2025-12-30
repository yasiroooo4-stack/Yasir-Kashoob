# 🚀 دليل نشر نظام ERP لمركز تجميع الحليب

## متطلبات النظام

- Ubuntu 20.04+ أو CentOS 7+
- Python 3.9+
- Node.js 18+
- MongoDB 5+
- 4GB RAM (الحد الأدنى)
- 20GB مساحة تخزين

---

## التثبيت السريع

### 1. تشغيل سكربت التثبيت التلقائي

```bash
chmod +x install.sh
./install.sh
```

### 2. أو التثبيت اليدوي

#### أ. تثبيت MongoDB

```bash
# Ubuntu
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### ب. تثبيت Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### ج. تثبيت Frontend

```bash
cd frontend
yarn install
yarn build
```

---

## إعداد ملفات البيئة

### Backend (.env)

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=milk_erp
JWT_SECRET=your-super-secret-key-change-this
```

### Frontend (.env)

```env
REACT_APP_BACKEND_URL=http://YOUR_SERVER_IP:8001
```

---

## تشغيل النظام

### للتطوير

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 - Frontend
cd frontend
yarn start
```

### للإنتاج

```bash
# Backend
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4

# Frontend (بناء ثم خدمة عبر nginx)
cd frontend
yarn build
```

---

## إعداد Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/milk-erp/frontend/build;
        try_files $uri /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## إعداد Systemd Services

### Backend Service

```bash
sudo nano /etc/systemd/system/milk-backend.service
```

```ini
[Unit]
Description=Milk ERP Backend API
After=network.target mongod.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/milk-erp/backend
Environment="PATH=/var/www/milk-erp/backend/venv/bin"
ExecStart=/var/www/milk-erp/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable milk-backend
sudo systemctl start milk-backend
```

---

## أجهزة البصمة ZKTeco

### الأجهزة المُعدة

| الجهاز | IP | Port | Login ID | Password |
|--------|-----|------|----------|----------|
| جهاز 1 | 192.168.100.201 | 80 | 9 | 1234 |
| جهاز 2 | 192.168.100.214 | 80 | 9 | 1234 |

### اختبار الاتصال

```bash
curl -v http://192.168.100.201/csl/login
curl -v http://192.168.100.214/csl/login
```

### ملاحظات هامة

- يجب أن يكون السيرفر على نفس الشبكة المحلية (192.168.100.x)
- تأكد من فتح المنافذ في الـ Firewall
- جهاز البصمة يجب أن يكون متصلاً بالشبكة

---

## بيانات الدخول الافتراضية

| المستخدم | كلمة المرور | الدور | القسم |
|----------|-------------|-------|-------|
| yasir | admin123 | admin | IT |
| emp0002 | ahmed123 | employee | المشتريات |
| salim | salim123 | accountant | المالية |
| said | said123 | employee | استلام الحليب |

---

## المراكز المُسجلة

| المركز | الكود |
|--------|-------|
| حجيف | HAJIF |
| زيك | ZEEK |
| غدو | GHADU |
| المركز الإداري | ADMIN |

---

## استكشاف الأخطاء

### Backend لا يعمل

```bash
# تحقق من السجلات
sudo journalctl -u milk-backend -f

# تحقق من MongoDB
sudo systemctl status mongod
```

### لا يمكن الاتصال بجهاز البصمة

```bash
# تحقق من الشبكة
ping 192.168.100.201

# تحقق من المنفذ
nc -zv 192.168.100.201 80
```

### مشاكل الصلاحيات

```bash
# إعطاء صلاحيات للمجلد
sudo chown -R www-data:www-data /var/www/milk-erp
```

---

## النسخ الاحتياطي

### نسخ قاعدة البيانات

```bash
# إنشاء نسخة
mongodump --db milk_erp --out /backup/$(date +%Y%m%d)

# استعادة نسخة
mongorestore --db milk_erp /backup/20251229/milk_erp
```

### نسخة احتياطية تلقائية (Cron)

```bash
# تعديل crontab
crontab -e

# إضافة (نسخة يومية الساعة 2 صباحاً)
0 2 * * * mongodump --db milk_erp --out /backup/$(date +\%Y\%m\%d)
```

---

## الدعم الفني

للمساعدة أو الإبلاغ عن مشاكل:
- البريد: support@example.com
- الهاتف: +968 XXXX XXXX
