"""
Network Detection API Tests - اختبارات كشف الشبكة
Tests for:
1. GET /api/tracking/detect-network - returns is_company_network based on IP match
2. POST /api/tracking/employee-login - login with employee code EMP201802
3. POST /api/tracking/gps-attendance - check-in with selfie
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNetworkDetection:
    """Network detection endpoint tests - /api/tracking/detect-network"""
    
    def test_detect_network_returns_client_ip(self):
        """Test that detect-network returns client IP"""
        response = requests.get(f"{BASE_URL}/api/tracking/detect-network")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "client_ip" in data, "Response should contain client_ip"
        assert "is_company_network" in data, "Response should contain is_company_network"
        assert "success" in data, "Response should contain success"
        print(f"PASS: detect-network returns client_ip: {data.get('client_ip')}")
    
    def test_detect_network_with_company_ip(self):
        """Test that detect-network returns is_company_network=true for company IP 85.154.168.39"""
        headers = {"X-Forwarded-For": "85.154.168.39"}
        response = requests.get(f"{BASE_URL}/api/tracking/detect-network", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("is_company_network") == True, f"Expected is_company_network=true for company IP, got {data.get('is_company_network')}"
        assert data.get("matched_location") is not None, "Should have matched_location when on company network"
        print(f"PASS: detect-network returns is_company_network=true for IP 85.154.168.39")
        print(f"  Matched location: {data.get('matched_location')}")
    
    def test_detect_network_with_non_company_ip(self):
        """Test that detect-network returns is_company_network=false for non-company IP"""
        headers = {"X-Forwarded-For": "192.168.1.100"}
        response = requests.get(f"{BASE_URL}/api/tracking/detect-network", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("is_company_network") == False, f"Expected is_company_network=false for non-company IP, got {data.get('is_company_network')}"
        assert data.get("matched_location") is None, "Should not have matched_location for non-company IP"
        print(f"PASS: detect-network returns is_company_network=false for IP 192.168.1.100")
    
    def test_detect_network_with_another_random_ip(self):
        """Test with another random IP to confirm blocking"""
        headers = {"X-Forwarded-For": "8.8.8.8"}
        response = requests.get(f"{BASE_URL}/api/tracking/detect-network", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("is_company_network") == False, "Should be false for Google DNS IP"
        print(f"PASS: detect-network returns is_company_network=false for random IP 8.8.8.8")


class TestEmployeeLogin:
    """Employee login endpoint tests - /api/tracking/employee-login"""
    
    def test_login_with_employee_code_EMP201802(self):
        """Test login with employee code EMP201802"""
        response = requests.post(f"{BASE_URL}/api/tracking/employee-login", json={
            "employee_code": "EMP201802"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "employee" in data, "Response should contain employee"
        employee = data.get("employee")
        assert employee.get("employee_code") == "EMP201802", f"Expected EMP201802, got {employee.get('employee_code')}"
        assert employee.get("name"), "Employee should have a name"
        print(f"PASS: Login with EMP201802 successful")
        print(f"  Employee: {employee.get('name')}")
        print(f"  Department: {employee.get('department')}")
        return employee
    
    def test_login_with_invalid_employee_code(self):
        """Test login with invalid employee code returns 404"""
        response = requests.post(f"{BASE_URL}/api/tracking/employee-login", json={
            "employee_code": "INVALID_CODE_12345"
        })
        assert response.status_code == 404, f"Expected 404 for invalid code, got {response.status_code}"
        print("PASS: Login with invalid code returns 404")
    
    def test_login_without_credentials(self):
        """Test login without phone or code returns 400"""
        response = requests.post(f"{BASE_URL}/api/tracking/employee-login", json={})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Login without credentials returns 400")


class TestGPSAttendance:
    """GPS Attendance endpoint tests - /api/tracking/gps-attendance"""
    
    @pytest.fixture
    def employee_id(self):
        """Get employee ID for EMP201802"""
        response = requests.post(f"{BASE_URL}/api/tracking/employee-login", json={
            "employee_code": "EMP201802"
        })
        if response.status_code == 200:
            return response.json().get("employee", {}).get("id")
        pytest.skip("Could not get employee ID")
    
    def test_checkin_with_valid_data(self, employee_id):
        """Test GPS check-in with valid data"""
        test_date = datetime.now().strftime("%Y-%m-%d")
        
        # First clear any existing attendance for test
        response = requests.post(f"{BASE_URL}/api/tracking/gps-attendance", json={
            "employee_id": employee_id,
            "action": "check_in",
            "latitude": 23.5880,
            "longitude": 58.3829,
            "date": test_date,
            "selfie_photo": None,
            "mock_gps_info": {"is_mock": False, "check_passed": True},
            "attendance_method": "wifi",
            "wifi_ssid": "CompanyWiFi"
        })
        
        # Either 200 (success) or already checked in
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check response structure
        assert "success" in data, "Response should contain success field"
        assert "message" in data, "Response should contain message field"
        print(f"PASS: GPS check-in API response: {data.get('message')}")
        print(f"  Success: {data.get('success')}")
        print(f"  Check-in time: {data.get('check_in_time')}")
    
    def test_checkin_without_employee_id(self):
        """Test check-in without employee_id returns 400"""
        response = requests.post(f"{BASE_URL}/api/tracking/gps-attendance", json={
            "action": "check_in",
            "latitude": 23.5880,
            "longitude": 58.3829
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Check-in without employee_id returns 400")
    
    def test_checkin_mock_gps_rejected(self, employee_id):
        """Test that mock GPS is rejected with 403"""
        response = requests.post(f"{BASE_URL}/api/tracking/gps-attendance", json={
            "employee_id": employee_id,
            "action": "check_in",
            "latitude": 23.5880,
            "longitude": 58.3829,
            "mock_gps_info": {"is_mock": True, "reasons": ["Suspicious accuracy"]}
        })
        assert response.status_code == 403, f"Expected 403 for mock GPS, got {response.status_code}"
        print("PASS: Mock GPS detected and rejected with 403")


class TestTrackingSettings:
    """Test tracking settings to verify configured IPs"""
    
    def test_get_settings_includes_company_ip(self):
        """Verify that 85.154.168.39 is configured in work_locations"""
        response = requests.get(f"{BASE_URL}/api/tracking/settings")
        assert response.status_code == 200
        
        data = response.json()
        work_locations = data.get("work_locations", [])
        
        # Check if company IP is configured
        configured_ips = [loc.get("wifi_ip_range") for loc in work_locations]
        print(f"Configured IPs in tracking settings: {configured_ips}")
        
        has_company_ip = "85.154.168.39" in configured_ips
        assert has_company_ip, f"Company IP 85.154.168.39 not found in configured IPs: {configured_ips}"
        print("PASS: Company IP 85.154.168.39 is configured in work_locations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
