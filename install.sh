#!/bin/bash

# ============================================
# سكربت تثبيت نظام ERP لمركز تجميع الحليب
# Milk Collection Center ERP Installation Script
# ============================================

set -e

echo "========================================"
echo "   تثبيت نظام ERP لمركز تجميع الحليب"
echo "   Milk Collection Center ERP Setup"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}يرجى تشغيل السكربت كـ root${NC}"
    echo "sudo ./install.sh"
    exit 1
fi

# Get server IP
read -p "أدخل عنوان IP للسيرفر (مثال: 192.168.100.50): " SERVER_IP
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="localhost"
fi

echo ""
echo -e "${YELLOW}[1/7] تحديث النظام...${NC}"
apt update && apt upgrade -y

echo ""
echo -e "${YELLOW}[2/7] تثبيت المتطلبات الأساسية...${NC}"
apt install -y curl wget git build-essential python3 python3-pip python3-venv nginx

echo ""
echo -e "${YELLOW}[3/7] تثبيت Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    npm install -g yarn
fi
echo "Node.js version: $(node -v)"
echo "Yarn version: $(yarn -v)"

echo ""
echo -e "${YELLOW}[4/7] تثبيت MongoDB...${NC}"
if ! command -v mongod &> /dev/null; then
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    apt update
    apt install -y mongodb-org
    systemctl start mongod
    systemctl enable mongod
fi
echo "MongoDB status: $(systemctl is-active mongod)"

echo ""
echo -e "${YELLOW}[5/7] إعداد Backend...${NC}"
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=milk_erp
JWT_SECRET=$(openssl rand -hex 32)
EOF

echo "Backend configured successfully"
deactivate
cd ..

echo ""
echo -e "${YELLOW}[6/7] إعداد Frontend...${NC}"
cd frontend

# Install dependencies
yarn install

# Create .env file
cat > .env << EOF
REACT_APP_BACKEND_URL=http://${SERVER_IP}:8001
EOF

# Build for production
yarn build

echo "Frontend built successfully"
cd ..

echo ""
echo -e "${YELLOW}[7/7] إعداد Nginx و Systemd...${NC}"

# Create systemd service for backend
cat > /etc/systemd/system/milk-backend.service << EOF
[Unit]
Description=Milk ERP Backend API
After=network.target mongod.service

[Service]
User=root
WorkingDirectory=$(pwd)/backend
Environment="PATH=$(pwd)/backend/venv/bin"
ExecStart=$(pwd)/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create nginx config
cat > /etc/nginx/sites-available/milk-erp << EOF
server {
    listen 80;
    server_name ${SERVER_IP};

    # Frontend
    location / {
        root $(pwd)/frontend/build;
        try_files \$uri /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# Enable nginx site
ln -sf /etc/nginx/sites-available/milk-erp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# Reload services
systemctl daemon-reload
systemctl enable milk-backend
systemctl start milk-backend
systemctl restart nginx

echo ""
echo "========================================"
echo -e "${GREEN}   ✅ تم التثبيت بنجاح!${NC}"
echo "========================================"
echo ""
echo "الوصول للنظام:"
echo -e "   ${GREEN}http://${SERVER_IP}${NC}"
echo ""
echo "بيانات الدخول:"
echo "   المستخدم: yasir"
echo "   كلمة المرور: admin123"
echo ""
echo "أجهزة البصمة:"
echo "   جهاز 1: 192.168.100.201"
echo "   جهاز 2: 192.168.100.214"
echo ""
echo "أوامر مفيدة:"
echo "   sudo systemctl status milk-backend"
echo "   sudo systemctl restart milk-backend"
echo "   sudo journalctl -u milk-backend -f"
echo ""
echo "========================================"
