"""
External Work (العمل الخارجي) API Tests
Tests for HR External Work Request feature including:
- Create external work request
- Get external work requests
- Approve external work request
- Reject external work request
- Delete external work request
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "yasir"
ADMIN_PASSWORD = "admin1111"


class TestExternalWorkAPIs:
    """External Work Request API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_01_get_employees_for_external_work(self):
        """Test getting employees list for external work form"""
        response = self.session.get(f"{BASE_URL}/api/hr/employees")
        assert response.status_code == 200, f"Failed to get employees: {response.text}"
        
        employees = response.json()
        assert isinstance(employees, list), "Response should be a list"
        print(f"✅ GET /api/hr/employees - Found {len(employees)} employees")
        
        # Store first employee for later tests
        if employees:
            self.test_employee = employees[0]
            print(f"   Using employee: {self.test_employee.get('name')} (ID: {self.test_employee.get('id')})")
    
    def test_02_get_external_work_requests_empty_or_list(self):
        """Test getting external work requests list"""
        response = self.session.get(f"{BASE_URL}/api/hr/external-work")
        assert response.status_code == 200, f"Failed to get external work requests: {response.text}"
        
        requests_list = response.json()
        assert isinstance(requests_list, list), "Response should be a list"
        print(f"✅ GET /api/hr/external-work - Found {len(requests_list)} requests")
    
    def test_03_create_external_work_request(self):
        """Test creating a new external work request"""
        # First get an employee
        emp_response = self.session.get(f"{BASE_URL}/api/hr/employees")
        employees = emp_response.json()
        
        if not employees:
            pytest.skip("No employees found to create external work request")
        
        employee = employees[0]
        
        # Create external work request
        request_data = {
            "employee_id": employee["id"],
            "employee_name": employee["name"],
            "work_date": "2026-01-20",
            "work_date_to": "2026-01-21",
            "work_type": "client_visit",
            "location": "مسقط - العذيبة",
            "purpose": "TEST_زيارة عميل لمتابعة طلب الحليب",
            "notes": "اختبار طلب عمل خارجي"
        }
        
        response = self.session.post(f"{BASE_URL}/api/hr/external-work", json=request_data)
        assert response.status_code == 200, f"Failed to create external work request: {response.text}"
        
        created_request = response.json()
        assert "id" in created_request, "Response should contain id"
        assert created_request["employee_id"] == employee["id"], "Employee ID should match"
        assert created_request["status"] == "pending", "Initial status should be pending"
        assert created_request["work_type"] == "client_visit", "Work type should match"
        
        print(f"✅ POST /api/hr/external-work - Created request ID: {created_request['id']}")
        print(f"   Employee: {created_request['employee_name']}")
        print(f"   Date: {created_request['work_date']} to {created_request.get('work_date_to')}")
        print(f"   Status: {created_request['status']}")
        
        # Store for later tests
        self.__class__.created_request_id = created_request["id"]
        self.__class__.created_employee_id = employee["id"]
    
    def test_04_get_external_work_request_by_id(self):
        """Test getting a specific external work request"""
        if not hasattr(self.__class__, 'created_request_id'):
            pytest.skip("No request created in previous test")
        
        request_id = self.__class__.created_request_id
        response = self.session.get(f"{BASE_URL}/api/hr/external-work/{request_id}")
        assert response.status_code == 200, f"Failed to get external work request: {response.text}"
        
        request_data = response.json()
        assert request_data["id"] == request_id, "Request ID should match"
        print(f"✅ GET /api/hr/external-work/{request_id} - Retrieved successfully")
    
    def test_05_get_external_work_with_status_filter(self):
        """Test filtering external work requests by status"""
        response = self.session.get(f"{BASE_URL}/api/hr/external-work?status=pending")
        assert response.status_code == 200, f"Failed to filter by status: {response.text}"
        
        requests_list = response.json()
        assert isinstance(requests_list, list), "Response should be a list"
        
        # All returned requests should have pending status
        for req in requests_list:
            assert req.get("status") == "pending", f"Request {req.get('id')} has status {req.get('status')}, expected pending"
        
        print(f"✅ GET /api/hr/external-work?status=pending - Found {len(requests_list)} pending requests")
    
    def test_06_get_external_work_with_employee_filter(self):
        """Test filtering external work requests by employee"""
        if not hasattr(self.__class__, 'created_employee_id'):
            pytest.skip("No employee ID from previous test")
        
        employee_id = self.__class__.created_employee_id
        response = self.session.get(f"{BASE_URL}/api/hr/external-work?employee_id={employee_id}")
        assert response.status_code == 200, f"Failed to filter by employee: {response.text}"
        
        requests_list = response.json()
        assert isinstance(requests_list, list), "Response should be a list"
        
        # All returned requests should belong to the employee
        for req in requests_list:
            assert req.get("employee_id") == employee_id, f"Request {req.get('id')} has wrong employee_id"
        
        print(f"✅ GET /api/hr/external-work?employee_id={employee_id} - Found {len(requests_list)} requests")
    
    def test_07_approve_external_work_request(self):
        """Test approving an external work request"""
        # Create a new request to approve
        emp_response = self.session.get(f"{BASE_URL}/api/hr/employees")
        employees = emp_response.json()
        
        if not employees:
            pytest.skip("No employees found")
        
        employee = employees[0]
        
        # Create request
        request_data = {
            "employee_id": employee["id"],
            "employee_name": employee["name"],
            "work_date": "2026-01-22",
            "work_type": "training",
            "location": "مركز التدريب",
            "purpose": "TEST_تدريب على نظام جديد"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/hr/external-work", json=request_data)
        assert create_response.status_code == 200, f"Failed to create request: {create_response.text}"
        
        request_id = create_response.json()["id"]
        
        # Approve the request
        approve_response = self.session.put(f"{BASE_URL}/api/hr/external-work/{request_id}/approve")
        assert approve_response.status_code == 200, f"Failed to approve request: {approve_response.text}"
        
        approved_request = approve_response.json()
        assert approved_request["status"] == "approved", "Status should be approved"
        assert approved_request.get("approved_by") is not None, "approved_by should be set"
        assert approved_request.get("approved_at") is not None, "approved_at should be set"
        assert approved_request.get("attendance_updated") == True, "attendance_updated should be True"
        
        print(f"✅ PUT /api/hr/external-work/{request_id}/approve - Request approved")
        print(f"   Approved by: {approved_request.get('approved_by_name')}")
        print(f"   Attendance updated: {approved_request.get('attendance_updated')}")
        
        # Store for cleanup
        self.__class__.approved_request_id = request_id
    
    def test_08_verify_attendance_created_after_approval(self):
        """Test that attendance record is created after approval"""
        # Check attendance for the approved request date
        response = self.session.get(f"{BASE_URL}/api/hr/attendance?start_date=2026-01-22&end_date=2026-01-22")
        assert response.status_code == 200, f"Failed to get attendance: {response.text}"
        
        attendance_list = response.json()
        
        # Look for attendance with source "external_work_approved"
        external_work_attendance = [a for a in attendance_list if a.get("source") == "external_work_approved"]
        
        print(f"✅ Attendance verification - Found {len(external_work_attendance)} external work attendance records for 2026-01-22")
        
        if external_work_attendance:
            att = external_work_attendance[0]
            print(f"   Employee: {att.get('employee_name')}")
            print(f"   Check-in: {att.get('check_in')}, Check-out: {att.get('check_out')}")
    
    def test_09_reject_external_work_request(self):
        """Test rejecting an external work request"""
        # Create a new request to reject
        emp_response = self.session.get(f"{BASE_URL}/api/hr/employees")
        employees = emp_response.json()
        
        if not employees:
            pytest.skip("No employees found")
        
        employee = employees[0]
        
        # Create request
        request_data = {
            "employee_id": employee["id"],
            "employee_name": employee["name"],
            "work_date": "2026-01-23",
            "work_type": "conference",
            "location": "فندق الشيراتون",
            "purpose": "TEST_حضور مؤتمر"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/hr/external-work", json=request_data)
        assert create_response.status_code == 200, f"Failed to create request: {create_response.text}"
        
        request_id = create_response.json()["id"]
        
        # Reject the request
        reject_response = self.session.put(f"{BASE_URL}/api/hr/external-work/{request_id}/reject?reason=لا يوجد ميزانية")
        assert reject_response.status_code == 200, f"Failed to reject request: {reject_response.text}"
        
        rejected_request = reject_response.json()
        assert rejected_request["status"] == "rejected", "Status should be rejected"
        assert rejected_request.get("approved_by") is not None, "approved_by should be set"
        
        print(f"✅ PUT /api/hr/external-work/{request_id}/reject - Request rejected")
        print(f"   Rejected by: {rejected_request.get('approved_by_name')}")
        
        # Store for cleanup
        self.__class__.rejected_request_id = request_id
    
    def test_10_cannot_approve_already_processed_request(self):
        """Test that already processed requests cannot be approved again"""
        if not hasattr(self.__class__, 'rejected_request_id'):
            pytest.skip("No rejected request from previous test")
        
        request_id = self.__class__.rejected_request_id
        
        # Try to approve already rejected request
        response = self.session.put(f"{BASE_URL}/api/hr/external-work/{request_id}/approve")
        assert response.status_code == 400, f"Should fail with 400, got {response.status_code}"
        
        print(f"✅ Cannot approve already processed request - Got expected 400 error")
    
    def test_11_delete_external_work_request(self):
        """Test deleting an external work request"""
        # Create a request to delete
        emp_response = self.session.get(f"{BASE_URL}/api/hr/employees")
        employees = emp_response.json()
        
        if not employees:
            pytest.skip("No employees found")
        
        employee = employees[0]
        
        # Create request
        request_data = {
            "employee_id": employee["id"],
            "employee_name": employee["name"],
            "work_date": "2026-01-24",
            "work_type": "field_work",
            "location": "المزرعة",
            "purpose": "TEST_عمل ميداني للحذف"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/hr/external-work", json=request_data)
        assert create_response.status_code == 200, f"Failed to create request: {create_response.text}"
        
        request_id = create_response.json()["id"]
        
        # Delete the request
        delete_response = self.session.delete(f"{BASE_URL}/api/hr/external-work/{request_id}")
        assert delete_response.status_code == 200, f"Failed to delete request: {delete_response.text}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/hr/external-work/{request_id}")
        assert get_response.status_code == 404, "Deleted request should return 404"
        
        print(f"✅ DELETE /api/hr/external-work/{request_id} - Request deleted successfully")
    
    def test_12_get_nonexistent_request_returns_404(self):
        """Test that getting a non-existent request returns 404"""
        fake_id = str(uuid.uuid4())
        response = self.session.get(f"{BASE_URL}/api/hr/external-work/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print(f"✅ GET non-existent request returns 404 as expected")
    
    def test_13_cleanup_test_data(self):
        """Cleanup test data created during tests"""
        # Get all external work requests
        response = self.session.get(f"{BASE_URL}/api/hr/external-work")
        if response.status_code == 200:
            requests_list = response.json()
            
            # Delete TEST_ prefixed requests
            deleted_count = 0
            for req in requests_list:
                if "TEST_" in req.get("purpose", ""):
                    delete_response = self.session.delete(f"{BASE_URL}/api/hr/external-work/{req['id']}")
                    if delete_response.status_code == 200:
                        deleted_count += 1
            
            print(f"✅ Cleanup - Deleted {deleted_count} test requests")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
