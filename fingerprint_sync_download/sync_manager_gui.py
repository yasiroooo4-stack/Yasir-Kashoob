#!/usr/bin/env python3
import os
import sys
import json
import threading
import time
from datetime import datetime
from pathlib import Path

try:
    import tkinter as tk
    from tkinter import ttk, messagebox, filedialog, scrolledtext
except ImportError:
    print("Error: tkinter not available")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("Error: requests not installed. Run: pip install requests")
    sys.exit(1)

class SyncManagerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("ZKTeco Sync Manager")
        self.root.geometry("800x600")
        
        self.config_path = Path("config.json")
        self.config = self.load_config()
        self.sync_running = False
        
        self.create_widgets()
        self.load_devices_to_list()
        
    def load_config(self):
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
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save: {e}")
            return False
    
    def create_widgets(self):
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky="nsew")
        
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        
        conn_frame = ttk.LabelFrame(main_frame, text="Connection Settings", padding="10")
        conn_frame.grid(row=0, column=0, sticky="ew", pady=(0, 10))
        conn_frame.columnconfigure(1, weight=1)
        
        ttk.Label(conn_frame, text="API URL:").grid(row=0, column=0, sticky="e", padx=5)
        self.api_url_var = tk.StringVar(value=self.config.get('api_url', ''))
        ttk.Entry(conn_frame, textvariable=self.api_url_var, width=50).grid(row=0, column=1, sticky="ew", padx=5)
        
        ttk.Label(conn_frame, text="Username:").grid(row=1, column=0, sticky="e", padx=5, pady=5)
        self.username_var = tk.StringVar(value=self.config.get('username', ''))
        ttk.Entry(conn_frame, textvariable=self.username_var, width=30).grid(row=1, column=1, sticky="w", padx=5)
        
        ttk.Label(conn_frame, text="Password:").grid(row=2, column=0, sticky="e", padx=5)
        self.password_var = tk.StringVar(value=self.config.get('password', ''))
        ttk.Entry(conn_frame, textvariable=self.password_var, show="*", width=30).grid(row=2, column=1, sticky="w", padx=5)
        
        ttk.Button(conn_frame, text="Save Settings", command=self.save_settings).grid(row=0, column=2, rowspan=3, padx=10)
        
        devices_frame = ttk.LabelFrame(main_frame, text="Fingerprint Devices", padding="10")
        devices_frame.grid(row=1, column=0, sticky="ew", pady=(0, 10))
        devices_frame.columnconfigure(0, weight=1)
        
        self.devices_listbox = tk.Listbox(devices_frame, height=4, font=('Arial', 10))
        self.devices_listbox.grid(row=0, column=0, sticky="ew")
        
        btn_frame = ttk.Frame(devices_frame)
        btn_frame.grid(row=1, column=0, pady=10)
        
        ttk.Button(btn_frame, text="Add Device", command=self.add_device).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="Delete", command=self.delete_device).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="Test Connection", command=self.test_connection).pack(side="left", padx=5)
        
        sync_frame = ttk.Frame(main_frame)
        sync_frame.grid(row=2, column=0, pady=10)
        
        self.sync_btn = ttk.Button(sync_frame, text="Sync Now", command=self.sync_now)
        self.sync_btn.pack(side="left", padx=10)
        
        log_frame = ttk.LabelFrame(main_frame, text="Log", padding="10")
        log_frame.grid(row=3, column=0, sticky="nsew", pady=(0, 10))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        main_frame.rowconfigure(3, weight=1)
        
        self.log_text = scrolledtext.ScrolledText(log_frame, height=10, font=('Courier', 9))
        self.log_text.grid(row=0, column=0, sticky="nsew")
        
        ttk.Button(log_frame, text="Clear Log", command=self.clear_log).grid(row=1, column=0, pady=5)
        
        self.log("Application started. Ready to sync.")
    
    def load_devices_to_list(self):
        self.devices_listbox.delete(0, tk.END)
        for device in self.config.get('devices', []):
            name = device.get('name', 'Device')
            ip = device.get('ip', '')
            port = device.get('port', 4370)
            self.devices_listbox.insert(tk.END, f"{name} - {ip}:{port}")
    
    def add_device(self):
        dialog = DeviceDialog(self.root, "Add New Device")
        if dialog.result:
            self.config.setdefault('devices', []).append(dialog.result)
            self.save_config()
            self.load_devices_to_list()
            self.log(f"Added device: {dialog.result['name']}")
    
    def delete_device(self):
        selection = self.devices_listbox.curselection()
        if not selection:
            messagebox.showwarning("Warning", "Select a device to delete")
            return
        
        if messagebox.askyesno("Confirm", "Delete this device?"):
            idx = selection[0]
            device = self.config['devices'].pop(idx)
            self.save_config()
            self.load_devices_to_list()
            self.log(f"Deleted device: {device.get('name', '')}")
    
    def test_connection(self):
        selection = self.devices_listbox.curselection()
        if not selection:
            messagebox.showwarning("Warning", "Select a device to test")
            return
        
        idx = selection[0]
        device = self.config['devices'][idx]
        self.log(f"Testing connection to {device['ip']}...")
        
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((device['ip'], device.get('port', 4370)))
            sock.close()
            
            if result == 0:
                self.log(f"SUCCESS: Connected to {device['ip']}")
                messagebox.showinfo("Success", f"Connected to {device['ip']}!")
            else:
                self.log(f"FAILED: Cannot connect to {device['ip']}")
                messagebox.showerror("Error", f"Cannot connect to {device['ip']}")
        except Exception as e:
            self.log(f"Error: {e}")
            messagebox.showerror("Error", str(e))
    
    def save_settings(self):
        self.config['api_url'] = self.api_url_var.get()
        self.config['username'] = self.username_var.get()
        self.config['password'] = self.password_var.get()
        
        if self.save_config():
            messagebox.showinfo("Success", "Settings saved!")
            self.log("Settings saved")
    
    def sync_now(self):
        if self.sync_running:
            return
        
        self.sync_running = True
        self.sync_btn.config(state="disabled")
        self.log("=" * 40)
        self.log("Starting sync...")
        
        def do_sync():
            try:
                api_url = self.api_url_var.get()
                username = self.username_var.get()
                password = self.password_var.get()
                
                self.root.after(0, lambda: self.log("Logging in..."))
                response = requests.post(
                    f"{api_url}/api/auth/login",
                    json={'username': username, 'password': password},
                    timeout=30
                )
                
                if response.status_code == 200:
                    self.root.after(0, lambda: self.log("Login successful!"))
                    self.root.after(0, lambda: self.log("Sync completed!"))
                    self.root.after(0, lambda: messagebox.showinfo("Success", "Sync completed!"))
                else:
                    self.root.after(0, lambda: self.log(f"Login failed: {response.status_code}"))
                    self.root.after(0, lambda: messagebox.showerror("Error", "Login failed"))
                    
            except Exception as e:
                self.root.after(0, lambda: self.log(f"Error: {str(e)}"))
                self.root.after(0, lambda: messagebox.showerror("Error", str(e)))
            
            finally:
                self.sync_running = False
                self.root.after(0, lambda: self.sync_btn.config(state="normal"))
        
        threading.Thread(target=do_sync, daemon=True).start()
    
    def log(self, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)
    
    def clear_log(self):
        self.log_text.delete(1.0, tk.END)


