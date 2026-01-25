# دليل الاستضافة الذاتية - نظام المروج للألبان ERP
# Self-Hosting Guide - Al Morooj Dairy ERP

## المتطلبات الأساسية

### 1. السيرفر (الخادم)
يمكنك استخدام أحد الخيارات التالية:

| الخيار | التكلفة | المواصفات المطلوبة |
|--------|---------|-------------------|
| **كمبيوتر قديم في المكتب** | مجاني | RAM: 4GB+, Storage: 20GB+ |
| **VPS (خادم افتراضي)** | ~5$/شهر | DigitalOcean, Vultr, Hetzner |
| **Raspberry Pi 4** | ~50$ مرة واحدة | RAM: 4GB+ |

### 2. نظام التشغيل
- **Ubuntu 22.04 LTS** (موصى به)
- أو أي توزيعة Linux أخرى

---

## الخطوة 1: تجهيز السيرفر

### تحديث النظام
```bash
sudo apt update && sudo apt upgrade -y
```

### تثبيت الأدوات الأساسية
```bash
sudo apt install -y curl wget git build-essential
```

---

## الخطوة 2: تثبيت Node.js (للفرونت إند)

```bash
# تثبيت Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# التحقق من التثبيت
node --version  # يجب أن يظهر v18.x.x
npm --version

# تثبيت Yarn
sudo npm install -g yarn
```

---

## الخطوة 3: تثبيت Python (للباك إند)

```bash
# تثبيت Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# التحقق من التثبيت
python3.11 --version  # يجب أن يظهر 3.11.x
```

---

## الخطوة 4: تثبيت MongoDB (قاعدة البيانات)

```bash
# استيراد مفتاح MongoDB
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# إضافة المستودع
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# تثبيت MongoDB
sudo apt update
sudo apt install -y mongodb-org

# تشغيل MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# التحقق من التشغيل
sudo systemctl status mongod
```

---

## الخطوة 5: تثبيت Nginx (خادم الويب)

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## الخطوة 6: رفع ملفات المشروع

### الخيار أ: من GitHub
```bash
cd /var/www
sudo git clone https://github.com/YOUR_USERNAME/dairy-farm-erp.git
sudo chown -R $USER:$USER /var/www/dairy-farm-erp
cd dairy-farm-erp
```

### الخيار ب: رفع الملفات يدوياً
```bash
# على جهازك المحلي، استخدم SCP أو FileZilla
scp -r /path/to/project user@server_ip:/var/www/dairy-farm-erp
```

---

## الخطوة 7: إعداد الباك إند (Backend)

```bash
cd /var/www/dairy-farm-erp/backend

# إنشاء بيئة افتراضية
python3.11 -m venv venv
source venv/bin/activate

# تثبيت المتطلبات
pip install -r requirements.txt

# إنشاء ملف البيئة
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=milk_erp
JWT_SECRET=your_super_secret_key_change_this_in_production
EOF

# اختبار التشغيل
python server.py
# إذا عمل بدون أخطاء، اضغط Ctrl+C للإيقاف
```

---

## الخطوة 8: إعداد الفرونت إند (Frontend)

```bash
cd /var/www/dairy-farm-erp/frontend

# تثبيت المتطلبات
yarn install

# إنشاء ملف البيئة
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://yourdomain.com
EOF

# بناء النسخة الإنتاجية
yarn build
```

---

## الخطوة 9: إعداد خدمات Systemd

### خدمة الباك إند
```bash
sudo nano /etc/systemd/system/dairy-backend.service
```

أضف المحتوى التالي:
```ini
[Unit]
Description=Dairy ERP Backend
After=network.target mongod.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/dairy-farm-erp/backend
Environment=PATH=/var/www/dairy-farm-erp/backend/venv/bin
ExecStart=/var/www/dairy-farm-erp/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# تفعيل وتشغيل الخدمة
sudo systemctl daemon-reload
sudo systemctl start dairy-backend
sudo systemctl enable dairy-backend
sudo systemctl status dairy-backend
```

---

## الخطوة 10: إعداد Nginx

```bash
sudo nano /etc/nginx/sites-available/dairy-erp
```

