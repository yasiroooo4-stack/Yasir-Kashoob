#!/usr/bin/env python3
"""
Backend API Testing for Milk Collection Center ERP - ZKTeco Sync Manager Testing
Tests the ZKTeco Sync Manager APIs as requested in the review:
1. Login and Authentication Test (yasir/admin123)
2. GET /api/hr/zkteco/devices - Get all devices and sync settings
3. POST /api/hr/zkteco/devices - Add new device
4. DELETE /api/hr/zkteco/devices/{device_id} - Delete device
5. POST /api/hr/zkteco/devices/{device_id}/test - Test device connection
6. PUT /api/hr/zkteco/settings - Update sync settings
7. POST /api/hr/zkteco/sync - Sync attendance
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Get backend URL from frontend .env
BACKEND_URL = "https://zendesk-16.preview.emergentagent.com/api"

# Test credentials (as specified in review request)
TEST_USERNAME = "yasir"
TEST_PASSWORD = "admin123"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_data = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_login_and_authentication(self):
        """Test 1: Login with yasir/admin123 and verify authentication works"""
        try:
            # Test login
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json={
                    "username": TEST_USERNAME,
                    "password": TEST_PASSWORD
                },
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.user_data = data.get("user")
                self.session.headers.update({
                    "Authorization": f"Bearer {self.token}"
                })
                
                # Test authentication by getting user profile
                profile_response = self.session.get(f"{BACKEND_URL}/auth/me")
                
                if profile_response.status_code == 200:
                    profile = profile_response.json()
                    
                    self.log_test(
                        "Login and Authentication Test", 
                        True, 
                        f"Successfully logged in as {self.user_data.get('username')} ({self.user_data.get('role')})"
                    )
                    return True
                else:
                    self.log_test(
                        "Login and Authentication Test", 
                        False, 
                        f"Authentication verification failed with status {profile_response.status_code}",
                        profile_response.text
                    )
                    return False
            else:
                self.log_test(
                    "Login and Authentication Test", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Login and Authentication Test", False, f"Error: {str(e)}")
            return False

    def test_zkteco_get_devices_and_settings(self):
        """Test 2: GET /api/hr/zkteco/devices - Get all devices and sync settings"""
        try:
            if not self.token:
                self.log_test("ZKTeco Get Devices Test", False, "No authentication token available")
                return False
            
            response = self.session.get(f"{BACKEND_URL}/hr/zkteco/devices")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                if "devices" in data and "auto_sync_enabled" in data and "sync_interval" in data:
                    devices_count = len(data["devices"])
                    auto_sync = data["auto_sync_enabled"]
                    sync_interval = data["sync_interval"]
                    
                    self.log_test(
                        "ZKTeco Get Devices Test", 
                        True, 
                        f"Successfully retrieved {devices_count} devices, auto_sync: {auto_sync}, interval: {sync_interval}min"
                    )
                    return True
                else:
                    self.log_test(
                        "ZKTeco Get Devices Test", 
                        False, 
                        "Response missing required fields (devices, auto_sync_enabled, sync_interval)",
                        data
                    )
                    return False
            else:
                self.log_test(
                    "ZKTeco Get Devices Test", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("ZKTeco Get Devices Test", False, f"Error: {str(e)}")
            return False

    def test_zkteco_add_device(self):
        """Test 3: POST /api/hr/zkteco/devices - Add new device"""
        try:
            if not self.token:
                self.log_test("ZKTeco Add Device Test", False, "No authentication token available")
                return False
            
            # Test device data
            device_data = {
                "name": "جهاز اختبار API",
                "ip_address": "192.168.1.100",
                "port": 4370,
                "location": "مكتب الاختبار"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/hr/zkteco/devices",
                json=device_data
            )
            
            if response.status_code == 200:
                created_device = response.json()
                
                # Verify device was created with correct data
                if (created_device.get("name") == device_data["name"] and 
                    created_device.get("ip_address") == device_data["ip_address"] and
                    created_device.get("port") == device_data["port"] and
                    created_device.get("location") == device_data["location"] and
                    "id" in created_device):
                    
                    # Store device ID for later tests
                    self.test_device_id = created_device["id"]
                    
                    self.log_test(
                        "ZKTeco Add Device Test", 
                        True, 
                        f"Successfully created device '{device_data['name']}' with ID {created_device['id']}"
                    )
                    return True
                else:
                    self.log_test(
                        "ZKTeco Add Device Test", 
                        False, 
                        "Created device data doesn't match input data",
                        created_device
                    )
                    return False
            else:
                self.log_test(
                    "ZKTeco Add Device Test", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("ZKTeco Add Device Test", False, f"Error: {str(e)}")
            return False

    def test_zkteco_test_device_connection(self):
        """Test 4: POST /api/hr/zkteco/devices/{device_id}/test - Test device connection"""
        try:
            if not self.token:
                self.log_test("ZKTeco Test Connection Test", False, "No authentication token available")
                return False
            
            if not hasattr(self, 'test_device_id'):
                self.log_test("ZKTeco Test Connection Test", False, "No test device ID available from previous test")
                return False
            
            response = self.session.post(f"{BACKEND_URL}/hr/zkteco/devices/{self.test_device_id}/test")
            
            if response.status_code == 200:
                result = response.json()
                
                # The API should work even if device is not reachable
                # Check for either success/message format or success/error format
                if "success" in result and ("message" in result or "error" in result):
                    success = result["success"]
                    message = result.get("message") or result.get("error", "No message")
                    
                    self.log_test(
                        "ZKTeco Test Connection Test", 
                        True, 
                        f"Connection test completed - Success: {success}, Message: {message}"
                    )
                    return True
                else:
                    self.log_test(
                        "ZKTeco Test Connection Test", 
                        False, 
                        "Response missing required fields (success and message/error)",
                        result
                    )
                    return False
            else:
                self.log_test(
                    "ZKTeco Test Connection Test", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("ZKTeco Test Connection Test", False, f"Error: {str(e)}")
            return False

    def test_zkteco_update_sync_settings(self):
        """Test 5: PUT /api/hr/zkteco/settings - Update sync settings"""
        try:
            if not self.token:
                self.log_test("ZKTeco Update Settings Test", False, "No authentication token available")
                return False
            
            # Test settings data
            settings_data = {
                "auto_sync_enabled": True,
                "sync_interval": 30
            }
            
            response = self.session.put(
                f"{BACKEND_URL}/hr/zkteco/settings",
                json=settings_data
            )
            
            if response.status_code == 200:
                result = response.json()
                
                if "message" in result:
                    # Verify settings were updated by getting them again
                    get_response = self.session.get(f"{BACKEND_URL}/hr/zkteco/devices")
                    
                    if get_response.status_code == 200:
                        data = get_response.json()
                        
                        if (data.get("auto_sync_enabled") == settings_data["auto_sync_enabled"] and
                            data.get("sync_interval") == settings_data["sync_interval"]):
                            
                            self.log_test(
                                "ZKTeco Update Settings Test", 
                                True, 
                                f"Successfully updated settings - auto_sync: {settings_data['auto_sync_enabled']}, interval: {settings_data['sync_interval']}min"
                            )
                            return True
                        else:
                            self.log_test(
                                "ZKTeco Update Settings Test", 
                                False, 
                                "Settings were not updated correctly",
                                data
                            )
                            return False
                    else:
                        self.log_test(
                            "ZKTeco Update Settings Test", 
                            False, 
                            "Failed to verify updated settings",
                            get_response.text
                        )
                        return False
                else:
                    self.log_test(
                        "ZKTeco Update Settings Test", 
                        False, 
                        "Response missing message field",
                        result
                    )
                    return False
            else:
                self.log_test(
                    "ZKTeco Update Settings Test", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("ZKTeco Update Settings Test", False, f"Error: {str(e)}")
            return False

    def test_zkteco_sync_attendance(self):
        """Test 6: POST /api/hr/zkteco/sync - Sync attendance"""
        try:
            if not self.token:
                self.log_test("ZKTeco Sync Attendance Test", False, "No authentication token available")
                return False
            
            response = self.session.post(f"{BACKEND_URL}/hr/zkteco/sync")
            
            if response.status_code == 200:
                result = response.json()
                
                # Check for the actual response format from the API
                if "message" in result and "success" in result:
                    success = result["success"]
                    message = result["message"]
                    imported = result.get("imported", 0)
                    updated = result.get("updated", 0)
                    
                    self.log_test(
                        "ZKTeco Sync Attendance Test", 
                        True, 
                        f"Sync completed - Success: {success}, Imported: {imported}, Updated: {updated}. {message}"
                    )
                    return True
                else:
                    self.log_test(
                        "ZKTeco Sync Attendance Test", 
                        False, 
                        "Response missing required fields (success, message)",
                        result
                    )
                    return False
            else:
                self.log_test(
                    "ZKTeco Sync Attendance Test", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("ZKTeco Sync Attendance Test", False, f"Error: {str(e)}")
            return False

    def test_zkteco_delete_device(self):
        """Test 7: DELETE /api/hr/zkteco/devices/{device_id} - Delete device"""
        try:
            if not self.token:
                self.log_test("ZKTeco Delete Device Test", False, "No authentication token available")
                return False
            
            if not hasattr(self, 'test_device_id'):
                self.log_test("ZKTeco Delete Device Test", False, "No test device ID available from previous test")
                return False
            
            response = self.session.delete(f"{BACKEND_URL}/hr/zkteco/devices/{self.test_device_id}")
            
            if response.status_code == 200:
                result = response.json()
                
                if "message" in result:
                    # Verify device was deleted by trying to get it
                    get_response = self.session.get(f"{BACKEND_URL}/hr/zkteco/devices")
                    
                    if get_response.status_code == 200:
                        data = get_response.json()
                        devices = data.get("devices", [])
                        
                        # Check if our test device is no longer in the active devices list
                        device_found = any(device.get("id") == self.test_device_id for device in devices)
                        
                        if not device_found:
                            self.log_test(
                                "ZKTeco Delete Device Test", 
                                True, 
                                f"Successfully deleted device {self.test_device_id}"
                            )
                            return True
                        else:
                            self.log_test(
                                "ZKTeco Delete Device Test", 
                                False, 
                                "Device still appears in active devices list after deletion"
                            )
                            return False
                    else:
                        self.log_test(
                            "ZKTeco Delete Device Test", 
                            False, 
                            "Failed to verify device deletion",
                            get_response.text
                        )
                        return False
                else:
                    self.log_test(
                        "ZKTeco Delete Device Test", 
                        False, 
                        "Response missing message field",
                        result
                    )
                    return False
            else:
                self.log_test(
                    "ZKTeco Delete Device Test", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("ZKTeco Delete Device Test", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("MILK COLLECTION CENTER ERP - ZKTECO SYNC MANAGER TESTING")
        print("=" * 60)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Credentials: {TEST_USERNAME}/{TEST_PASSWORD}")
        print("=" * 60)
        
        tests = [
            self.test_login_and_authentication,
            self.test_zkteco_get_devices_and_settings,
            self.test_zkteco_add_device,
            self.test_zkteco_test_device_connection,
            self.test_zkteco_update_sync_settings,
            self.test_zkteco_sync_attendance,
            self.test_zkteco_delete_device
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
            print()  # Add spacing between tests
        
        print("=" * 60)
        print(f"TEST SUMMARY: {passed}/{total} tests passed")
        print("=" * 60)
        
        # Print detailed results
        for result in self.test_results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"{status}: {result['test']}")
            if not result["success"] and result["details"]:
                print(f"   Details: {result['details']}")
        
        return passed == total

def main():
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()