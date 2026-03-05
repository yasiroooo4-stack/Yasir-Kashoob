"""
Test Suite for Exit Logs API and HR Attendance Table Features
Tests range-exit-logs endpoints and verifies HR attendance source column
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRangeExitLogsEndpoints:
    """Test range-exit-logs API endpoints"""
    
    def test_get_range_exit_logs_returns_array(self):
        """GET /api/tracking/range-exit-logs - returns empty array when no logs exist"""
        response = requests.get(f"{BASE_URL}/api/tracking/range-exit-logs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/tracking/range-exit-logs returns array with {len(data)} items")
        
    def test_get_range_exit_logs_with_date_parameter(self):
        """GET /api/tracking/range-exit-logs?date=2026-03-05 - accepts date parameter"""
        response = requests.get(f"{BASE_URL}/api/tracking/range-exit-logs?date=2026-03-05")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/tracking/range-exit-logs?date=2026-03-05 returns array with {len(data)} items")
        
    def test_get_range_exit_logs_for_employee(self):
        """GET /api/tracking/range-exit-logs/{employee_id} - returns employee-specific logs"""
        # Use a test employee ID
        test_employee_id = "test-employee-123"
        response = requests.get(f"{BASE_URL}/api/tracking/range-exit-logs/{test_employee_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # All logs should be for the specified employee if any exist
        for log in data:
            assert log.get("employee_id") == test_employee_id, "Log should be for the specified employee"
        print(f"✓ GET /api/tracking/range-exit-logs/{test_employee_id} returns array with {len(data)} items")
        
    def test_get_range_exit_logs_for_employee_with_date(self):
        """GET /api/tracking/range-exit-logs/{employee_id}?date=YYYY-MM-DD"""
        test_employee_id = "test-employee-123"
        response = requests.get(f"{BASE_URL}/api/tracking/range-exit-logs/{test_employee_id}?date=2026-01-15")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/tracking/range-exit-logs with employee_id and date returns array")


class TestHRAttendanceEndpoints:
    """Test HR attendance endpoints related to source/method display"""
    
    def test_attendance_endpoint_exists(self):
        """GET /api/hr/attendance - endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/hr/attendance")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/hr/attendance returns array with {len(data)} records")
        
    def test_attendance_record_fields(self):
        """Verify attendance records have required fields for source display"""
        response = requests.get(f"{BASE_URL}/api/hr/attendance")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            record = data[0]
            # Check that records have the fields needed for source/GPS column display
            expected_fields = ["employee_id", "date"]
            for field in expected_fields:
                assert field in record, f"Attendance record should have '{field}' field"
            
            # Log which optional fields are present
            optional_fields = ["check_in_method", "source", "gps_check_in", "gps_check_out", 
                             "check_in_selfie_url", "check_out_selfie_url"]
            present_fields = [f for f in optional_fields if f in record]
            print(f"✓ Attendance record has required fields. Optional fields present: {present_fields}")
        else:
            print("✓ Attendance endpoint works but no records to verify field structure")
            
    def test_attendance_with_date_range(self):
        """GET /api/hr/attendance with date params"""
        response = requests.get(f"{BASE_URL}/api/hr/attendance?start_date=2026-01-01&end_date=2026-01-31")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/hr/attendance with date range returns {len(data)} records")


class TestTrackingSettings:
    """Test tracking settings endpoints"""
    
    def test_get_tracking_settings(self):
        """GET /api/tracking/settings - returns settings"""
        response = requests.get(f"{BASE_URL}/api/tracking/settings")
        assert response.status_code == 200
        data = response.json()
        assert "work_locations" in data, "Settings should have work_locations"
        print(f"✓ GET /api/tracking/settings returns settings with {len(data.get('work_locations', []))} work locations")


class TestGPSAttendanceApproval:
    """Test GPS attendance approval endpoints"""
    
    def test_get_pending_gps_approvals(self):
        """GET /api/tracking/gps-attendance/pending - returns pending approvals"""
        response = requests.get(f"{BASE_URL}/api/tracking/gps-attendance/pending")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/tracking/gps-attendance/pending returns {len(data)} pending approvals")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