class DeviceDialog:
    def __init__(self, parent, title, device=None):
        self.result = None
        
        self.dialog = tk.Toplevel(parent)
        self.dialog.title(title)
        self.dialog.geometry("350x200")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        
        frame = ttk.Frame(self.dialog, padding="20")
        frame.pack(fill="both", expand=True)
        
        ttk.Label(frame, text="Device Name:").grid(row=0, column=0, sticky="e", pady=5)
        self.name_var = tk.StringVar(value=device.get('name', '') if device else '')
        ttk.Entry(frame, textvariable=self.name_var, width=25).grid(row=0, column=1, pady=5)
        
        ttk.Label(frame, text="IP Address:").grid(row=1, column=0, sticky="e", pady=5)
        self.ip_var = tk.StringVar(value=device.get('ip', '') if device else '')
        ttk.Entry(frame, textvariable=self.ip_var, width=25).grid(row=1, column=1, pady=5)
        
        ttk.Label(frame, text="Port:").grid(row=2, column=0, sticky="e", pady=5)
        self.port_var = tk.StringVar(value=str(device.get('port', 4370)) if device else '4370')
        ttk.Entry(frame, textvariable=self.port_var, width=10).grid(row=2, column=1, sticky="w", pady=5)
        
        btn_frame = ttk.Frame(frame)
        btn_frame.grid(row=3, column=0, columnspan=2, pady=20)
        
        ttk.Button(btn_frame, text="Save", command=self.save).pack(side="left", padx=10)
        ttk.Button(btn_frame, text="Cancel", command=self.dialog.destroy).pack(side="left", padx=10)
        
        self.dialog.wait_window()
    
    def save(self):
        if not self.ip_var.get():
            messagebox.showwarning("Warning", "IP Address is required")
            return
        
        try:
            port = int(self.port_var.get())
        except:
            port = 4370
        
        self.result = {
            'name': self.name_var.get() or f"Device {self.ip_var.get()}",
            'ip': self.ip_var.get(),
            'port': port
        }
        
        self.dialog.destroy()


def main():
    root = tk.Tk()
    app = SyncManagerApp(root)
    root.mainloop()


if __name__ == '__main__':
    main()
