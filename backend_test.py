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
BACKEND_URL = "https://morooj-milk.preview.emergentagent.com/api"

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

    # ==================== ACTIVITY LOGGING TESTS ====================
    
    def test_activity_logs_login_logged(self):
        """Test that login action is logged in activity logs"""
        try:
            response = self.session.get(f"{BACKEND_URL}/activity-logs?action=login&limit=10")
            
            if response.status_code == 200:
                logs = response.json()
                # Find login log for current user
                login_log = None
                for log in logs:
                    if (log.get("action") == "login" and 
                        log.get("user_name") == self.user_data.get("full_name")):
                        login_log = log
                        break
                
                if login_log:
                    required_fields = ["user_id", "user_name", "action", "timestamp"]
                    missing_fields = [field for field in required_fields if not login_log.get(field)]
                    
                    if not missing_fields:
                        self.log_test(
                            "Activity Log - Login Logged", 
                            True, 
                            f"Login action properly logged for user {login_log.get('user_name')}"
                        )
                        return True
                    else:
                        self.log_test(
                            "Activity Log - Login Logged", 
                            False, 
                            f"Login log missing required fields: {missing_fields}",
                            f"Log entry: {login_log}"
                        )
                        return False
                else:
                    self.log_test(
                        "Activity Log - Login Logged", 
                        False, 
                        f"No login log found for user {self.user_data.get('full_name')}",
                        f"Available logs: {[log.get('action') + ' by ' + log.get('user_name') for log in logs[:5]]}"
                    )
                    return False
            else:
                self.log_test(
                    "Activity Log - Login Logged", 
                    False, 
                    f"Activity logs API failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Activity Log - Login Logged", False, f"Error: {str(e)}")
            return False

    def test_activity_logs_supplier_crud(self):
        """Test that supplier CRUD operations are logged"""
        try:
            # Create a supplier
            supplier_data = {
                "name": "مزرعة الخير للألبان",
                "phone": "+968 9876 5432",
                "address": "صلالة، ظفار",
                "supplier_code": "SUP001",
                "bank_account": "1234567890",
                "center_id": None,
                "center_name": None,
                "national_id": "12345678",
                "farm_size": 50.5,
                "cattle_count": 25
            }
            
            create_response = self.session.post(
                f"{BACKEND_URL}/suppliers",
                json=supplier_data,
                headers={"Content-Type": "application/json"}
            )
            
            if create_response.status_code != 200:
                self.log_test(
                    "Activity Log - Supplier CRUD", 
                    False, 
                    f"Failed to create supplier: {create_response.status_code}",
                    create_response.text
                )
                return False
            
            supplier = create_response.json()
            supplier_id = supplier.get("id")
            
            # Check if create_supplier action is logged
            logs_response = self.session.get(f"{BACKEND_URL}/activity-logs?action=create_supplier&limit=10")
            if logs_response.status_code != 200:
                self.log_test(
                    "Activity Log - Supplier CRUD", 
                    False, 
                    f"Failed to get activity logs: {logs_response.status_code}",
                    logs_response.text
                )
                return False
            
            logs = logs_response.json()
            create_log = None
            for log in logs:
                if (log.get("action") == "create_supplier" and 
                    log.get("entity_name") == supplier_data["name"]):
                    create_log = log
                    break
            
            if not create_log:
                self.log_test(
                    "Activity Log - Supplier CRUD", 
                    False, 
                    f"Create supplier action not logged for {supplier_data['name']}",
                    f"Available logs: {[log.get('action') + ' - ' + str(log.get('entity_name')) for log in logs[:5]]}"
                )
                return False
            
            # Update the supplier
            update_data = {
                "name": "مزرعة الخير المحدثة",
                "phone": "+968 9876 5432",
                "address": "صلالة، ظفار - محدث",
                "supplier_code": "SUP001",
                "bank_account": "1234567890",
                "center_id": None,
                "center_name": None,
                "national_id": "12345678",
                "farm_size": 60.0,
                "cattle_count": 30
            }
            
            update_response = self.session.put(
                f"{BACKEND_URL}/suppliers/{supplier_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            if update_response.status_code != 200:
                self.log_test(
                    "Activity Log - Supplier CRUD", 
                    False, 
                    f"Failed to update supplier: {update_response.status_code}",
                    update_response.text
                )
                return False
            
            # Check if update_supplier action is logged
            logs_response = self.session.get(f"{BACKEND_URL}/activity-logs?action=update_supplier&limit=10")
            if logs_response.status_code == 200:
                logs = logs_response.json()
                update_log = None
                for log in logs:
                    if (log.get("action") == "update_supplier" and 
                        log.get("entity_id") == supplier_id):
                        update_log = log
                        break
                
                if update_log:
                    # Verify log structure
                    required_fields = ["user_id", "user_name", "action", "entity_type", "entity_id", "entity_name", "timestamp"]
                    missing_fields = [field for field in required_fields if not update_log.get(field)]
                    
                    if not missing_fields:
                        self.log_test(
                            "Activity Log - Supplier CRUD", 
                            True, 
                            f"Supplier CRUD operations properly logged (create & update) for {supplier_data['name']}"
                        )
                        return True
                    else:
                        self.log_test(
                            "Activity Log - Supplier CRUD", 
                            False, 
                            f"Update log missing required fields: {missing_fields}",
                            f"Log entry: {update_log}"
                        )
                        return False
                else:
                    self.log_test(
                        "Activity Log - Supplier CRUD", 
                        False, 
                        f"Update supplier action not logged for supplier ID {supplier_id}"
                    )
                    return False
            else:
                self.log_test(
                    "Activity Log - Supplier CRUD", 
                    False, 
                    f"Failed to get update logs: {logs_response.status_code}",
                    logs_response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Activity Log - Supplier CRUD", False, f"Error: {str(e)}")
            return False

    def test_activity_logs_customer_crud(self):
        """Test that customer CRUD operations are logged"""
        try:
            # Create a customer
            customer_data = {
                "name": "شركة الألبان المتقدمة",
                "phone": "+968 2468 1357",
                "address": "مسقط، مسقط",
                "customer_type": "wholesale",
                "credit_limit": 5000.0
            }
            
            create_response = self.session.post(
                f"{BACKEND_URL}/customers",
                json=customer_data,
                headers={"Content-Type": "application/json"}
            )
            
            if create_response.status_code != 200:
                self.log_test(
                    "Activity Log - Customer CRUD", 
                    False, 
                    f"Failed to create customer: {create_response.status_code}",
                    create_response.text
                )
                return False
            
            customer = create_response.json()
            customer_id = customer.get("id")
            
            # Check if create_customer action is logged
            logs_response = self.session.get(f"{BACKEND_URL}/activity-logs?action=create_customer&limit=10")
            if logs_response.status_code != 200:
                self.log_test(
                    "Activity Log - Customer CRUD", 
                    False, 
                    f"Failed to get activity logs: {logs_response.status_code}",
                    logs_response.text
                )
                return False
            
            logs = logs_response.json()
            create_log = None
            for log in logs:
                if (log.get("action") == "create_customer" and 
                    log.get("entity_name") == customer_data["name"]):
                    create_log = log
                    break
            
            if create_log:
                # Verify log structure
                required_fields = ["user_id", "user_name", "action", "entity_type", "entity_id", "entity_name", "timestamp"]
                missing_fields = [field for field in required_fields if not create_log.get(field)]
                
                if not missing_fields:
                    self.log_test(
                        "Activity Log - Customer CRUD", 
                        True, 
                        f"Customer create operation properly logged for {customer_data['name']}"
                    )
                    return True
                else:
                    self.log_test(
                        "Activity Log - Customer CRUD", 
                        False, 
                        f"Create log missing required fields: {missing_fields}",
                        f"Log entry: {create_log}"
                    )
                    return False
            else:
                self.log_test(
                    "Activity Log - Customer CRUD", 
                    False, 
                    f"Create customer action not logged for {customer_data['name']}",
                    f"Available logs: {[log.get('action') + ' - ' + str(log.get('entity_name')) for log in logs[:5]]}"
                )
                return False
                
        except Exception as e:
            self.log_test("Activity Log - Customer CRUD", False, f"Error: {str(e)}")
            return False

    def test_activity_logs_hr_leave_request(self):
        """Test that HR leave request operations are logged"""
        try:
            # Get employees first
            employees_response = self.session.get(f"{BACKEND_URL}/hr/employees")
            if employees_response.status_code != 200:
                self.log_test(
                    "Activity Log - HR Leave Request", 
                    False, 
                    f"Failed to get employees: {employees_response.status_code}",
                    employees_response.text
                )
                return False
            
            employees = employees_response.json()
            if not employees:
                self.log_test(
                    "Activity Log - HR Leave Request", 
                    False, 
                    "No employees found to create leave request"
                )
                return False
            
            employee = employees[0]
            
            # Create leave request
            leave_data = {
                "employee_id": employee["id"],
                "employee_name": employee["name"],
                "leave_type": "annual",
                "start_date": "2025-02-15",
                "end_date": "2025-02-17",
                "reason": "Family vacation",
                "days_count": 3
            }
            
            create_response = self.session.post(
                f"{BACKEND_URL}/hr/leave-requests",
                json=leave_data,
                headers={"Content-Type": "application/json"}
            )
            
            if create_response.status_code != 200:
                self.log_test(
                    "Activity Log - HR Leave Request", 
                    False, 
                    f"Failed to create leave request: {create_response.status_code}",
                    create_response.text
                )
                return False
            
            leave_request = create_response.json()
            
            # Check if create_leave_request action is logged
            logs_response = self.session.get(f"{BACKEND_URL}/activity-logs?action=create_leave_request&limit=10")
            if logs_response.status_code != 200:
                self.log_test(
                    "Activity Log - HR Leave Request", 
                    False, 
                    f"Failed to get activity logs: {logs_response.status_code}",
                    logs_response.text
                )
                return False
            
            logs = logs_response.json()
            create_log = None
            for log in logs:
                if (log.get("action") == "create_leave_request" and 
                    log.get("entity_name") == employee["name"]):
                    create_log = log
                    break
            
            if create_log:
                # Verify log structure
                required_fields = ["user_id", "user_name", "action", "entity_type", "entity_name", "timestamp"]
                missing_fields = [field for field in required_fields if not create_log.get(field)]
                
                if not missing_fields:
                    self.log_test(
                        "Activity Log - HR Leave Request", 
                        True, 
                        f"HR leave request creation properly logged for {employee['name']}"
                    )
                    return True
                else:
                    self.log_test(
                        "Activity Log - HR Leave Request", 
                        False, 
                        f"Leave request log missing required fields: {missing_fields}",
                        f"Log entry: {create_log}"
                    )
                    return False
            else:
                self.log_test(
                    "Activity Log - HR Leave Request", 
                    False, 
                    f"Create leave request action not logged for {employee['name']}",
                    f"Available logs: {[log.get('action') + ' - ' + str(log.get('entity_name')) for log in logs[:5]]}"
                )
                return False
                
        except Exception as e:
            self.log_test("Activity Log - HR Leave Request", False, f"Error: {str(e)}")
            return False

    def test_activity_logs_api_filters(self):
        """Test Activity Logs API filters (limit, action)"""
        try:
            # Test limit filter
            limit_response = self.session.get(f"{BACKEND_URL}/activity-logs?limit=5")
            if limit_response.status_code != 200:
                self.log_test(
                    "Activity Log - API Filters", 
                    False, 
                    f"Failed to get limited logs: {limit_response.status_code}",
                    limit_response.text
                )
                return False
            
            limited_logs = limit_response.json()
            if len(limited_logs) > 5:
                self.log_test(
                    "Activity Log - API Filters", 
                    False, 
                    f"Limit filter not working: expected max 5 logs, got {len(limited_logs)}"
                )
                return False
            
            # Test action filter
            action_response = self.session.get(f"{BACKEND_URL}/activity-logs?action=login")
            if action_response.status_code != 200:
                self.log_test(
                    "Activity Log - API Filters", 
                    False, 
                    f"Failed to get filtered logs: {action_response.status_code}",
                    action_response.text
                )
                return False
            
            filtered_logs = action_response.json()
            non_login_logs = [log for log in filtered_logs if log.get("action") != "login"]
            
            if non_login_logs:
                self.log_test(
                    "Activity Log - API Filters", 
                    False, 
                    f"Action filter not working: found {len(non_login_logs)} non-login logs",
                    f"Non-login actions: {[log.get('action') for log in non_login_logs[:3]]}"
                )
                return False
            
            # Test sorting (newest first)
            all_logs_response = self.session.get(f"{BACKEND_URL}/activity-logs?limit=10")
            if all_logs_response.status_code == 200:
                all_logs = all_logs_response.json()
                if len(all_logs) >= 2:
                    # Check if timestamps are in descending order
                    timestamps = [log.get("timestamp") for log in all_logs if log.get("timestamp")]
                    if len(timestamps) >= 2:
                        is_sorted = all(timestamps[i] >= timestamps[i+1] for i in range(len(timestamps)-1))
                        if not is_sorted:
                            self.log_test(
                                "Activity Log - API Filters", 
                                False, 
                                "Logs not sorted by timestamp descending (newest first)",
                                f"First 3 timestamps: {timestamps[:3]}"
                            )
                            return False
            
            self.log_test(
                "Activity Log - API Filters", 
                True, 
                f"Activity logs API filters working correctly (limit={len(limited_logs)}, action filter, sorting)"
            )
            return True
                
        except Exception as e:
            self.log_test("Activity Log - API Filters", False, f"Error: {str(e)}")
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
        
        # Run all HR API tests and Activity Logging tests
        tests = [
            self.test_hr_employees_api,
            self.test_hr_dashboard_api,
            self.test_hr_fingerprint_devices_api,
            self.test_hr_leave_request_workflow,
            self.test_hr_expense_request_api,
            self.test_hr_official_letter_api,
            self.test_hr_car_contract_api,
            self.test_hr_attendance_report_api,
            # Activity Logging Tests
            self.test_activity_logs_login_logged,
            self.test_activity_logs_supplier_crud,
            self.test_activity_logs_customer_crud,
            self.test_activity_logs_hr_leave_request,
            self.test_activity_logs_api_filters
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