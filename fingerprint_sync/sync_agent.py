#!/usr/bin/env python3
"""
ZKTeco Fingerprint Device Sync Agent
برنامج مزامنة البصمات مع نظام ERP

هذا البرنامج يقوم بـ:
1. قراءة بيانات الحضور من أجهزة ZKTeco
2. إرسالها تلقائياً إلى نظام ERP عبر API
3. يمكن جدولته للتشغيل التلقائي

الاستخدام:
    python sync_agent.py --config config.json
    python sync_agent.py --mdb /path/to/attendance.mdb
"""

import os
import sys
import json
import argparse
import logging
import subprocess
import csv
from io import StringIO
from datetime import datetime
from pathlib import Path
import requests
import time

# إعداد التسجيل
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sync_agent.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ZKTecoSyncAgent:
    """وكيل مزامنة أجهزة ZKTeco"""
    
    def __init__(self, config_path=None):
        self.config = self._load_config(config_path)
        self.api_url = self.config.get('api_url', 'https://zendesk-16.preview.emergentagent.com')
        self.api_token = None
        
    def _load_config(self, config_path):
        """تحميل إعدادات التكوين"""
        default_config = {
            'api_url': 'https://zendesk-16.preview.emergentagent.com',
            'username': 'admin',
            'password': '',
            'sync_interval': 3600,  # كل ساعة
            'devices': [],
            'mdb_paths': []
        }
        
        if config_path and Path(config_path).exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                user_config = json.load(f)
                default_config.update(user_config)
                
        return default_config
    
    def authenticate(self):
        """تسجيل الدخول للحصول على رمز المصادقة"""
        try:
            response = requests.post(
                f"{self.api_url}/api/auth/login",
                json={
                    'username': self.config['username'],
                    'password': self.config['password']
                },
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            self.api_token = data.get('access_token')
            logger.info("تم تسجيل الدخول بنجاح")
            return True
        except Exception as e:
            logger.error(f"فشل تسجيل الدخول: {e}")
            return False
    
    def read_mdb_file(self, mdb_path):
        """قراءة ملف MDB من جهاز ZKTeco"""
        if not Path(mdb_path).exists():
            logger.error(f"الملف غير موجود: {mdb_path}")
            return None, None
        
        try:
            # قراءة جدول المستخدمين
            users_result = subprocess.run(
                ['mdb-export', mdb_path, 'USERINFO'],
                capture_output=True, text=True
            )
            
            user_map = {}
            if users_result.returncode == 0:
                reader = csv.DictReader(StringIO(users_result.stdout))
                for row in reader:
                    user_id = row.get('USERID', '')
                    name = row.get('Name', '') or row.get('Badgenumber', '')
                    badge = row.get('Badgenumber', '')
                    if user_id:
                        user_map[user_id] = {'name': name, 'badge': badge}
            
            # قراءة جدول الحضور
            attendance_result = subprocess.run(
                ['mdb-export', mdb_path, 'CHECKINOUT'],
                capture_output=True, text=True
            )
            
            if attendance_result.returncode != 0:
                logger.error("فشل في قراءة جدول الحضور")
                return None, None
            
            attendance_records = []
            reader = csv.DictReader(StringIO(attendance_result.stdout))
            for row in reader:
                user_id = row.get('USERID', '')
                check_time_str = row.get('CHECKTIME', '')
                
                if not user_id or not check_time_str:
                    continue
                
                try:
                    # تحليل التاريخ والوقت
                    check_time = datetime.strptime(check_time_str, "%m/%d/%y %H:%M:%S")
                    user_info = user_map.get(user_id, {'name': f'User_{user_id}', 'badge': user_id})
                    
                    attendance_records.append({
                        'user_id': user_id,
                        'employee_name': user_info['name'],
                        'employee_badge': user_info['badge'],
                        'check_time': check_time,
                        'date': check_time.strftime("%Y-%m-%d"),
                        'time': check_time.strftime("%H:%M")
                    })
                except ValueError as e:
                    logger.warning(f"خطأ في تحليل التاريخ: {check_time_str}")
                    continue
            
            logger.info(f"تم قراءة {len(attendance_records)} سجل حضور و {len(user_map)} مستخدم")
            return attendance_records, user_map
            
        except Exception as e:
            logger.error(f"خطأ في قراءة ملف MDB: {e}")
            return None, None
    
    def process_attendance(self, records):
        """معالجة سجلات الحضور وتجميعها بالتاريخ"""
        attendance_by_day = {}
        
        for record in records:
            key = f"{record['user_id']}_{record['date']}"
            
            if key not in attendance_by_day:
                attendance_by_day[key] = {
                    'employee_id': record['employee_badge'],
                    'employee_name': record['employee_name'],
                    'date': record['date'],
                    'times': []
                }
            
            attendance_by_day[key]['times'].append(record['time'])
        
        # تحديد وقت الحضور والانصراف
        processed = []
        for key, data in attendance_by_day.items():
            times = sorted(data['times'])
            processed.append({
                'employee_id': data['employee_id'],
                'employee_name': data['employee_name'],
                'date': data['date'],
                'check_in': times[0] if times else None,
                'check_out': times[-1] if len(times) > 1 else None,
                'source': 'zkteco_sync'
            })
        
        return processed
    
    def upload_to_api(self, mdb_path):
        """رفع ملف MDB مباشرة إلى API"""
        if not self.api_token:
            if not self.authenticate():
                return False
        
        try:
            with open(mdb_path, 'rb') as f:
                files = {'file': (Path(mdb_path).name, f, 'application/x-msaccess')}
                headers = {'Authorization': f'Bearer {self.api_token}'}
                
                response = requests.post(
                    f"{self.api_url}/api/hr/attendance/import-zkteco",
                    files=files,
                    headers=headers,
                    timeout=120
                )
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"تم الاستيراد: {result.get('imported', 0)} سجل جديد، {result.get('updated', 0)} سجل محدث")
                return True
                
        except Exception as e:
            logger.error(f"فشل الرفع: {e}")
            return False
    
    def sync_single_file(self, mdb_path):
        """مزامنة ملف واحد"""
        logger.info(f"بدء مزامنة: {mdb_path}")
        return self.upload_to_api(mdb_path)
    
    def sync_all(self):
        """مزامنة جميع الملفات المحددة في التكوين"""
        success_count = 0
        fail_count = 0
        
        for mdb_path in self.config.get('mdb_paths', []):
            if self.sync_single_file(mdb_path):
                success_count += 1
            else:
                fail_count += 1
        
        logger.info(f"اكتملت المزامنة: {success_count} نجح، {fail_count} فشل")
        return success_count, fail_count
    
    def run_daemon(self):
        """تشغيل كخدمة مستمرة"""
        logger.info("بدء وضع الخدمة المستمرة")
        interval = self.config.get('sync_interval', 3600)
        
        while True:
            try:
                self.sync_all()
            except Exception as e:
                logger.error(f"خطأ في المزامنة: {e}")
            
            logger.info(f"الانتظار {interval} ثانية للمزامنة التالية...")
            time.sleep(interval)


