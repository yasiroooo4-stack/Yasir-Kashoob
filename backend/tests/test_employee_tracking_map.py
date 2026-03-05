"""
Test cases for Employee Tracking Map feature
- Tests the bug fix where fingerprint employees were not showing on map
- Default mode changed from 'gps' to 'attendance'
- Marker ID type consistency fix (always use String)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmployeeTrackingAPIs:
    """Test employee tracking endpoints"""
    
    def test_attendance_based_employees_returns_data(self):
        """Test /api/tracking/employees/attendance-based returns employees with coordinates"""
        response = requests.get(f"{BASE_URL}/api/tracking/employees/attendance-based")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify we have employees with coordinates
        print(f"Found {len(data)} attendance-based employees")
        
        for emp in data:
            assert "employee_id" in emp, "Employee should have employee_id"
            assert "employee_name" in emp, "Employee should have employee_name"
            assert "latitude" in emp, "Employee should have latitude"
            assert "longitude" in emp, "Employee should have longitude"
            assert emp["latitude"] is not None, "Latitude should not be None"
            assert emp["longitude"] is not None, "Longitude should not be None"
            print(f"  - {emp['employee_name']}: ({emp['latitude']}, {emp['longitude']})")
    
    def test_attendance_based_employees_with_date_param(self):
        """Test /api/tracking/employees/attendance-based accepts date parameter"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/tracking/employees/attendance-based?date={today}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} employees for date {today}")
    
    def test_gps_employees_endpoint(self):
        """Test /api/tracking/employees returns GPS connected employees (may be empty)"""
        response = requests.get(f"{BASE_URL}/api/tracking/employees")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} GPS connected employees")
    
    def test_all_employees_endpoint(self):
        """Test /api/tracking/employees/all returns all employees"""
        response = requests.get(f"{BASE_URL}/api/tracking/employees/all")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one employee"
        
        print(f"Found {len(data)} total employees")
        
        # Verify employee structure
        for emp in data[:3]:  # Check first 3
            assert "id" in emp, "Employee should have id"
            assert "name" in emp, "Employee should have name"
            print(f"  - {emp['name']} ({emp.get('employee_code', 'N/A')})")
    
    def test_attendance_based_employees_have_required_fields(self):
        """Test attendance-based employees have all fields needed for map display"""
        response = requests.get(f"{BASE_URL}/api/tracking/employees/attendance-based")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) == 0:
            pytest.skip("No attendance-based employees found for today")
        
        # Check first employee has all required map fields
        emp = data[0]
        required_fields = [
            "employee_id", "employee_name", "latitude", "longitude",
            "attendance_status", "source", "check_in_time"
        ]
        
        for field in required_fields:
            assert field in emp, f"Missing required field: {field}"
            print(f"  {field}: {emp[field]}")
    
    def test_employee_ids_are_strings_for_marker_consistency(self):
        """Test that employee IDs can be converted to strings (marker ID consistency fix)"""
        response = requests.get(f"{BASE_URL}/api/tracking/employees/attendance-based")
        assert response.status_code == 200
        
        data = response.json()
        for emp in data:
            emp_id = emp.get("employee_id")
            # Verify ID can be converted to string (the fix uses String(emp.employee_id))
            assert emp_id is not None, "employee_id should not be None"
            str_id = str(emp_id)
            assert len(str_id) > 0, "String ID should not be empty"
            print(f"Employee {emp['employee_name']}: ID type={type(emp_id).__name__}, str='{str_id[:20]}...'")


class TestTrackingSettings:
    """Test tracking settings endpoints"""
    
    def test_get_tracking_settings(self):
        """Test /api/tracking/settings returns settings"""
        response = requests.get(f"{BASE_URL}/api/tracking/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "enabled" in data, "Settings should have 'enabled' field"
        assert "work_locations" in data, "Settings should have 'work_locations' field"
        
        print(f"Tracking enabled: {data['enabled']}")
        print(f"Work locations count: {len(data.get('work_locations', []))}")
    
    def test_work_locations_have_coordinates(self):
        """Test work locations have lat/lng for map display"""
        response = requests.get(f"{BASE_URL}/api/tracking/settings")
        assert response.status_code == 200
        
        data = response.json()
        work_locations = data.get("work_locations", [])
        
        for loc in work_locations:
            assert "name" in loc, "Location should have name"
            # Check for lat/lng (might be 'lat' or 'latitude')
            has_lat = "lat" in loc or "latitude" in loc
            has_lng = "lng" in loc or "longitude" in loc
            assert has_lat, f"Location {loc.get('name')} should have latitude"
            assert has_lng, f"Location {loc.get('name')} should have longitude"
            print(f"  - {loc.get('name')}: ({loc.get('lat', loc.get('latitude'))}, {loc.get('lng', loc.get('longitude'))})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
