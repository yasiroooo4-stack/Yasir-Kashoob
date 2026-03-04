"""
Backend tests for GPS Attendance bilingual feature
Tests network detection, employee login, and attendance endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNetworkDetection:
    """Tests for /api/tracking/detect-network endpoint"""
    
    def test_detect_network_returns_client_ip(self):
        """Should return client IP and network status"""
        response = requests.get(f"{BASE_URL}/api/tracking/detect-network")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "success" in data
        assert "client_ip" in data
        assert "is_company_network" in data
        assert "configured_ips" in data
        
        # Verify client IP format (should be valid IP)
        client_ip = data["client_ip"]
        assert client_ip is not None
        assert len(client_ip.split('.')) == 4  # IPv4 format
        print(f"PASS: Client IP detected: {client_ip}")
        
    def test_detect_network_company_ip_check(self):
        """Should identify if client is on company network"""
        response = requests.get(f"{BASE_URL}/api/tracking/detect-network")
        assert response.status_code == 200
        data = response.json()
        
        # Verify is_company_network is boolean
        assert isinstance(data["is_company_network"], bool)
        
        # Verify configured IPs includes company IP
        assert "85.154.168.39" in data["configured_ips"]
        print(f"PASS: Company network check working, is_company_network={data['is_company_network']}")


class TestEmployeeLogin:
    """Tests for /api/tracking/employee-login endpoint"""
    
    def test_login_with_valid_employee_code(self):
        """Should return employee data for valid code"""
        response = requests.post(
            f"{BASE_URL}/api/tracking/employee-login",
            json={"employee_code": "EMP201802"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify employee data
        assert "employee" in data
        employee = data["employee"]
        assert employee["employee_code"] == "EMP201802"
        assert "name" in employee
        assert "id" in employee
        print(f"PASS: Employee login successful - {employee['name']}")
        
    def test_login_with_invalid_code(self):
        """Should return 404 for invalid employee code"""
        response = requests.post(
            f"{BASE_URL}/api/tracking/employee-login",
            json={"employee_code": "INVALID999"}
        )
        assert response.status_code == 404
        print("PASS: Invalid employee code returns 404")
        
    def test_login_without_credentials(self):
        """Should return 400 when no credentials provided"""
        response = requests.post(
            f"{BASE_URL}/api/tracking/employee-login",
            json={}
        )
        assert response.status_code == 400
        print("PASS: Missing credentials returns 400")
        

class TestTrackingSettings:
    """Tests for /api/tracking/settings endpoint"""
    
    def test_get_tracking_settings(self):
        """Should return tracking settings including work locations"""
        response = requests.get(f"{BASE_URL}/api/tracking/settings")
        assert response.status_code == 200
        data = response.json()
        
        # Check work_locations includes company IP
        if "work_locations" in data:
            ips_found = []
            for loc in data["work_locations"]:
                if "wifi_ip_range" in loc:
                    ips_found.append(loc["wifi_ip_range"])
            assert "85.154.168.39" in ips_found, f"Company IP not found in work_locations. Found: {ips_found}"
            print(f"PASS: Company IP 85.154.168.39 configured in work_locations")
        else:
            print("INFO: work_locations not in response, checking other fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
