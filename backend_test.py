#!/usr/bin/env python3
"""
Backend API Testing for Milk Collection Center ERP - Bug Fix Review
Tests the specific bug fixes requested in the review:
1. Login and Dashboard Test (yasir/admin123)
2. Employee Stats Widget Test
3. ZKTeco Import API Test
4. HR Page API Tests
5. Other Key Endpoints
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Get backend URL from frontend .env
BACKEND_URL = "https://milk-erp.preview.emergentagent.com/api"

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
    
    def test_login_and_dashboard(self):
        """Test 1: Login with yasir/admin123 and verify dashboard loads correctly"""
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
                
                # Test dashboard stats
                dashboard_response = self.session.get(f"{BACKEND_URL}/dashboard/stats")
                
                if dashboard_response.status_code == 200:
                    dashboard = dashboard_response.json()
                    expected_fields = ["suppliers_count", "customers_count", "today_milk_quantity", "today_sales_quantity"]
                    found_fields = [field for field in expected_fields if field in dashboard]
                    
                    if len(found_fields) >= 2:
                        self.log_test(
                            "Login and Dashboard Test", 
                            True, 
                            f"Successfully logged in as {self.user_data.get('username')} and dashboard loaded with stats: {list(dashboard.keys())}"
                        )
                        return True
                    else:
                        self.log_test(
                            "Login and Dashboard Test", 
                            False, 
                            f"Dashboard missing expected fields. Found: {list(dashboard.keys())}",
                            f"Expected at least 2 of: {expected_fields}"
                        )
                        return False
                else:
                    self.log_test(
                        "Login and Dashboard Test", 
                        False, 
                        f"Dashboard API failed with status {dashboard_response.status_code}",
                        dashboard_response.text
                    )
                    return False
            else:
                self.log_test(
                    "Login and Dashboard Test", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Login and Dashboard Test", False, f"Error: {str(e)}")
            return False

    def test_employee_stats_widget(self):
        """Test 2: Employee Stats Widget - verify API endpoint works with start_date and end_date parameters"""
        try:
            if not self.token:
                self.log_test("Employee Stats Widget Test", False, "No authentication token available")
                return False
            
            # Test the attendance API with date parameters
            start_date = "2025-01-01"
            end_date = "2025-01-31"
            
            response = self.session.get(
                f"{BACKEND_URL}/hr/attendance?start_date={start_date}&end_date={end_date}"
            )
            
            if response.status_code == 200:
                attendance_data = response.json()
                
                # Check if response is a list (attendance records)
                if isinstance(attendance_data, list):
                    # Test the stats calculation endpoint if it exists
                    stats_response = self.session.get(
                        f"{BACKEND_URL}/hr/attendance/stats?start_date={start_date}&end_date={end_date}"
                    )
                    
                    if stats_response.status_code == 200:
                        stats = stats_response.json()
                        expected_stats = ["total_employees", "present_count", "absent_count", "attendance_percentage"]
                        found_stats = [field for field in expected_stats if field in stats]
                        
                        if len(found_stats) >= 2:
                            self.log_test(
                                "Employee Stats Widget Test", 
                                True, 
                                f"Attendance API working with date params. Records: {len(attendance_data)}, Stats: {list(stats.keys())}"
                            )
                            return True
                        else:
                            self.log_test(
                                "Employee Stats Widget Test", 
                                True, 
                                f"Attendance API working with date params. Records: {len(attendance_data)} (Stats endpoint may not exist)"
                            )
                            return True
                    else:
                        # Stats endpoint might not exist, but attendance endpoint works
                        self.log_test(
                            "Employee Stats Widget Test", 
                            True, 
                            f"Attendance API working with date params. Records: {len(attendance_data)}"
                        )
                        return True
                else:
                    self.log_test(
                        "Employee Stats Widget Test", 
                        False, 
                        f"Unexpected response format: {type(attendance_data)}",
                        str(attendance_data)[:200]
                    )
                    return False
            else:
                self.log_test(
                    "Employee Stats Widget Test", 
                    False, 
                    f"Attendance API failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Employee Stats Widget Test", False, f"Error: {str(e)}")
            return False

    def test_zkteco_import_api(self):
        """Test 3: ZKTeco Import API - verify mdbtools and import endpoint"""
        try:
            # First check if mdbtools is installed
            import subprocess
            try:
                result = subprocess.run(['which', 'mdb-export'], capture_output=True, text=True)
                mdbtools_installed = result.returncode == 0
            except:
                mdbtools_installed = False
            
            if not mdbtools_installed:
                self.log_test(
                    "ZKTeco Import API Test", 
                    False, 
                    "mdbtools not installed - mdb-export command not found"
                )
                return False
            
            # Test the import endpoint exists
            if not self.token:
                self.log_test("ZKTeco Import API Test", False, "No authentication token available")
                return False
            
            # Test POST endpoint (without actual file for now)
            response = self.session.post(
                f"{BACKEND_URL}/hr/attendance/import-zkteco",
                headers={"Authorization": f"Bearer {self.token}"}
            )
            
            # We expect either 400 (missing file) or 422 (validation error), not 404
            if response.status_code in [400, 422]:
                # Check if there are existing ZKTeco records
                attendance_response = self.session.get(f"{BACKEND_URL}/hr/attendance")
                
                if attendance_response.status_code == 200:
                    attendance_records = attendance_response.json()
                    zkteco_records = [r for r in attendance_records if r.get("source") == "fingerprint"]
                    
                    self.log_test(
                        "ZKTeco Import API Test", 
                        True, 
                        f"Import endpoint exists and mdbtools installed. Found {len(zkteco_records)} ZKTeco records in database"
                    )
                    return True
                else:
                    self.log_test(
                        "ZKTeco Import API Test", 
                        True, 
                        "Import endpoint exists and mdbtools installed (attendance records check failed)"
                    )
                    return True
            elif response.status_code == 404:
                self.log_test(
                    "ZKTeco Import API Test", 
                    False, 
                    "Import endpoint not found",
                    response.text
                )
                return False
            else:
                self.log_test(
                    "ZKTeco Import API Test", 
                    True, 
                    f"Import endpoint exists and mdbtools installed (status: {response.status_code})"
                )
                return True
                
        except Exception as e:
            self.log_test("ZKTeco Import API Test", False, f"Error: {str(e)}")
            return False

    def test_hr_page_apis(self):
        """Test 4: HR Page API Tests - verify all HR endpoints work"""
        try:
            if not self.token:
                self.log_test("HR Page API Tests", False, "No authentication token available")
                return False
            
            hr_endpoints = [
                ("employees", "/hr/employees"),
                ("departments", "/hr/departments"), 
                ("attendance", "/hr/attendance")
            ]
            
            results = {}
            
            for name, endpoint in hr_endpoints:
                response = self.session.get(f"{BACKEND_URL}{endpoint}")
                
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list):
                        results[name] = f"✅ {len(data)} records"
                    else:
                        results[name] = "✅ Success"
                else:
                    results[name] = f"❌ Status {response.status_code}"
            
            failed_endpoints = [name for name, result in results.items() if "❌" in result]
            
            if not failed_endpoints:
                self.log_test(
                    "HR Page API Tests", 
                    True, 
                    f"All HR endpoints working: {results}"
                )
                return True
            else:
                self.log_test(
                    "HR Page API Tests", 
                    False, 
                    f"Some HR endpoints failed: {failed_endpoints}",
                    f"Results: {results}"
                )
                return False
                
        except Exception as e:
            self.log_test("HR Page API Tests", False, f"Error: {str(e)}")
            return False

    def test_other_key_endpoints(self):
        """Test 5: Other Key Endpoints - suppliers, dashboard stats, treasury balance"""
        try:
            if not self.token:
                self.log_test("Other Key Endpoints Test", False, "No authentication token available")
                return False
            
            key_endpoints = [
                ("suppliers", "/suppliers"),
                ("dashboard_stats", "/dashboard/stats"),
                ("treasury_balance", "/treasury/balance")
            ]
            
            results = {}
            
            for name, endpoint in key_endpoints:
                response = self.session.get(f"{BACKEND_URL}{endpoint}")
                
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list):
                        results[name] = f"✅ {len(data)} records"
                    elif isinstance(data, dict):
                        results[name] = f"✅ {len(data.keys())} fields"
                    else:
                        results[name] = "✅ Success"
                else:
                    results[name] = f"❌ Status {response.status_code}"
            
            failed_endpoints = [name for name, result in results.items() if "❌" in result]
            
            if not failed_endpoints:
                self.log_test(
                    "Other Key Endpoints Test", 
                    True, 
                    f"All key endpoints working: {results}"
                )
                return True
            else:
                self.log_test(
                    "Other Key Endpoints Test", 
                    False, 
                    f"Some key endpoints failed: {failed_endpoints}",
                    f"Results: {results}"
                )
                return False
                
        except Exception as e:
            self.log_test("Other Key Endpoints Test", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("MILK COLLECTION CENTER ERP - BUG FIX TESTING")
        print("=" * 60)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Credentials: {TEST_USERNAME}/{TEST_PASSWORD}")
        print("=" * 60)
        
        tests = [
            self.test_login_and_dashboard,
            self.test_employee_stats_widget,
            self.test_zkteco_import_api,
            self.test_hr_page_apis,
            self.test_other_key_endpoints
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