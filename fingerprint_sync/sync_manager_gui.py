#!/usr/bin/env python3
"""
ZKTeco Sync Manager - Desktop Application
تطبيق سطح مكتب لإدارة مزامنة أجهزة البصمة

واجهة رسومية سهلة الاستخدام لـ:
- إضافة وإدارة أجهزة البصمة
- اختبار الاتصال بالأجهزة
- مزامنة البيانات يدوياً أو تلقائياً
- عرض سجل المزامنات
"""

import os
import sys
import json
import threading
import time
from datetime import datetime
from pathlib import Path

# التحقق من توفر tkinter
try:
    import tkinter as tk
    from tkinter import ttk, messagebox, filedialog, scrolledtext
    TKINTER_AVAILABLE = True
except ImportError:
    TKINTER_AVAILABLE = False
    print("❌ خطأ: مكتبة tkinter غير متوفرة")
    print("على Windows: تأتي مع Python افتراضياً")
    print("على Linux: sudo apt-get install python3-tk")
    sys.exit(1)

# استيراد وحدات المزامنة
try:
    from network_sync import NetworkSyncAgent, ZKTecoDevice, PYZK_AVAILABLE
except ImportError:
    PYZK_AVAILABLE = False
    NetworkSyncAgent = None
    ZKTecoDevice = None

try:
    from sync_agent import ZKTecoSyncAgent
except ImportError:
    ZKTecoSyncAgent = None


