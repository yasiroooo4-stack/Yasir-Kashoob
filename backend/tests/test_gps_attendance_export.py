"""
Tests for GPS Attendance Workflow and Attendance Export Features
- Export Attendance to Excel/PDF with date range filter
- GPS Attendance approval workflow
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "hassan"
TEST_PASSWORD = "123"

class TestAuth:
    """Authentication tests - required for export endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get access token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Verify login returns valid token"""
        assert auth_token is not None
        assert len(auth_token) > 0

class TestAttendanceExport:
    """Tests for attendance export to Excel/PDF"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for API calls"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_export_excel_with_date_range(self, auth_headers):
        """Test Excel export with start_date and end_date parameters"""
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/export/excel",
            params={
                "start_date": "2026-01-01",
                "end_date": "2026-02-28"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Excel export failed: {response.text}"
        # Verify content type is Excel
        assert "spreadsheet" in response.headers.get("Content-Type", "") or len(response.content) > 1000
        # Verify we got actual content
        assert len(response.content) > 0, "Empty Excel file returned"
        print(f"Excel export successful, file size: {len(response.content)} bytes")
    
    def test_export_pdf_with_date_range(self, auth_headers):
        """Test PDF export with start_date and end_date parameters"""
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/export/pdf",
            params={
                "start_date": "2026-01-01",
                "end_date": "2026-02-28"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"PDF export failed: {response.text}"
        # Verify content type is PDF
        assert "pdf" in response.headers.get("Content-Type", "") or len(response.content) > 1000
        # Verify we got actual content
        assert len(response.content) > 0, "Empty PDF file returned"
        print(f"PDF export successful, file size: {len(response.content)} bytes")
    
    def test_export_excel_requires_auth(self):
        """Test that Excel export requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/export/excel",
            params={"start_date": "2026-01-01", "end_date": "2026-01-31"}
        )
        # Should be 401 Unauthorized
        assert response.status_code == 401 or response.status_code == 403
    
    def test_export_pdf_requires_auth(self):
        """Test that PDF export requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/export/pdf",
            params={"start_date": "2026-01-01", "end_date": "2026-01-31"}
        )
        # Should be 401 Unauthorized
        assert response.status_code == 401 or response.status_code == 403
    
    def test_export_with_employee_filter(self, auth_headers):
        """Test export with specific employee filter"""
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/export/excel",
            params={
                "start_date": "2026-01-01",
                "end_date": "2026-02-28",
                "employee_id": "dbf5cc42-7064-47d3-8a74-6a5f58f36c75"
            },
            headers=auth_headers
        )
        assert response.status_code == 200