def create_sample_config():
    """إنشاء ملف تكوين نموذجي"""
    config = {
        "api_url": "https://zendesk-16.preview.emergentagent.com",
        "username": "yasir",
        "password": "admin123",
        "sync_interval": 3600,
        "mdb_paths": [
            "C:/ZKTeco/att2000.mdb",
            "D:/Fingerprint/attendance.mdb"
        ],
        "devices": [
            {
                "name": "جهاز البصمة الرئيسي",
                "ip": "192.168.1.100",
                "port": 4370
            }
        ]
    }
    
    with open('config_sample.json', 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    
    print("تم إنشاء ملف التكوين النموذجي: config_sample.json")
    print("قم بتعديله وإعادة تسميته إلى config.json")


def main():
    parser = argparse.ArgumentParser(
        description='برنامج مزامنة أجهزة البصمة ZKTeco مع نظام ERP',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
أمثلة:
    python sync_agent.py --config config.json           # مزامنة باستخدام ملف التكوين
    python sync_agent.py --mdb attendance.mdb           # مزامنة ملف واحد
    python sync_agent.py --daemon --config config.json  # تشغيل كخدمة مستمرة
    python sync_agent.py --create-config                # إنشاء ملف تكوين نموذجي
        """
    )
    
    parser.add_argument('--config', '-c', help='مسار ملف التكوين')
    parser.add_argument('--mdb', '-m', help='مسار ملف MDB للمزامنة')
    parser.add_argument('--daemon', '-d', action='store_true', help='تشغيل كخدمة مستمرة')
    parser.add_argument('--create-config', action='store_true', help='إنشاء ملف تكوين نموذجي')
    parser.add_argument('--api-url', help='عنوان API')
    parser.add_argument('--username', '-u', help='اسم المستخدم')
    parser.add_argument('--password', '-p', help='كلمة المرور')
    
    args = parser.parse_args()
    
    if args.create_config:
        create_sample_config()
        return
    
    # إنشاء الوكيل
    agent = ZKTecoSyncAgent(args.config)
    
    # تحديث الإعدادات من سطر الأوامر
    if args.api_url:
        agent.config['api_url'] = args.api_url
        agent.api_url = args.api_url
    if args.username:
        agent.config['username'] = args.username
    if args.password:
        agent.config['password'] = args.password
    
    # التحقق من وجود كلمة المرور
    if not agent.config.get('password'):
        print("خطأ: يجب تحديد كلمة المرور في ملف التكوين أو عبر --password")
        sys.exit(1)
    
    # مزامنة ملف واحد
    if args.mdb:
        if agent.sync_single_file(args.mdb):
            print("✅ تمت المزامنة بنجاح")
        else:
            print("❌ فشلت المزامنة")
            sys.exit(1)
    
    # تشغيل كخدمة
    elif args.daemon:
        agent.run_daemon()
    
    # مزامنة جميع الملفات
    else:
        if not agent.config.get('mdb_paths'):
            print("خطأ: لا توجد ملفات محددة للمزامنة")
            print("استخدم --mdb لتحديد ملف أو أضف mdb_paths في ملف التكوين")
            sys.exit(1)
        
        success, fail = agent.sync_all()
        if fail == 0:
            print(f"✅ تمت مزامنة {success} ملف بنجاح")
        else:
            print(f"⚠️ {success} نجح، {fail} فشل")
            sys.exit(1)


if __name__ == '__main__':
    main()