أضف المحتوى التالي:
```nginx
server {
    listen 80;
    server_name yourdomain.com;  # استبدل بدومينك أو IP السيرفر

    # Frontend - React Build
    location / {
        root /var/www/dairy-farm-erp/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }

    # رفع الملفات - زيادة الحد الأقصى
    client_max_body_size 50M;
}
```

```bash
# تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/dairy-erp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # حذف الإعداد الافتراضي

# اختبار الإعدادات
sudo nginx -t

# إعادة تشغيل Nginx
sudo systemctl restart nginx
```

---

## الخطوة 11: إعداد SSL (HTTPS) - مجاني

### باستخدام Let's Encrypt (يتطلب دومين)
```bash
# تثبيت Certbot
sudo apt install -y certbot python3-certbot-nginx

# الحصول على شهادة SSL
sudo certbot --nginx -d yourdomain.com

# التجديد التلقائي (يتم تلقائياً)
sudo systemctl status certbot.timer
```

---

## الخطوة 12: إعداد جدار الحماية

```bash
# تفعيل UFW
sudo ufw enable

# السماح بالمنافذ المطلوبة
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# التحقق من الإعدادات
sudo ufw status
```

---

## الخطوة 13: النسخ الاحتياطي لقاعدة البيانات

### نسخ احتياطي يدوي
```bash
# إنشاء مجلد النسخ الاحتياطية
sudo mkdir -p /var/backups/mongodb

# نسخ احتياطي
mongodump --db milk_erp --out /var/backups/mongodb/$(date +%Y%m%d)

# استعادة من نسخة احتياطية
mongorestore --db milk_erp /var/backups/mongodb/20260125/milk_erp
```

### نسخ احتياطي تلقائي (يومي)
```bash
sudo nano /etc/cron.daily/mongodb-backup
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d)
mongodump --db milk_erp --out $BACKUP_DIR/$DATE
# حذف النسخ الأقدم من 7 أيام
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

```bash
sudo chmod +x /etc/cron.daily/mongodb-backup
```

---

## الخطوة 14: المراقبة والصيانة

### مراقبة السجلات
```bash
# سجلات الباك إند
sudo journalctl -u dairy-backend -f

# سجلات Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# سجلات MongoDB
sudo tail -f /var/log/mongodb/mongod.log
```

### إعادة التشغيل
```bash
# إعادة تشغيل الباك إند
sudo systemctl restart dairy-backend

# إعادة تشغيل Nginx
sudo systemctl restart nginx

# إعادة تشغيل MongoDB
sudo systemctl restart mongod
```

---

## خيارات الدومين المجانية/الرخيصة

### بدون دومين (IP مباشر)
```
http://YOUR_SERVER_IP
```

### دومين مجاني من No-IP أو DuckDNS
1. سجل في https://www.noip.com أو https://www.duckdns.org
2. أنشئ hostname مجاني (مثل: almorooj.ddns.net)
3. ثبت برنامج التحديث التلقائي على السيرفر

```bash
# DuckDNS - تحديث تلقائي
echo "echo url=\"https://www.duckdns.org/update?domains=YOUR_DOMAIN&token=YOUR_TOKEN&ip=\" | curl -k -o ~/duckdns/duck.log -K -" > ~/duckdns/duck.sh
chmod 700 ~/duckdns/duck.sh
```

---

## ملخص التكاليف

| البند | التكلفة |
|-------|---------|
| **VPS (DigitalOcean/Vultr)** | ~5-10$/شهر |
| **دومين .com** | ~10-15$/سنة |
| **SSL (Let's Encrypt)** | مجاني |
| **MongoDB** | مجاني |
| **الإجمالي** | ~6-11$/شهر |

### خيار مجاني تماماً:
- استخدم كمبيوتر قديم في المكتب
- استخدم DuckDNS للدومين المجاني
- استخدم Let's Encrypt للـ SSL

---

## الدعم والمساعدة

إذا واجهت أي مشكلة:
1. راجع سجلات الأخطاء (logs)
2. تأكد من تشغيل جميع الخدمات
3. تحقق من إعدادات جدار الحماية

### أوامر مفيدة للتشخيص
```bash
# حالة جميع الخدمات
sudo systemctl status dairy-backend mongod nginx

# استخدام الموارد
htop

# مساحة القرص
df -h

# استخدام الذاكرة
free -m
```
