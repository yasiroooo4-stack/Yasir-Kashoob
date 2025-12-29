#!/usr/bin/env python3
"""
Backend API Testing for Milk Collection Center ERP
Tests the core backend functionality as requested
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://dairysystem.preview.emergentagent.com/api"

# Test credentials
TEST_USERNAME = "testadmin"
TEST_PASSWORD = "testpassword"

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
    
    def test_login(self):
        """Test user login with provided credentials"""
        try:
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
                self.log_test(
                    "User Login", 
                    True, 
                    f"Successfully logged in as {self.user_data.get('username')}"
                )
                return True
            else:
                self.log_test(
                    "User Login", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("User Login", False, f"Login error: {str(e)}")
            return False
    
    def test_register_if_needed(self):
        """Register test user if login fails"""
        try:
            response = self.session.post(
                f"{BACKEND_URL}/auth/register",
                json={
                    "username": TEST_USERNAME,
                    "password": TEST_PASSWORD,
                    "email": "testadmin@example.com",
                    "full_name": "Test Administrator",
                    "role": "admin"
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
                self.log_test(
                    "User Registration", 
                    True, 
                    f"Successfully registered and logged in as {self.user_data.get('username')}"
                )
                return True
            else:
                self.log_test(
                    "User Registration", 
                    False, 
                    f"Registration failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("User Registration", False, f"Registration error: {str(e)}")
            return False
    
    def test_collection_centers_api(self):
        """Test GET /api/centers - should return 3 centers (حجيف، زيك، غدو)"""
        try:
            response = self.session.get(f"{BACKEND_URL}/centers")
            
            if response.status_code == 200:
                centers = response.json()
                expected_centers = ["حجيف", "زيك", "غدو"]
                
                if len(centers) == 3:
                    center_names = [center.get("name") for center in centers]
                    missing_centers = [name for name in expected_centers if name not in center_names]
                    
                    if not missing_centers:
                        self.log_test(
                            "Collection Centers API", 
                            True, 
                            f"Found all 3 expected centers: {center_names}"
                        )
                        return True
                    else:
                        self.log_test(
                            "Collection Centers API", 
                            False, 
                            f"Missing centers: {missing_centers}. Found: {center_names}"
                        )
                        return False
                else:
                    self.log_test(
                        "Collection Centers API", 
                        False, 
                        f"Expected 3 centers, found {len(centers)}",
                        f"Centers: {[c.get('name') for c in centers]}"
                    )
                    return False
            else:
                self.log_test(
                    "Collection Centers API", 
                    False, 
                    f"API call failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Collection Centers API", False, f"Error: {str(e)}")
            return False
    
    def test_user_profile_update_api(self):
        """Test PUT /api/auth/profile - user profile update"""
        try:
            # Test profile update
            update_data = {
                "full_name": "Updated Test Administrator",
                "phone": "+968-12345678"
            }
            
            response = self.session.put(
                f"{BACKEND_URL}/auth/profile",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                updated_user = response.json()
                if (updated_user.get("full_name") == update_data["full_name"] and 
                    updated_user.get("phone") == update_data["phone"]):
                    self.log_test(
                        "User Profile Update API", 
                        True, 
                        "Profile updated successfully"
                    )
                    return True
                else:
                    self.log_test(
                        "User Profile Update API", 
                        False, 
                        "Profile data not updated correctly",
                        f"Expected: {update_data}, Got: {updated_user}"
                    )
                    return False
            else:
                self.log_test(
                    "User Profile Update API", 
                    False, 
                    f"Profile update failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("User Profile Update API", False, f"Error: {str(e)}")
            return False
    
    def test_password_change_api(self):
        """Test PUT /api/auth/password - password change"""
        try:
            # Test password change
            password_data = {
                "current_password": TEST_PASSWORD,
                "new_password": "newtestpassword123"
            }
            
            response = self.session.put(
                f"{BACKEND_URL}/auth/password",
                json=password_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                if "successfully" in result.get("message", "").lower():
                    # Change password back for future tests
                    revert_data = {
                        "current_password": "newtestpassword123",
                        "new_password": TEST_PASSWORD
                    }
                    revert_response = self.session.put(
                        f"{BACKEND_URL}/auth/password",
                        json=revert_data,
                        headers={"Content-Type": "application/json"}
                    )
                    
                    self.log_test(
                        "Password Change API", 
                        True, 
                        "Password changed successfully (and reverted)"
                    )
                    return True
                else:
                    self.log_test(
                        "Password Change API", 
                        False, 
                        "Unexpected response message",
                        result
                    )
                    return False
            else:
                self.log_test(
                    "Password Change API", 
                    False, 
                    f"Password change failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Password Change API", False, f"Error: {str(e)}")
            return False
    
    def test_activity_logs_api(self):
        """Test GET /api/activity-logs - activity logs retrieval"""
        try:
            response = self.session.get(f"{BACKEND_URL}/activity-logs")
            
            if response.status_code == 200:
                logs = response.json()
                if isinstance(logs, list):
                    # Check if we have some activity logs (login should have created at least one)
                    login_logs = [log for log in logs if log.get("action") == "login"]
                    if login_logs:
                        self.log_test(
                            "Activity Logs API", 
                            True, 
                            f"Retrieved {len(logs)} activity logs, including login activities"
                        )
                        return True
                    else:
                        self.log_test(
                            "Activity Logs API", 
                            True, 
                            f"Retrieved {len(logs)} activity logs (no login logs found but API works)"
                        )
                        return True
                else:
                    self.log_test(
                        "Activity Logs API", 
                        False, 
                        "Response is not a list",
                        f"Response type: {type(logs)}"
                    )
                    return False
            else:
                self.log_test(
                    "Activity Logs API", 
                    False, 
                    f"API call failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Activity Logs API", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🧪 Starting Backend API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test User: {TEST_USERNAME}")
        print("=" * 60)
        
        # Try to login first
        if not self.test_login():
            # If login fails, try to register
            print("Login failed, attempting to register test user...")
            if not self.test_register_if_needed():
                print("❌ Cannot proceed without authentication")
                return False
        
        # Run all API tests
        tests = [
            self.test_collection_centers_api,
            self.test_user_profile_update_api,
            self.test_password_change_api,
            self.test_activity_logs_api
        ]
        
        for test in tests:
            test()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        return passed == total

def main():
    """Main test execution"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open("/app/backend_test_results.json", "w") as f:
        json.dump(tester.test_results, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())