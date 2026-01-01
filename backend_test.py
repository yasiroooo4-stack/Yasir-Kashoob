#!/usr/bin/env python3
"""
Backend API Testing for Milk Collection Center ERP - HR Features Testing
Tests the new HR features as requested in the review:
1. Login and Authentication Test (yasir/admin123)
2. Shifts Management APIs
3. Overtime Management APIs  
4. Loans & Advances APIs
5. Employee Documents APIs
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

    def test_shifts_management(self):
        """Test 2: Shifts Management APIs"""
        try:
            if not self.token:
                self.log_test("Shifts Management Test", False, "No authentication token available")
                return False
            
            # First get list of employees to use valid employee_id
            employees_response = self.session.get(f"{BACKEND_URL}/hr/employees")
            if employees_response.status_code != 200:
                self.log_test("Shifts Management Test", False, "Failed to get employees list")
                return False
            
            employees = employees_response.json()
            if not employees:
                self.log_test("Shifts Management Test", False, "No employees found for testing")
                return False
            
            employee_id = employees[0]["id"]
            employee_name = employees[0]["name"]
            
            # Test 1: Create a shift
            shift_data = {
                "name": "الوردية الصباحية",
                "start_time": "08:00",
                "end_time": "16:00",
                "working_hours": 8.0,
                "break_duration": 60
            }
            
            create_response = self.session.post(
                f"{BACKEND_URL}/hr/shifts",
                json=shift_data
            )
            
            if create_response.status_code != 200:
                self.log_test(
                    "Shifts Management Test", 
                    False, 
                    f"Failed to create shift: {create_response.status_code}",
                    create_response.text
                )
                return False
            
            created_shift = create_response.json()
            shift_id = created_shift["id"]
            
            # Test 2: Get all shifts
            get_response = self.session.get(f"{BACKEND_URL}/hr/shifts")
            
            if get_response.status_code != 200:
                self.log_test(
                    "Shifts Management Test", 
                    False, 
                    f"Failed to get shifts: {get_response.status_code}",
                    get_response.text
                )
                return False
            
            shifts = get_response.json()
            
            # Test 3: Assign shift to employee
            assignment_data = {
                "employee_id": employee_id,
                "employee_name": employee_name,
                "shift_id": shift_id,
                "shift_name": "الوردية الصباحية",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "is_recurring": False
            }
            
            assign_response = self.session.post(
                f"{BACKEND_URL}/hr/employee-shifts",
                json=assignment_data
            )
            
            if assign_response.status_code != 200:
                self.log_test(
                    "Shifts Management Test", 
                    False, 
                    f"Failed to assign shift: {assign_response.status_code}",
                    assign_response.text
                )
                return False
            
            self.log_test(
                "Shifts Management Test", 
                True, 
                f"Successfully created shift, retrieved {len(shifts)} shifts, and assigned shift to employee"
            )
            return True
                
        except Exception as e:
            self.log_test("Shifts Management Test", False, f"Error: {str(e)}")
            return False

    def test_overtime_management(self):
        """Test 3: Overtime Management APIs"""
        try:
            if not self.token:
                self.log_test("Overtime Management Test", False, "No authentication token available")
                return False
            
            # Get list of employees to use valid employee_id
            employees_response = self.session.get(f"{BACKEND_URL}/hr/employees")
            if employees_response.status_code != 200:
                self.log_test("Overtime Management Test", False, "Failed to get employees list")
                return False
            
            employees = employees_response.json()
            if not employees:
                self.log_test("Overtime Management Test", False, "No employees found for testing")
                return False
            
            employee_id = employees[0]["id"]
            employee_name = employees[0]["name"]
            
            # Test 1: Create overtime record
            overtime_data = {
                "employee_id": employee_id,
                "employee_name": employee_name,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "start_time": "18:00",
                "end_time": "20:00",
                "hours": 2.0,
                "rate": 1.5,
                "reason": "مشروع عاجل"
            }
            
            create_response = self.session.post(
                f"{BACKEND_URL}/hr/overtime",
                json=overtime_data
            )
            
            if create_response.status_code != 200:
                self.log_test(
                    "Overtime Management Test", 
                    False, 
                    f"Failed to create overtime record: {create_response.status_code}",
                    create_response.text
                )
                return False
            
            created_overtime = create_response.json()
            overtime_id = created_overtime["id"]
            
            # Test 2: Get all overtime records
            get_response = self.session.get(f"{BACKEND_URL}/hr/overtime")
            
            if get_response.status_code != 200:
                self.log_test(
                    "Overtime Management Test", 
                    False, 
                    f"Failed to get overtime records: {get_response.status_code}",
                    get_response.text
                )
                return False
            
            overtime_records = get_response.json()
            
            # Test 3: Approve overtime
            approve_response = self.session.put(
                f"{BACKEND_URL}/hr/overtime/{overtime_id}/approve?approved=true"
            )
            
            if approve_response.status_code != 200:
                self.log_test(
                    "Overtime Management Test", 
                    False, 
                    f"Failed to approve overtime: {approve_response.status_code}",
                    approve_response.text
                )
                return False
            
            self.log_test(
                "Overtime Management Test", 
                True, 
                f"Successfully created overtime record, retrieved {len(overtime_records)} records, and approved overtime"
            )
            return True
                
        except Exception as e:
            self.log_test("Overtime Management Test", False, f"Error: {str(e)}")
            return False

    def test_loans_and_advances(self):
        """Test 4: Loans & Advances APIs"""
        try:
            if not self.token:
                self.log_test("Loans & Advances Test", False, "No authentication token available")
                return False
            
            # Get list of employees to use valid employee_id
            employees_response = self.session.get(f"{BACKEND_URL}/hr/employees")
            if employees_response.status_code != 200:
                self.log_test("Loans & Advances Test", False, "Failed to get employees list")
                return False
            
            employees = employees_response.json()
            if not employees:
                self.log_test("Loans & Advances Test", False, "No employees found for testing")
                return False
            
            employee_id = employees[0]["id"]
            employee_name = employees[0]["name"]
            
            # Test 1: Create a loan
            loan_data = {
                "employee_id": employee_id,
                "employee_name": employee_name,
                "loan_type": "advance",
                "amount": 500.0,
                "installments": 5,
                "reason": "حاجة شخصية"
            }
            
            create_response = self.session.post(
                f"{BACKEND_URL}/hr/loans",
                json=loan_data
            )
            
            if create_response.status_code != 200:
                self.log_test(
                    "Loans & Advances Test", 
                    False, 
                    f"Failed to create loan: {create_response.status_code}",
                    create_response.text
                )
                return False
            
            created_loan = create_response.json()
            loan_id = created_loan["id"]
            
            # Test 2: Get all loans
            get_response = self.session.get(f"{BACKEND_URL}/hr/loans")
            
            if get_response.status_code != 200:
                self.log_test(
                    "Loans & Advances Test", 
                    False, 
                    f"Failed to get loans: {get_response.status_code}",
                    get_response.text
                )
                return False
            
            loans = get_response.json()
            
            # Test 3: Approve loan
            approve_response = self.session.put(
                f"{BACKEND_URL}/hr/loans/{loan_id}/approve?approved=true"
            )
            
            if approve_response.status_code != 200:
                self.log_test(
                    "Loans & Advances Test", 
                    False, 
                    f"Failed to approve loan: {approve_response.status_code}",
                    approve_response.text
                )
                return False
            
            self.log_test(
                "Loans & Advances Test", 
                True, 
                f"Successfully created loan, retrieved {len(loans)} loans, and approved loan"
            )
            return True
                
        except Exception as e:
            self.log_test("Loans & Advances Test", False, f"Error: {str(e)}")
            return False

    def test_employee_documents(self):
        """Test 5: Employee Documents APIs"""
        try:
            if not self.token:
                self.log_test("Employee Documents Test", False, "No authentication token available")
                return False
            
            # Get list of employees to use valid employee_id
            employees_response = self.session.get(f"{BACKEND_URL}/hr/employees")
            if employees_response.status_code != 200:
                self.log_test("Employee Documents Test", False, "Failed to get employees list")
                return False
            
            employees = employees_response.json()
            if not employees:
                self.log_test("Employee Documents Test", False, "No employees found for testing")
                return False
            
            employee_id = employees[0]["id"]
            employee_name = employees[0]["name"]
            
            # Test 1: Create a document
            document_data = {
                "employee_id": employee_id,
                "employee_name": employee_name,
                "document_type": "passport",
                "document_name": "جواز سفر",
                "document_number": "A1234567",
                "expiry_date": "2026-12-31"
            }
            
            create_response = self.session.post(
                f"{BACKEND_URL}/hr/documents",
                json=document_data
            )
            
            if create_response.status_code != 200:
                self.log_test(
                    "Employee Documents Test", 
                    False, 
                    f"Failed to create document: {create_response.status_code}",
                    create_response.text
                )
                return False
            
            created_document = create_response.json()
            
            # Test 2: Get all documents
            get_response = self.session.get(f"{BACKEND_URL}/hr/documents")
            
            if get_response.status_code != 200:
                self.log_test(
                    "Employee Documents Test", 
                    False, 
                    f"Failed to get documents: {get_response.status_code}",
                    get_response.text
                )
                return False
            
            documents = get_response.json()
            
            # Test 3: Get expiring documents
            expiring_response = self.session.get(f"{BACKEND_URL}/hr/documents/expiring?days=365")
            
            if expiring_response.status_code != 200:
                self.log_test(
                    "Employee Documents Test", 
                    False, 
                    f"Failed to get expiring documents: {expiring_response.status_code}",
                    expiring_response.text
                )
                return False
            
            expiring_documents = expiring_response.json()
            
            self.log_test(
                "Employee Documents Test", 
                True, 
                f"Successfully created document, retrieved {len(documents)} documents, and found {len(expiring_documents)} expiring documents"
            )
            return True
                
        except Exception as e:
            self.log_test("Employee Documents Test", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("MILK COLLECTION CENTER ERP - HR FEATURES TESTING")
        print("=" * 60)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Credentials: {TEST_USERNAME}/{TEST_PASSWORD}")
        print("=" * 60)
        
        tests = [
            self.test_login_and_authentication,
            self.test_shifts_management,
            self.test_overtime_management,
            self.test_loans_and_advances,
            self.test_employee_documents
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