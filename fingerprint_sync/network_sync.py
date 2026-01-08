#!/usr/bin/env python3
"""
ZKTeco Network Sync Agent
برنامج مزامنة البصمات عبر الشبكة مباشرة

يتصل مباشرة بأجهزة ZKTeco عبر الشبكة (بدون ملفات MDB)
"""

import os
import sys
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
import requests
import time

# إعداد التسجيل
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('network_sync.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# محاولة استيراد مكتبة pyzk
try:
    from zk import ZK, const
    PYZK_AVAILABLE = True
except ImportError:
    PYZK_AVAILABLE = False
    logger.warning("مكتبة pyzk غير مثبتة. قم بتثبيتها: pip install pyzk")


class ZKTecoDevice:
    """فئة للتعامل مع جهاز ZKTeco واحد"""
    
    def __init__(self, ip, port=4370, timeout=5, name=""):
        self.ip = ip
        self.port = port
        self.timeout = timeout
        self.name = name or f"Device_{ip}"
        self.zk = None
        self.connected = False
        
    def connect(self):
        """الاتصال بالجهاز"""
        if not PYZK_AVAILABLE:
            logger.error("مكتبة pyzk غير متوفرة")
            return False
            
        try:
            self.zk = ZK(self.ip, port=self.port, timeout=self.timeout)
            self.zk.connect()
            self.connected = True
            logger.info(f"✅ تم الاتصال بـ {self.name} ({self.ip})")
            return True
        except Exception as e:
            logger.error(f"❌ فشل الاتصال بـ {self.name} ({self.ip}): {e}")
            self.connected = False
            return False
    
    def disconnect(self):
        """قطع الاتصال"""
        if self.zk:
            try:
                self.zk.disconnect()
                logger.info(f"تم قطع الاتصال بـ {self.name}")
            except:
                pass
        self.connected = False
    
    def get_users(self):
        """الحصول على قائمة المستخدمين"""
        if not self.connected:
            return []
        try:
            users = self.zk.get_users()
            logger.info(f"تم جلب {len(users)} مستخدم من {self.name}")
            return users
        except Exception as e:
            logger.error(f"خطأ في جلب المستخدمين: {e}")
            return []
    
    def get_attendance(self):
        """الحصول على سجلات الحضور"""
        if not self.connected:
            return []
        try:
            attendance = self.zk.get_attendance()
            logger.info(f"تم جلب {len(attendance)} سجل حضور من {self.name}")
            return attendance
        except Exception as e:
            logger.error(f"خطأ في جلب الحضور: {e}")
            return []
    
    def get_device_info(self):
        """الحصول على معلومات الجهاز"""
        if not self.connected:
            return {}
        try:
            return {
                'serial_number': self.zk.get_serialnumber(),
                'firmware': self.zk.get_firmware_version(),
                'platform': self.zk.get_platform(),
                'device_name': self.zk.get_device_name(),
            }
        except Exception as e:
            logger.error(f"خطأ في جلب معلومات الجهاز: {e}")
            return {}


class NetworkSyncAgent:
    """وكيل المزامنة عبر الشبكة"""
    
    def __init__(self, config_path=None):
        self.config = self._load_config(config_path)
        self.api_url = self.config.get('api_url', 'https://milktrack-9.preview.emergentagent.com')
        self.api_token = None
        self.devices = []
        
    def _load_config(self, config_path):
        """تحميل إعدادات التكوين"""
        default_config = {
            'api_url': 'https://milktrack-9.preview.emergentagent.com',
            'username': 'admin',
            'password': '',
            'sync_interval': 3600,
            'devices': []
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
            logger.info("✅ تم تسجيل الدخول بنجاح")
            return True
        except Exception as e:
            logger.error(f"❌ فشل تسجيل الدخول: {e}")
            return False
    
    def connect_devices(self):
        """الاتصال بجميع الأجهزة"""
        self.devices = []
        for device_config in self.config.get('devices', []):
            device = ZKTecoDevice(
                ip=device_config.get('ip'),
                port=device_config.get('port', 4370),
                timeout=device_config.get('timeout', 5),
                name=device_config.get('name', '')
            )
            if device.connect():
                self.devices.append(device)
        
        logger.info(f"تم الاتصال بـ {len(self.devices)} جهاز من أصل {len(self.config.get('devices', []))}")
        return len(self.devices) > 0
    
    def disconnect_all(self):
        """قطع الاتصال بجميع الأجهزة"""
        for device in self.devices:
            device.disconnect()
        self.devices = []
    
    def fetch_all_attendance(self):
        """جلب سجلات الحضور من جميع الأجهزة"""
        all_attendance = []
        all_users = {}
        
        for device in self.devices:
            # جلب المستخدمين
            users = device.get_users()
            for user in users:
                user_id = str(user.user_id)
                all_users[user_id] = {
                    'name': user.name or f'User_{user_id}',
                    'card': user.card or '',
                    'privilege': user.privilege
                }
            
            # جلب الحضور
            attendance = device.get_attendance()
            for record in attendance:
                user_id = str(record.user_id)
                user_info = all_users.get(user_id, {'name': f'User_{user_id}'})
                
                all_attendance.append({
                    'employee_id': user_id,
                    'employee_name': user_info['name'],
                    'timestamp': record.timestamp,
                    'date': record.timestamp.strftime('%Y-%m-%d'),
                    'time': record.timestamp.strftime('%H:%M'),
                    'device': device.name,
                    'punch': record.punch,  # 0=Check-in, 1=Check-out
                    'status': record.status
                })
        
        logger.info(f"إجمالي السجلات: {len(all_attendance)}")
        return all_attendance, all_users
    
    def process_attendance(self, records):
        """معالجة سجلات الحضور وتجميعها"""
        attendance_by_day = {}
        
        for record in records:
            key = f"{record['employee_id']}_{record['date']}"
            
            if key not in attendance_by_day:
                attendance_by_day[key] = {
                    'employee_id': record['employee_id'],
                    'employee_name': record['employee_name'],
                    'date': record['date'],
                    'times': [],
                    'device': record['device']
                }
            
            attendance_by_day[key]['times'].append({
                'time': record['time'],
                'punch': record.get('punch', 0)
            })
        
        # تحديد وقت الحضور والانصراف
        processed = []
        for key, data in attendance_by_day.items():
            times = sorted(data['times'], key=lambda x: x['time'])
            
            check_in = None
            check_out = None
            
            for t in times:
                if t['punch'] == 0 and not check_in:  # Check-in
                    check_in = t['time']
                elif t['punch'] == 1:  # Check-out
                    check_out = t['time']
            
            # إذا لم يكن هناك تحديد للنوع، استخدم أول وآخر وقت
            if not check_in and times:
                check_in = times[0]['time']
            if not check_out and len(times) > 1:
                check_out = times[-1]['time']
            
            processed.append({
                'employee_id': data['employee_id'],
                'employee_name': data['employee_name'],
                'fingerprint_id': data['employee_id'],  # إضافة fingerprint_id
                'date': data['date'],
                'check_in': check_in,
                'check_out': check_out,
                'status': 'present',
                'source': 'zkteco_network',
                'device_ip': data.get('device', '')
            })
        
        return processed
    
    def upload_attendance(self, records):
        """رفع سجلات الحضور إلى API - تقسيم لدفعات صغيرة"""
        if not self.api_token:
            if not self.authenticate():
                return False, 0, 0
        
        headers = {
            'Authorization': f'Bearer {self.api_token}',
            'Content-Type': 'application/json'
        }
        
        # تقسيم السجلات لدفعات صغيرة (100 سجل لكل دفعة)
        BATCH_SIZE = 100
        total_imported = 0
        total_updated = 0
        total_errors = []
        
        batches = [records[i:i + BATCH_SIZE] for i in range(0, len(records), BATCH_SIZE)]
        logger.info(f"تقسيم {len(records)} سجل إلى {len(batches)} دفعة...")
        
        for batch_num, batch in enumerate(batches, 1):
            try:
                logger.info(f"إرسال الدفعة {batch_num}/{len(batches)} ({len(batch)} سجل)...")
                response = requests.post(
                    f"{self.api_url}/api/hr/attendance/bulk-sync",
                    json=batch,
                    headers=headers,
                    timeout=60
                )
                
                if response.status_code == 200:
                    result = response.json()
                    total_imported += result.get('imported', 0)
                    total_updated += result.get('updated', 0)
                    errors = result.get('errors', [])
                    if errors:
                        total_errors.extend(errors[:5])
                    logger.info(f"  ✅ دفعة {batch_num}: {result.get('imported', 0)} جديد، {result.get('updated', 0)} محدث")
                else:
                    logger.error(f"  ❌ دفعة {batch_num}: فشل ({response.status_code})")
                    
            except Exception as e:
                logger.error(f"  ❌ دفعة {batch_num}: خطأ - {e}")
        
        logger.info(f"✅ اكتملت المزامنة: {total_imported} جديد، {total_updated} محدث")
        if total_errors:
            for err in total_errors[:5]:
                logger.warning(f"تحذير: {err}")
        
        return True, total_imported, total_updated
    
    def sync_now(self):
        """تنفيذ المزامنة الآن"""
        logger.info("=" * 50)
        logger.info("بدء المزامنة...")
        
        # التحقق من وجود أجهزة
        devices = self.config.get('devices', [])
        if not devices:
            logger.error("لا توجد أجهزة مضافة في الإعدادات")
            return False, 0, 0
        
        logger.info(f"عدد الأجهزة: {len(devices)}")
        
        # الاتصال بالأجهزة
        if not self.connect_devices():
            logger.error("لم يتم الاتصال بأي جهاز")
            return False, 0, 0
        
        try:
            # جلب البيانات
            logger.info("جاري جلب سجلات الحضور...")
            attendance, users = self.fetch_all_attendance()
            
            if not attendance:
                logger.warning("لا توجد سجلات حضور جديدة")
                return True, 0, 0
            
            logger.info(f"تم جلب {len(attendance)} سجل")
            
            # معالجة البيانات
            processed = self.process_attendance(attendance)
            logger.info(f"تم معالجة {len(processed)} سجل")
            
            # تسجيل الدخول أولاً
            if not self.authenticate():
                logger.error("فشل تسجيل الدخول للنظام")
                return False, 0, 0
            
            # رفع البيانات
            success, imported, updated = self.upload_attendance(processed)
            
            logger.info(f"✅ اكتملت المزامنة: {imported} جديد، {updated} محدث")
            return success, imported, updated
            
        finally:
            self.disconnect_all()
    
    def run_daemon(self):
        """تشغيل كخدمة مستمرة"""
        logger.info("🔄 بدء وضع الخدمة المستمرة")
        interval = self.config.get('sync_interval', 3600)
        
        while True:
            try:
                self.sync_now()
            except Exception as e:
                logger.error(f"خطأ في المزامنة: {e}")
            
            logger.info(f"⏰ الانتظار {interval} ثانية للمزامنة التالية...")
            time.sleep(interval)


def test_connection(ip, port=4370):
    """اختبار الاتصال بجهاز"""
    device = ZKTecoDevice(ip, port)
    if device.connect():
        info = device.get_device_info()
        print(f"✅ تم الاتصال بنجاح!")
        print(f"   الرقم التسلسلي: {info.get('serial_number', 'N/A')}")
        print(f"   الإصدار: {info.get('firmware', 'N/A')}")
        print(f"   المنصة: {info.get('platform', 'N/A')}")
        
        users = device.get_users()
        attendance = device.get_attendance()
        print(f"   عدد المستخدمين: {len(users)}")
        print(f"   سجلات الحضور: {len(attendance)}")
        
        device.disconnect()
        return True
    else:
        print(f"❌ فشل الاتصال بـ {ip}:{port}")
        return False


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='برنامج مزامنة أجهزة البصمة ZKTeco عبر الشبكة',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
أمثلة:
    python network_sync.py --test 192.168.1.100           # اختبار الاتصال بجهاز
    python network_sync.py --config config.json           # مزامنة مرة واحدة
    python network_sync.py --daemon --config config.json  # تشغيل كخدمة مستمرة
        """
    )
    
    parser.add_argument('--config', '-c', help='مسار ملف التكوين')
    parser.add_argument('--test', '-t', help='اختبار الاتصال بجهاز (عنوان IP)')
    parser.add_argument('--port', '-P', type=int, default=4370, help='منفذ الجهاز (افتراضي: 4370)')
    parser.add_argument('--daemon', '-d', action='store_true', help='تشغيل كخدمة مستمرة')
    
    args = parser.parse_args()
    
    if not PYZK_AVAILABLE:
        print("❌ خطأ: مكتبة pyzk غير مثبتة")
        print("قم بتثبيتها: pip install pyzk")
        sys.exit(1)
    
    # اختبار الاتصال
    if args.test:
        test_connection(args.test, args.port)
        return
    
    # المزامنة
    if not args.config:
        print("❌ خطأ: يجب تحديد ملف التكوين باستخدام --config")
        sys.exit(1)
    
    agent = NetworkSyncAgent(args.config)
    
    if args.daemon:
        agent.run_daemon()
    else:
        success, imported, updated = agent.sync_now()
        if success:
            print(f"✅ تمت المزامنة: {imported} جديد، {updated} محدث")
        else:
            print("❌ فشلت المزامنة")
            sys.exit(1)


if __name__ == '__main__':
    main()