class SyncManagerApp:
    """تطبيق إدارة المزامنة"""
    
    def __init__(self, root):
        self.root = root
        self.root.title("مدير مزامنة البصمات - ZKTeco Sync Manager")
        self.root.geometry("900x700")
        self.root.minsize(800, 600)
        
        # متغيرات
        self.config_path = Path("config.json")
        self.config = self.load_config()
        self.sync_running = False
        self.auto_sync_thread = None
        self.stop_auto_sync = False
        
        # إنشاء الواجهة
        self.create_widgets()
        self.load_devices_to_list()
        self.update_status("جاهز للعمل")
        
    def load_config(self):
        """تحميل ملف التكوين"""
        default_config = {
            'api_url': 'https://milk-erp.preview.emergentagent.com',
            'username': '',
            'password': '',
            'sync_interval': 3600,
            'devices': [],
            'mdb_paths': []
        }
        
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    saved_config = json.load(f)
                    default_config.update(saved_config)
            except:
                pass
        
        return default_config
    
    def save_config(self):
        """حفظ ملف التكوين"""
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            messagebox.showerror("خطأ", f"فشل حفظ الإعدادات: {e}")
            return False
    
    def create_widgets(self):
        """إنشاء عناصر الواجهة"""
        # إطار رئيسي
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky="nsew")
        
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        main_frame.rowconfigure(2, weight=1)
        
        # ===== إعدادات الاتصال =====
        conn_frame = ttk.LabelFrame(main_frame, text="إعدادات الاتصال بالنظام", padding="10")
        conn_frame.grid(row=0, column=0, sticky="ew", pady=(0, 10))
        conn_frame.columnconfigure(1, weight=1)
        
        # عنوان API
        ttk.Label(conn_frame, text="عنوان API:").grid(row=0, column=0, sticky="e", padx=5)
        self.api_url_var = tk.StringVar(value=self.config.get('api_url', ''))
        ttk.Entry(conn_frame, textvariable=self.api_url_var, width=50).grid(row=0, column=1, sticky="ew", padx=5)
        
        # اسم المستخدم
        ttk.Label(conn_frame, text="اسم المستخدم:").grid(row=1, column=0, sticky="e", padx=5, pady=5)
        self.username_var = tk.StringVar(value=self.config.get('username', ''))
        ttk.Entry(conn_frame, textvariable=self.username_var, width=30).grid(row=1, column=1, sticky="w", padx=5)
        
        # كلمة المرور
        ttk.Label(conn_frame, text="كلمة المرور:").grid(row=2, column=0, sticky="e", padx=5)
        self.password_var = tk.StringVar(value=self.config.get('password', ''))
        ttk.Entry(conn_frame, textvariable=self.password_var, show="*", width=30).grid(row=2, column=1, sticky="w", padx=5)
        
        # زر حفظ الإعدادات
        ttk.Button(conn_frame, text="💾 حفظ الإعدادات", command=self.save_settings).grid(row=0, column=2, rowspan=3, padx=10)
        
        # ===== إدارة الأجهزة =====
        devices_frame = ttk.LabelFrame(main_frame, text="أجهزة البصمة", padding="10")
        devices_frame.grid(row=1, column=0, sticky="ew", pady=(0, 10))
        devices_frame.columnconfigure(0, weight=1)
        
        # قائمة الأجهزة
        list_frame = ttk.Frame(devices_frame)
        list_frame.grid(row=0, column=0, sticky="ew")
        list_frame.columnconfigure(0, weight=1)
        
        self.devices_listbox = tk.Listbox(list_frame, height=5, font=('Arial', 11))
        self.devices_listbox.grid(row=0, column=0, sticky="ew")
        
        scrollbar = ttk.Scrollbar(list_frame, orient="vertical", command=self.devices_listbox.yview)
        scrollbar.grid(row=0, column=1, sticky="ns")
        self.devices_listbox.config(yscrollcommand=scrollbar.set)
        
        # أزرار إدارة الأجهزة
        btn_frame = ttk.Frame(devices_frame)
        btn_frame.grid(row=1, column=0, pady=10)
        
        ttk.Button(btn_frame, text="➕ إضافة جهاز", command=self.add_device).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="✏️ تعديل", command=self.edit_device).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="🗑️ حذف", command=self.delete_device).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="🔌 اختبار الاتصال", command=self.test_device_connection).pack(side="left", padx=5)
        
        # ===== إضافة ملفات MDB =====
        mdb_frame = ttk.LabelFrame(main_frame, text="ملفات MDB (بديل للاتصال المباشر)", padding="10")
        mdb_frame.grid(row=2, column=0, sticky="ew", pady=(0, 10))
        mdb_frame.columnconfigure(0, weight=1)
        
        mdb_list_frame = ttk.Frame(mdb_frame)
        mdb_list_frame.grid(row=0, column=0, sticky="ew")
        mdb_list_frame.columnconfigure(0, weight=1)
        
        self.mdb_listbox = tk.Listbox(mdb_list_frame, height=3, font=('Arial', 10))
        self.mdb_listbox.grid(row=0, column=0, sticky="ew")
        
        for mdb_path in self.config.get('mdb_paths', []):
            self.mdb_listbox.insert(tk.END, mdb_path)
        
        mdb_btn_frame = ttk.Frame(mdb_frame)
        mdb_btn_frame.grid(row=1, column=0, pady=5)
        
        ttk.Button(mdb_btn_frame, text="📁 إضافة ملف MDB", command=self.add_mdb_file).pack(side="left", padx=5)
        ttk.Button(mdb_btn_frame, text="🗑️ حذف", command=self.delete_mdb_file).pack(side="left", padx=5)
        
        # ===== أزرار المزامنة =====
        sync_frame = ttk.Frame(main_frame)
        sync_frame.grid(row=3, column=0, pady=10)
        
        self.sync_btn = ttk.Button(sync_frame, text="🔄 مزامنة الآن", command=self.sync_now, style="Accent.TButton")
        self.sync_btn.pack(side="left", padx=10)
        
        # المزامنة التلقائية
        self.auto_sync_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(sync_frame, text="مزامنة تلقائية", variable=self.auto_sync_var, command=self.toggle_auto_sync).pack(side="left", padx=5)
        
        ttk.Label(sync_frame, text="كل").pack(side="left")
        self.interval_var = tk.StringVar(value=str(self.config.get('sync_interval', 3600) // 60))
        ttk.Entry(sync_frame, textvariable=self.interval_var, width=5).pack(side="left", padx=2)
        ttk.Label(sync_frame, text="دقيقة").pack(side="left")
        
        # ===== سجل العمليات =====
        log_frame = ttk.LabelFrame(main_frame, text="سجل العمليات", padding="10")
        log_frame.grid(row=4, column=0, sticky="nsew", pady=(0, 10))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        main_frame.rowconfigure(4, weight=1)
        
        self.log_text = scrolledtext.ScrolledText(log_frame, height=10, font=('Courier', 10))
        self.log_text.grid(row=0, column=0, sticky="nsew")
        
        ttk.Button(log_frame, text="🧹 مسح السجل", command=self.clear_log).grid(row=1, column=0, pady=5)
        
        # ===== شريط الحالة =====
        self.status_var = tk.StringVar(value="جاهز")
        status_bar = ttk.Label(main_frame, textvariable=self.status_var, relief="sunken", anchor="w")
        status_bar.grid(row=5, column=0, sticky="ew")
    
    def load_devices_to_list(self):
        """تحميل الأجهزة إلى القائمة"""
        self.devices_listbox.delete(0, tk.END)
        for device in self.config.get('devices', []):
            name = device.get('name', 'جهاز')
            ip = device.get('ip', '')
            port = device.get('port', 4370)
            self.devices_listbox.insert(tk.END, f"{name} - {ip}:{port}")
    
    def add_device(self):
        """إضافة جهاز جديد"""
        dialog = DeviceDialog(self.root, "إضافة جهاز جديد")
        if dialog.result:
            self.config.setdefault('devices', []).append(dialog.result)
            self.save_config()
            self.load_devices_to_list()
            self.log(f"✅ تمت إضافة الجهاز: {dialog.result['name']}")
    
    def edit_device(self):
        """تعديل جهاز"""
        selection = self.devices_listbox.curselection()
        if not selection:
            messagebox.showwarning("تنبيه", "اختر جهازاً للتعديل")
            return
        
        idx = selection[0]
        device = self.config['devices'][idx]
        dialog = DeviceDialog(self.root, "تعديل الجهاز", device)
        if dialog.result:
            self.config['devices'][idx] = dialog.result
            self.save_config()
            self.load_devices_to_list()
            self.log(f"✅ تم تعديل الجهاز: {dialog.result['name']}")
    
    def delete_device(self):
        """حذف جهاز"""
        selection = self.devices_listbox.curselection()
        if not selection:
            messagebox.showwarning("تنبيه", "اختر جهازاً للحذف")
            return
        
        if messagebox.askyesno("تأكيد", "هل تريد حذف هذا الجهاز؟"):
            idx = selection[0]
            device = self.config['devices'].pop(idx)
            self.save_config()
            self.load_devices_to_list()
            self.log(f"🗑️ تم حذف الجهاز: {device.get('name', '')}")
    
    def test_device_connection(self):
        """اختبار الاتصال بجهاز"""
        selection = self.devices_listbox.curselection()
        if not selection:
            messagebox.showwarning("تنبيه", "اختر جهازاً لاختبار الاتصال")
            return
        
        if not PYZK_AVAILABLE:
            messagebox.showerror("خطأ", "مكتبة pyzk غير مثبتة\nقم بتثبيتها: pip install pyzk")
            return
        
        idx = selection[0]
        device_config = self.config['devices'][idx]
        
        self.update_status("جاري اختبار الاتصال...")
        self.log(f"🔌 اختبار الاتصال بـ {device_config['ip']}...")
        
        def test():
            device = ZKTecoDevice(
                ip=device_config['ip'],
                port=device_config.get('port', 4370),
                name=device_config.get('name', '')
            )
            
            if device.connect():
                info = device.get_device_info()
                users = len(device.get_users())
                attendance = len(device.get_attendance())
                device.disconnect()
                
                self.root.after(0, lambda: self.log(f"✅ تم الاتصال بنجاح!"))
                self.root.after(0, lambda: self.log(f"   الرقم التسلسلي: {info.get('serial_number', 'N/A')}"))
                self.root.after(0, lambda: self.log(f"   المستخدمين: {users}، السجلات: {attendance}"))
                self.root.after(0, lambda: messagebox.showinfo("نجاح", f"تم الاتصال بالجهاز بنجاح!\nالمستخدمين: {users}\nالسجلات: {attendance}"))
            else:
                self.root.after(0, lambda: self.log(f"❌ فشل الاتصال بـ {device_config['ip']}"))
                self.root.after(0, lambda: messagebox.showerror("خطأ", "فشل الاتصال بالجهاز\nتحقق من العنوان والمنفذ"))
            
            self.root.after(0, lambda: self.update_status("جاهز"))
        
        threading.Thread(target=test, daemon=True).start()
    
    def add_mdb_file(self):
        """إضافة ملف MDB"""
        file_path = filedialog.askopenfilename(
            title="اختر ملف MDB",
            filetypes=[("Access Database", "*.mdb"), ("All files", "*.*")]
        )
        if file_path:
            self.config.setdefault('mdb_paths', []).append(file_path)
            self.mdb_listbox.insert(tk.END, file_path)
            self.save_config()
            self.log(f"✅ تمت إضافة الملف: {file_path}")
    
    def delete_mdb_file(self):
        """حذف ملف MDB"""
        selection = self.mdb_listbox.curselection()
        if not selection:
            return
        
        idx = selection[0]
        self.config['mdb_paths'].pop(idx)
        self.mdb_listbox.delete(idx)
        self.save_config()
    
    def save_settings(self):
        """حفظ الإعدادات"""
        self.config['api_url'] = self.api_url_var.get()
        self.config['username'] = self.username_var.get()
        self.config['password'] = self.password_var.get()
        
        try:
            interval = int(self.interval_var.get()) * 60
            self.config['sync_interval'] = interval
        except:
            pass
        
        if self.save_config():
            messagebox.showinfo("نجاح", "تم حفظ الإعدادات")
            self.log("💾 تم حفظ الإعدادات")
    
    def sync_now(self):
        """تنفيذ المزامنة"""
        if self.sync_running:
            return
        
        self.sync_running = True
        self.sync_btn.config(state="disabled")
        self.update_status("جاري المزامنة...")
        self.log("=" * 40)
        self.log("🔄 بدء المزامنة...")
        
        def do_sync():
            try:
                # تحديث الإعدادات
                self.config['api_url'] = self.api_url_var.get()
                self.config['username'] = self.username_var.get()
                self.config['password'] = self.password_var.get()
                
                total_imported = 0
                total_updated = 0
                
                # مزامنة عبر الشبكة
                if PYZK_AVAILABLE and self.config.get('devices'):
                    self.root.after(0, lambda: self.log("📡 مزامنة عبر الشبكة..."))
                    agent = NetworkSyncAgent()
                    agent.config = self.config
                    agent.api_url = self.config['api_url']
                    
                    success, imported, updated = agent.sync_now()
                    if success:
                        total_imported += imported
                        total_updated += updated
                
                # مزامنة ملفات MDB
                if ZKTecoSyncAgent and self.config.get('mdb_paths'):
                    self.root.after(0, lambda: self.log("📁 مزامنة ملفات MDB..."))
                    agent = ZKTecoSyncAgent()
                    agent.config = self.config
                    agent.api_url = self.config['api_url']
                    
                    if agent.authenticate():
                        for mdb_path in self.config['mdb_paths']:
                            if agent.sync_single_file(mdb_path):
                                total_imported += 1
                
                self.root.after(0, lambda: self.log(f"✅ اكتملت المزامنة: {total_imported} جديد، {total_updated} محدث"))
                self.root.after(0, lambda: self.update_status(f"آخر مزامنة: {datetime.now().strftime('%H:%M:%S')}"))
                
            except Exception as e:
                self.root.after(0, lambda: self.log(f"❌ خطأ: {str(e)}"))
                self.root.after(0, lambda: self.update_status("فشلت المزامنة"))
            
            finally:
                self.sync_running = False
                self.root.after(0, lambda: self.sync_btn.config(state="normal"))
        
        threading.Thread(target=do_sync, daemon=True).start()
    
    def toggle_auto_sync(self):
        """تبديل المزامنة التلقائية"""
        if self.auto_sync_var.get():
            self.stop_auto_sync = False
            self.auto_sync_thread = threading.Thread(target=self.auto_sync_loop, daemon=True)
            self.auto_sync_thread.start()
            self.log("▶️ تم تشغيل المزامنة التلقائية")
        else:
            self.stop_auto_sync = True
            self.log("⏸️ تم إيقاف المزامنة التلقائية")
    
    def auto_sync_loop(self):
        """حلقة المزامنة التلقائية"""
        while not self.stop_auto_sync:
            try:
                interval = int(self.interval_var.get()) * 60
            except:
                interval = 3600
            
            # انتظار
            for _ in range(interval):
                if self.stop_auto_sync:
                    return
                time.sleep(1)
            
            if not self.stop_auto_sync:
                self.root.after(0, self.sync_now)
    
    def log(self, message):
        """إضافة رسالة للسجل"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)
    
    def clear_log(self):
        """مسح السجل"""
        self.log_text.delete(1.0, tk.END)
    
    def update_status(self, message):
        """تحديث شريط الحالة"""
        self.status_var.set(message)


class DeviceDialog:
    """نافذة إضافة/تعديل جهاز"""
    
    def __init__(self, parent, title, device=None):
        self.result = None
        
        self.dialog = tk.Toplevel(parent)
        self.dialog.title(title)
        self.dialog.geometry("400x250")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        
        frame = ttk.Frame(self.dialog, padding="20")
        frame.pack(fill="both", expand=True)
        
        # الاسم
        ttk.Label(frame, text="اسم الجهاز:").grid(row=0, column=0, sticky="e", pady=5)
        self.name_var = tk.StringVar(value=device.get('name', '') if device else '')
        ttk.Entry(frame, textvariable=self.name_var, width=30).grid(row=0, column=1, pady=5)
        
        # عنوان IP
        ttk.Label(frame, text="عنوان IP:").grid(row=1, column=0, sticky="e", pady=5)
        self.ip_var = tk.StringVar(value=device.get('ip', '') if device else '')
        ttk.Entry(frame, textvariable=self.ip_var, width=30).grid(row=1, column=1, pady=5)
        
        # المنفذ
        ttk.Label(frame, text="المنفذ:").grid(row=2, column=0, sticky="e", pady=5)
        self.port_var = tk.StringVar(value=str(device.get('port', 4370)) if device else '4370')
        ttk.Entry(frame, textvariable=self.port_var, width=10).grid(row=2, column=1, sticky="w", pady=5)
        
        # الموقع
        ttk.Label(frame, text="الموقع:").grid(row=3, column=0, sticky="e", pady=5)
        self.location_var = tk.StringVar(value=device.get('location', '') if device else '')
        ttk.Entry(frame, textvariable=self.location_var, width=30).grid(row=3, column=1, pady=5)
        
        # الأزرار
        btn_frame = ttk.Frame(frame)
        btn_frame.grid(row=4, column=0, columnspan=2, pady=20)
        
        ttk.Button(btn_frame, text="حفظ", command=self.save).pack(side="left", padx=10)
        ttk.Button(btn_frame, text="إلغاء", command=self.dialog.destroy).pack(side="left", padx=10)
        
        self.dialog.wait_window()
    
    def save(self):
        """حفظ البيانات"""
        if not self.ip_var.get():
            messagebox.showwarning("تنبيه", "عنوان IP مطلوب")
            return
        
        try:
            port = int(self.port_var.get())
        except:
            port = 4370
        
        self.result = {
            'name': self.name_var.get() or f"جهاز {self.ip_var.get()}",
            'ip': self.ip_var.get(),
            'port': port,
            'location': self.location_var.get()
        }
        
        self.dialog.destroy()


def main():
    """الدالة الرئيسية"""
    root = tk.Tk()
    
    # تطبيق نمط حديث
    style = ttk.Style()
    try:
        style.theme_use('clam')
    except:
        pass
    
    app = SyncManagerApp(root)
    
    # التعامل مع الإغلاق
    def on_closing():
        app.stop_auto_sync = True
        root.destroy()
    
    root.protocol("WM_DELETE_WINDOW", on_closing)
    root.mainloop()


if __name__ == '__main__':
    main()
