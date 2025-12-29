#!/usr/bin/env python3
"""
Backend API Testing for Milk Collection Center ERP - HR Module
Tests the HR backend functionality as requested in Arabic review
Testing HR APIs with credentials: yasir/admin123
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://dairysystem.preview.emergentagent.com/api"

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
    
    def test_hr_employees_api(self):
        """Test GET /api/hr/employees - should return 4 employees"""
        try:
            response = self.session.get(f"{BACKEND_URL}/hr/employees")
            
            if response.status_code == 200:
                employees = response.json()
                if len(employees) == 4:
                    self.log_test(
                        "HR Employees API", 
                        True, 
                        f"Successfully retrieved 4 employees: {[emp.get('name') for emp in employees]}"
                    )
                    return True, employees
                else:
                    self.log_test(
                        "HR Employees API", 
                        False, 
                        f"Expected 4 employees, found {len(employees)}",
                        f"Employees: {[emp.get('name') for emp in employees]}"
                    )
                    return False, employees
            else:
                self.log_test(
                    "HR Employees API", 
                    False, 
                    f"API call failed with status {response.status_code}",
                    response.text
                )
                return False, []
                
        except Exception as e:
            self.log_test("HR Employees API", False, f"Error: {str(e)}")
            return False, []

    def test_hr_dashboard_api(self):
        """Test GET /api/hr/dashboard - should return HR statistics"""
        try:
            response = self.session.get(f"{BACKEND_URL}/hr/dashboard")
            
            if response.status_code == 200:
                dashboard = response.json()
                # Check if dashboard contains expected fields
                expected_fields = ["total_employees", "present_today", "absent_today", "pending_leaves", "pending_expenses"]
                found_fields = [field for field in expected_fields if field in dashboard]
                
                if len(found_fields) >= 3:  # At least 3 expected fields
                    self.log_test(
                        "HR Dashboard API", 
                        True, 
                        f"Dashboard retrieved with fields: {list(dashboard.keys())}"
                    )
                    return True
                else:
                    self.log_test(
                        "HR Dashboard API", 
                        False, 
                        f"Dashboard missing expected fields. Found: {list(dashboard.keys())}",
                        f"Expected at least 3 of: {expected_fields}"
                    )
                    return False
            else:
                self.log_test(
                    "HR Dashboard API", 
                    False, 
                    f"API call failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("HR Dashboard API", False, f"Error: {str(e)}")
            return False

    def test_hr_fingerprint_devices_api(self):
        """Test GET /api/hr/fingerprint-devices - should return 2 devices"""
        try:
            response = self.session.get(f"{BACKEND_URL}/hr/fingerprint-devices")
            
            if response.status_code == 200:
                devices = response.json()
                expected_ips = ["192.168.100.201", "192.168.100.214"]
                
                if len(devices) == 2:
                    device_ips = [device.get("ip_address") for device in devices]
                    missing_ips = [ip for ip in expected_ips if ip not in device_ips]
                    
                    if not missing_ips:
                        self.log_test(
                            "HR Fingerprint Devices API", 
                            True, 
                            f"Found 2 devices with expected IPs: {device_ips}"
                        )
                        return True
                    else:
                        self.log_test(
                            "HR Fingerprint Devices API", 
                            False, 
                            f"Missing device IPs: {missing_ips}. Found: {device_ips}"
                        )
                        return False
                else:
                    self.log_test(
                        "HR Fingerprint Devices API", 
                        False, 
                        f"Expected 2 devices, found {len(devices)}",
                        f"Devices: {[d.get('ip_address') for d in devices]}"
                    )
                    return False
            else:
                self.log_test(
                    "HR Fingerprint Devices API", 
                    False, 
                    f"API call failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("HR Fingerprint Devices API", False, f"Error: {str(e)}")
            return False

    def test_hr_leave_request_workflow(self):
        """Test POST /api/hr/leave-requests and approval workflow"""
        try:
            # First get employees to find Ahmed
            employees_success, employees = self.test_hr_employees_api()
            if not employees_success:
                self.log_test("HR Leave Request Workflow", False, "Cannot test without employees data")
                return False
            
            # Find Ahmed employee
            ahmed_employee = None
            for emp in employees:
                if "ahmed" in emp.get("name", "").lower():
                    ahmed_employee = emp
                    break
            
            if not ahmed_employee:
                # Use first employee if Ahmed not found
                ahmed_employee = employees[0] if employees else None
                
            if not ahmed_employee:
                self.log_test("HR Leave Request Workflow", False, "No employees found to create leave request")
                return False
            
            # Create leave request
            leave_data = {
                "employee_id": ahmed_employee["id"],
                "employee_name": ahmed_employee["name"],
                "leave_type": "annual",
                "start_date": "2025-01-15",
                "end_date": "2025-01-17",
                "reason": "Personal vacation",
                "days_count": 3
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/hr/leave-requests",
                json=leave_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                leave_request = response.json()
                request_id = leave_request.get("id")
                
                # Test GET leave requests
                get_response = self.session.get(f"{BACKEND_URL}/hr/leave-requests")
                if get_response.status_code == 200:
                    requests = get_response.json()
                    found_request = any(req.get("id") == request_id for req in requests)
                    
                    if found_request:
                        # Test approval
                        approve_response = self.session.put(f"{BACKEND_URL}/hr/leave-requests/{request_id}/approve")
                        if approve_response.status_code == 200:
                            approved_request = approve_response.json()
                            if approved_request.get("status") == "approved":
                                self.log_test(
                                    "HR Leave Request Workflow", 
                                    True, 
                                    f"Successfully created, retrieved, and approved leave request for {ahmed_employee['name']}"
                                )
                                return True
                            else:
                                self.log_test(
                                    "HR Leave Request Workflow", 
                                    False, 
                                    "Leave request not properly approved",
                                    f"Status: {approved_request.get('status')}"
                                )
                                return False
                        else:
                            self.log_test(
                                "HR Leave Request Workflow", 
                                False, 
                                f"Approval failed with status {approve_response.status_code}",
                                approve_response.text
                            )
                            return False
                    else:
                        self.log_test(
                            "HR Leave Request Workflow", 
                            False, 
                            "Created request not found in GET requests"
                        )
                        return False
                else:
                    self.log_test(
                        "HR Leave Request Workflow", 
                        False, 
                        f"GET requests failed with status {get_response.status_code}",
                        get_response.text
                    )
                    return False
            else:
                self.log_test(
                    "HR Leave Request Workflow", 
                    False, 
                    f"Leave request creation failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("HR Leave Request Workflow", False, f"Error: {str(e)}")
            return False

    def test_hr_expense_request_api(self):
        """Test POST /api/hr/expense-requests - create expense request"""
        try:
            # Get first employee for expense request
            employees_success, employees = self.test_hr_employees_api()
            if not employees_success or not employees:
                self.log_test("HR Expense Request API", False, "Cannot test without employees data")
                return False
            
            employee = employees[0]
            
            # Create expense request
            expense_data = {
                "employee_id": employee["id"],
                "employee_name": employee["name"],
                "expense_type": "travel",
                "amount": 150.0,
                "description": "Business trip to Muscat",
                "receipt_url": "https://example.com/receipt.pdf"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/hr/expense-requests",
                json=expense_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                expense_request = response.json()
                if (expense_request.get("employee_name") == employee["name"] and 
                    expense_request.get("amount") == 150.0 and
                    expense_request.get("status") == "pending"):
                    self.log_test(
                        "HR Expense Request API", 
                        True, 
                        f"Successfully created expense request for {employee['name']}"
                    )
                    return True
                else:
                    self.log_test(
                        "HR Expense Request API", 
                        False, 
                        "Expense request data not correct",
                        f"Response: {expense_request}"
                    )
                    return False
            else:
                self.log_test(
                    "HR Expense Request API", 
                    False, 
                    f"Expense request creation failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("HR Expense Request API", False, f"Error: {str(e)}")
            return False

    def test_hr_official_letter_api(self):
        """Test POST /api/hr/official-letters - create official letter (salary certificate)"""
        try:
            # Get first employee for official letter
            employees_success, employees = self.test_hr_employees_api()
            if not employees_success or not employees:
                self.log_test("HR Official Letter API", False, "Cannot test without employees data")
                return False
            
            employee = employees[0]
            
            # Create official letter (salary certificate)
            letter_data = {
                "employee_id": employee["id"],
                "employee_name": employee["name"],
                "letter_type": "salary_certificate",
                "purpose": "Bank loan application",
                "recipient": "National Bank of Oman",
                "content": f"This is to certify that {employee['name']} is employed with our organization."
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/hr/official-letters",
                json=letter_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                letter = response.json()
                if (letter.get("employee_name") == employee["name"] and 
                    letter.get("letter_type") == "salary_certificate" and
                    letter.get("status") == "pending"):
                    self.log_test(
                        "HR Official Letter API", 
                        True, 
                        f"Successfully created salary certificate for {employee['name']}"
                    )
                    return True
                else:
                    self.log_test(
                        "HR Official Letter API", 
                        False, 
                        "Official letter data not correct",
                        f"Response: {letter}"
                    )
                    return False
            else:
                self.log_test(
                    "HR Official Letter API", 
                    False, 
                    f"Official letter creation failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("HR Official Letter API", False, f"Error: {str(e)}")
            return False

    def test_hr_car_contract_api(self):
        """Test POST /api/hr/car-contracts - create car contract"""
        try:
            # Get first employee for car contract
            employees_success, employees = self.test_hr_employees_api()
            if not employees_success or not employees:
                self.log_test("HR Car Contract API", False, "Cannot test without employees data")
                return False
            
            employee = employees[0]
            
            # Create car contract
            contract_data = {
                "employee_id": employee["id"],
                "employee_name": employee["name"],
                "car_type": "Toyota Camry",
                "plate_number": "12345-OM",
                "model_year": "2023",
                "color": "White",
                "start_date": "2025-01-01",
                "end_date": "2025-12-31",
                "monthly_rent": 300.0,
                "total_value": 3600.0,
                "contract_type": "rent",
                "notes": "Company car for business use"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/hr/car-contracts",
                json=contract_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                contract = response.json()
                if (contract.get("employee_name") == employee["name"] and 
                    contract.get("car_type") == "Toyota Camry" and
                    contract.get("status") == "active"):
                    self.log_test(
                        "HR Car Contract API", 
                        True, 
                        f"Successfully created car contract for {employee['name']}"
                    )
                    return True
                else:
                    self.log_test(
                        "HR Car Contract API", 
                        False, 
                        "Car contract data not correct",
                        f"Response: {contract}"
                    )
                    return False
            else:
                self.log_test(
                    "HR Car Contract API", 
                    False, 
                    f"Car contract creation failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("HR Car Contract API", False, f"Error: {str(e)}")
            return False

    def test_hr_attendance_report_api(self):
        """Test GET /api/hr/attendance/report?year=2025&month=12 - attendance report"""
        try:
            response = self.session.get(f"{BACKEND_URL}/hr/attendance/report?year=2025&month=12")
            
            if response.status_code == 200:
                report = response.json()
                if (report.get("year") == 2025 and 
                    report.get("month") == 12 and
                    "report" in report):
                    self.log_test(
                        "HR Attendance Report API", 
                        True, 
                        f"Successfully retrieved attendance report for December 2025"
                    )
                    return True
                else:
                    self.log_test(
                        "HR Attendance Report API", 
                        False, 
                        "Attendance report structure not correct",
                        f"Response: {report}"
                    )
                    return False
            else:
                self.log_test(
                    "HR Attendance Report API", 
                    False, 
                    f"Attendance report failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("HR Attendance Report API", False, f"Error: {str(e)}")
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
        
        # Run all HR API tests
        tests = [
            self.test_hr_employees_api,
            self.test_hr_dashboard_api,
            self.test_hr_fingerprint_devices_api,
            self.test_hr_leave_request_workflow,
            self.test_hr_expense_request_api,
            self.test_hr_official_letter_api,
            self.test_hr_car_contract_api,
            self.test_hr_attendance_report_api
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