class TestGpsAttendanceWorkflow:
    """Tests for GPS attendance with approval workflow"""
    
    TEST_EMPLOYEE_ID = "dbf5cc42-7064-47d3-8a74-6a5f58f36c75"
    
    def test_gps_check_in_requires_approval(self):
        """Test that GPS check-in returns requires_approval: true"""
        test_date = f"2026-03-{str(uuid.uuid4())[:2].replace('-','0')}"  # Random date to avoid conflicts
        response = requests.post(
            f"{BASE_URL}/api/tracking/gps-attendance",
            json={
                "employee_id": self.TEST_EMPLOYEE_ID,
                "action": "check_in",
                "latitude": 23.588,
                "longitude": 58.3829,
                "date": "2026-03-07"
            }
        )
        
        assert response.status_code == 200, f"GPS check-in failed: {response.text}"
        data = response.json()
        
        # Should indicate requires approval
        assert data.get("success") == True or data.get("requires_approval") == True
        if data.get("success"):
            assert data.get("requires_approval") == True, "GPS check-in should require approval"
        print(f"GPS check-in response: {data}")
    
    def test_get_pending_gps_approvals(self):
        """Test getting pending GPS approval requests"""
        response = requests.get(f"{BASE_URL}/api/tracking/gps-attendance/pending")
        
        assert response.status_code == 200, f"Failed to get pending approvals: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Pending approvals should be a list"
        print(f"Found {len(data)} pending GPS approval(s)")
        
        # Verify structure of pending records
        if len(data) > 0:
            record = data[0]
            assert "id" in record, "Record should have id"
            assert "employee_id" in record, "Record should have employee_id"
            assert "employee_name" in record, "Record should have employee_name"
            assert "date" in record, "Record should have date"
            assert "gps_approval_status" in record or "gps_checkout_approval_status" in record
    
    def test_approve_gps_attendance(self):
        """Test approving a GPS attendance record"""
        # First get pending records
        pending = requests.get(f"{BASE_URL}/api/tracking/gps-attendance/pending").json()
        
        if len(pending) == 0:
            # Create a new GPS check-in first
            requests.post(
                f"{BASE_URL}/api/tracking/gps-attendance",
                json={
                    "employee_id": self.TEST_EMPLOYEE_ID,
                    "action": "check_in",
                    "latitude": 23.588,
                    "longitude": 58.3829,
                    "date": "2026-03-08"
                }
            )
            pending = requests.get(f"{BASE_URL}/api/tracking/gps-attendance/pending").json()
        
        if len(pending) == 0:
            pytest.skip("No pending records to approve")
        
        record = pending[0]
        attendance_id = record["id"]
        
        # Approve the record
        response = requests.post(
            f"{BASE_URL}/api/tracking/gps-attendance/approve",
            json={
                "attendance_id": attendance_id,
                "type": "check_in",
                "approved": True,
                "approved_by": "admin"
            }
        )
        
        assert response.status_code == 200, f"Approval failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Approval should be successful"
        print(f"Approved attendance ID: {attendance_id}")
    
    def test_reject_gps_attendance(self):
        """Test rejecting a GPS attendance record"""
        # Create a new GPS check-in for rejection test
        create_response = requests.post(
            f"{BASE_URL}/api/tracking/gps-attendance",
            json={
                "employee_id": self.TEST_EMPLOYEE_ID,
                "action": "check_in",
                "latitude": 23.588,
                "longitude": 58.3829,
                "date": "2026-03-09"
            }
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create test record for rejection")
        
        # Get the new pending record
        pending = requests.get(f"{BASE_URL}/api/tracking/gps-attendance/pending").json()
        
        # Find the one we just created (date = 2026-03-09)
        record = next((r for r in pending if r["date"] == "2026-03-09"), None)
        if not record:
            record = pending[0] if pending else None
        
        if not record:
            pytest.skip("No pending record found for rejection test")
        
        attendance_id = record["id"]
        
        # Reject the record
        response = requests.post(
            f"{BASE_URL}/api/tracking/gps-attendance/approve",
            json={
                "attendance_id": attendance_id,
                "type": "check_in",
                "approved": False,
                "approved_by": "admin",
                "rejection_reason": "Test rejection"
            }
        )
        
        assert response.status_code == 200, f"Rejection failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
    
    def test_gps_check_in_missing_data(self):
        """Test GPS check-in with missing required fields"""
        response = requests.post(
            f"{BASE_URL}/api/tracking/gps-attendance",
            json={
                "action": "check_in"
                # Missing employee_id
            }
        )
        assert response.status_code == 400
    
    def test_gps_check_in_invalid_employee(self):
        """Test GPS check-in with invalid employee ID"""
        response = requests.post(
            f"{BASE_URL}/api/tracking/gps-attendance",
            json={
                "employee_id": "invalid-employee-id",
                "action": "check_in",
                "latitude": 23.588,
                "longitude": 58.3829
            }
        )
        assert response.status_code == 404
    
    def test_approve_missing_data(self):
        """Test approval endpoint with missing required fields"""
        response = requests.post(
            f"{BASE_URL}/api/tracking/gps-attendance/approve",
            json={
                # Missing attendance_id and type
                "approved": True
            }
        )
        assert response.status_code == 400
    
    def test_approve_invalid_attendance_id(self):
        """Test approval with invalid attendance ID"""
        response = requests.post(
            f"{BASE_URL}/api/tracking/gps-attendance/approve",
            json={
                "attendance_id": "invalid-id-12345",
                "type": "check_in",
                "approved": True,
                "approved_by": "admin"
            }
        )
        assert response.status_code == 404
