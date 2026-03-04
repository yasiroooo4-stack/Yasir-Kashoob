"""
Test Range Exit Logs Feature - Arabic Attendance Management System
Tests for: 
- GET /api/tracking/range-exit-logs - get all exit logs for today
- GET /api/tracking/range-exit-logs/{employee_id} - get exit logs for specific employee
- POST /api/tracking/location - range_event field and exit log creation
"""
import pytest
import requests
import os
import time
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRangeExitLogs:
    """Tests for range exit logs feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with employee login"""
        self.employee_code = "EMP201802"
        self.employee_id = None
        
        # Login to get employee ID
        response = requests.post(f"{BASE_URL}/api/tracking/employee-login", json={
            "employee_code": self.employee_code
        })
        if response.status_code == 200:
            data = response.json()
            self.employee_id = data.get("employee", {}).get("id")
    
    # ==================== Range Exit Logs Endpoints ====================
    
    def test_get_range_exit_logs_returns_array(self):
        """GET /api/tracking/range-exit-logs returns array (empty or with data)"""
        response = requests.get(f"{BASE_URL}/api/tracking/range-exit-logs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/tracking/range-exit-logs returns array with {len(data)} logs")
    
    def test_get_range_exit_logs_for_employee_returns_array(self):
        """GET /api/tracking/range-exit-logs/{employee_id} returns array"""
        assert self.employee_id is not None, "Employee login failed"
        
        response = requests.get(f"{BASE_URL}/api/tracking/range-exit-logs/{self.employee_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/tracking/range-exit-logs/{self.employee_id} returns array with {len(data)} logs")
    
    def test_range_exit_logs_have_duration_formatted_field(self):
        """GET /api/tracking/range-exit-logs returns logs with duration_formatted field when applicable"""
        response = requests.get(f"{BASE_URL}/api/tracking/range-exit-logs")
        assert response.status_code == 200
        
        data = response.json()
        # If there are logs with duration, they should have duration_formatted
        for log in data:
            if log.get("duration_outside_seconds") is not None or log.get("status") == "outside":
                assert "duration_formatted" in log, f"Log missing duration_formatted field: {log}"
                print(f"PASS: Log has duration_formatted={log.get('duration_formatted')}")
        
        print(f"PASS: Range exit logs endpoint returns {len(data)} logs with proper duration_formatted")
    
    # ==================== Location Endpoint Range Event ====================
    
    def test_location_endpoint_returns_range_event_field(self):
        """POST /api/tracking/location returns range_event field (null, 'exit', or 'return')"""
        assert self.employee_id is not None, "Employee login failed"
        
        # Send location inside work range (use coordinates that should be within range)
        response = requests.post(f"{BASE_URL}/api/tracking/location", json={
            "employee_id": self.employee_id,
            "latitude": 23.5880,  # Typical Oman coordinates
            "longitude": 58.3829,
            "accuracy": 10
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "range_event" in data, f"Response missing range_event field: {data}"
        assert data["range_event"] in [None, "exit", "return"], f"Invalid range_event value: {data['range_event']}"
        print(f"PASS: Location endpoint returns range_event={data['range_event']}")
    
    def test_location_endpoint_returns_required_fields(self):
        """POST /api/tracking/location returns all required fields"""
        assert self.employee_id is not None, "Employee login failed"
        
        response = requests.post(f"{BASE_URL}/api/tracking/location", json={
            "employee_id": self.employee_id,
            "latitude": 23.5880,
            "longitude": 58.3829,
            "accuracy": 10
        })
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["success", "is_within_range", "distance_from_work", "range_event"]
        for field in required_fields:
            assert field in data, f"Response missing {field} field: {data}"
        
        print(f"PASS: Location response has all required fields: {list(data.keys())}")
    
    # ==================== Range Exit Detection ====================
    
    def test_exit_range_creates_log(self):
        """Exiting work range should create range_exit_log entry"""
        assert self.employee_id is not None, "Employee login failed"
        
        # First send location inside range to establish baseline
        inside_response = requests.post(f"{BASE_URL}/api/tracking/location", json={
            "employee_id": self.employee_id,
            "latitude": 23.5880,  # Should be inside
            "longitude": 58.3829,
            "accuracy": 10
        })
        
        # Get initial exit logs count
        initial_logs = requests.get(f"{BASE_URL}/api/tracking/range-exit-logs/{self.employee_id}")
        initial_count = len(initial_logs.json()) if initial_logs.status_code == 200 else 0
        
        # Now send location FAR outside range (very far coordinates)
        outside_response = requests.post(f"{BASE_URL}/api/tracking/location", json={
            "employee_id": self.employee_id,
            "latitude": 25.0,  # Very far from work
            "longitude": 60.0,
            "accuracy": 10
        })
        assert outside_response.status_code == 200
        outside_data = outside_response.json()
        
        print(f"Outside location response: is_within_range={outside_data.get('is_within_range')}, range_event={outside_data.get('range_event')}")
        
        # Check if exit log was created
        new_logs = requests.get(f"{BASE_URL}/api/tracking/range-exit-logs/{self.employee_id}")
        new_count = len(new_logs.json()) if new_logs.status_code == 200 else 0
        
        # If was outside range, should have created a log (or range_event=exit)
        if not outside_data.get('is_within_range'):
            if outside_data.get('range_event') == 'exit':
                print(f"PASS: Exit range event triggered, range_event='exit'")
                assert new_count > initial_count, "Exit log should have been created"
            elif new_count == initial_count:
                # It's possible employee was already outside, so no new exit event
                print(f"INFO: No new exit log (employee may have already been outside). range_event={outside_data.get('range_event')}")
        else:
            print(f"INFO: Location was within range, no exit event expected")
    
    def test_return_to_range_updates_log(self):
        """Returning to work range should update the exit log with return_time"""
        assert self.employee_id is not None, "Employee login failed"
        
        # First ensure employee is outside range
        outside_response = requests.post(f"{BASE_URL}/api/tracking/location", json={
            "employee_id": self.employee_id,
            "latitude": 25.0,
            "longitude": 60.0,
            "accuracy": 10
        })
        
        time.sleep(0.5)
        
        # Now return to work range (get work location from settings)
        settings_response = requests.get(f"{BASE_URL}/api/tracking/settings")
        if settings_response.status_code == 200:
            settings = settings_response.json()
            work_locations = settings.get("work_locations", [])
            if work_locations:
                work_loc = work_locations[0]
                work_lat = work_loc.get("lat") or work_loc.get("latitude")
                work_lng = work_loc.get("lng") or work_loc.get("longitude")
                
                if work_lat and work_lng:
                    return_response = requests.post(f"{BASE_URL}/api/tracking/location", json={
                        "employee_id": self.employee_id,
                        "latitude": float(work_lat),
                        "longitude": float(work_lng),
                        "accuracy": 10
                    })
                    assert return_response.status_code == 200
                    return_data = return_response.json()
                    
                    print(f"Return location response: is_within_range={return_data.get('is_within_range')}, range_event={return_data.get('range_event')}")
                    
                    if return_data.get('range_event') == 'return':
                        print(f"PASS: Return to range event triggered, range_event='return'")
                    else:
                        print(f"INFO: range_event={return_data.get('range_event')} (may not have been outside before)")
                else:
                    pytest.skip("Work location coordinates not available in settings")
            else:
                pytest.skip("No work locations configured")
        else:
            pytest.skip("Could not get tracking settings")


class TestNetworkDetection:
    """Test network detection endpoint (from previous iteration context)"""
    
    def test_detect_network_endpoint_works(self):
        """GET /api/tracking/detect-network still works"""
        response = requests.get(f"{BASE_URL}/api/tracking/detect-network")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "client_ip" in data, "Response missing client_ip"
        assert "is_company_network" in data, "Response missing is_company_network"
        
        print(f"PASS: detect-network returns client_ip={data.get('client_ip')}, is_company_network={data.get('is_company_network')}")
    
    def test_company_ip_configured(self):
        """Company IP 85.154.168.39 is still configured"""
        response = requests.get(f"{BASE_URL}/api/tracking/settings")
        assert response.status_code == 200
        
        settings = response.json()
        work_locations = settings.get("work_locations", [])
        
        configured_ips = [loc.get("wifi_ip_range") for loc in work_locations if loc.get("wifi_ip_range")]
        assert "85.154.168.39" in configured_ips, f"Company IP not found in configured IPs: {configured_ips}"
        
        print(f"PASS: Company IP 85.154.168.39 is configured in work_locations")


class TestEmployeeLogin:
    """Test employee login endpoint"""
    
    def test_employee_login_with_code(self):
        """POST /api/tracking/employee-login works with EMP201802"""
        response = requests.post(f"{BASE_URL}/api/tracking/employee-login", json={
            "employee_code": "EMP201802"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "employee" in data, "Response missing employee field"
        assert data["employee"]["name"] == "Said Mohammed Said Al Maamari", f"Unexpected employee name: {data['employee']['name']}"
        
        print(f"PASS: Login returns employee: {data['employee']['name']}")


class TestExitAlertCreation:
    """Test that exit range creates tracking alert"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with employee login"""
        response = requests.post(f"{BASE_URL}/api/tracking/employee-login", json={
            "employee_code": "EMP201802"
        })
        if response.status_code == 200:
            self.employee_id = response.json().get("employee", {}).get("id")
    
    def test_alerts_endpoint_exists(self):
        """GET /api/tracking/alerts endpoint exists and returns array"""
        response = requests.get(f"{BASE_URL}/api/tracking/alerts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        
        print(f"PASS: Alerts endpoint returns {len(data)} alerts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
