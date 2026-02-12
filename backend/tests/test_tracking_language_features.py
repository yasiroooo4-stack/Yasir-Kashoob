"""
Test file for Employee Tracking and Supplier Registration Features
- Employee location tracking API
- Map markers with name and ID
- Language switching on supplier registration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTrackingAPIs:
    """Employee Tracking API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testadmin",
            "password": "admin123"
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_tracking_settings(self):
        """Test GET /api/tracking/settings"""
        response = requests.get(f"{BASE_URL}/api/tracking/settings", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        assert "work_locations" in data
        assert "work_radius_meters" in data
        print(f"✓ Tracking settings: {len(data.get('work_locations', []))} work locations configured")
    
    def test_get_all_employees_with_location(self):
        """Test GET /api/tracking/employees/all - returns employees with civil_id for map markers"""
        response = requests.get(f"{BASE_URL}/api/tracking/employees/all", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check that employees have name and civil_id for markers
        employees_with_location = [e for e in data if e.get("last_location")]
        for emp in employees_with_location[:3]:
            assert "name" in emp
            assert "civil_id" in emp or "employee_code" in emp
            print(f"✓ Employee: {emp.get('name')} - ID: {emp.get('civil_id') or emp.get('employee_code')}")
        
        print(f"✓ Total employees: {len(data)}, with location: {len(employees_with_location)}")
    
    def test_get_online_employees(self):
        """Test GET /api/tracking/employees - returns currently online employees"""
        response = requests.get(f"{BASE_URL}/api/tracking/employees", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check marker data fields
        for emp in data[:3]:
            assert "employee_name" in emp
            assert "employee_code" in emp or "civil_id" in emp
            assert "latitude" in emp
            assert "longitude" in emp
            print(f"✓ Online: {emp.get('employee_name')} at ({emp.get('latitude')}, {emp.get('longitude')})")
        
        print(f"✓ Currently online: {len(data)} employees")
    
    def test_post_location_update(self):
        """Test POST /api/tracking/location - send employee location"""
        # First get an employee ID
        response = requests.get(f"{BASE_URL}/api/tracking/employees/all", headers=self.headers)
        employees = response.json()
        
        if not employees:
            pytest.skip("No employees found")
        
        employee = employees[0]
        
        # Send location update
        location_data = {
            "employee_id": employee["id"],
            "latitude": 17.0234,
            "longitude": 54.0900,
            "accuracy": 15
        }
        
        response = requests.post(f"{BASE_URL}/api/tracking/location", 
                                json=location_data, 
                                headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "is_within_range" in data
        assert "distance_from_work" in data
        print(f"✓ Location sent: within_range={data['is_within_range']}, distance={data['distance_from_work']}m")
    
    def test_get_tracking_alerts(self):
        """Test GET /api/tracking/alerts"""
        response = requests.get(f"{BASE_URL}/api/tracking/alerts", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Alerts: {len(data)} tracking alerts")
    
    def test_get_alerts_count(self):
        """Test GET /api/tracking/alerts/count"""
        response = requests.get(f"{BASE_URL}/api/tracking/alerts/count", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        print(f"✓ Unread alerts count: {data['count']}")


class TestSupplierRegistrationAPI:
    """Supplier Registration API Tests"""
    
    def test_check_registration_status(self):
        """Test GET /api/supplier-registration/check-status"""
        response = requests.get(f"{BASE_URL}/api/supplier-registration/check-status")
        assert response.status_code == 200
        data = response.json()
        assert "is_open" in data
        print(f"✓ Registration status: is_open={data.get('is_open')}")
    
    def test_check_supplier_by_civil_id_not_found(self):
        """Test GET /api/supplier-registration/check/{civil_id} - not found"""
        response = requests.get(f"{BASE_URL}/api/supplier-registration/check/999999999")
        # Should return 200 with found=false or 404
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert data.get("found") == False
        print("✓ Check supplier by civil ID (not found) works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
