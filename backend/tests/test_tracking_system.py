"""
Tracking System Tests - اختبارات نظام تتبع الموظفين
Tests for employee GPS tracking APIs including:
- Tracking settings CRUD
- Employee location updates
- Work locations management
- Alerts management
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_ADMIN = {"username": "yasir", "password": "admin1111"}

class TestTrackingSettings:
    """Tests for tracking settings APIs"""
    
    def test_get_tracking_settings(self):
        """GET /api/tracking/settings - جلب إعدادات التتبع"""
        response = requests.get(f"{BASE_URL}/api/tracking/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields exist
        assert "enabled" in data, "enabled field missing"
        assert "update_interval_seconds" in data, "update_interval_seconds field missing"
        assert "work_radius_meters" in data, "work_radius_meters field missing"
        assert "alert_on_exit" in data, "alert_on_exit field missing"
        assert "work_locations" in data, "work_locations field missing"
        
        # Verify types
        assert isinstance(data["enabled"], bool), "enabled should be boolean"
        assert isinstance(data["update_interval_seconds"], int), "update_interval_seconds should be int"
        assert isinstance(data["work_radius_meters"], int), "work_radius_meters should be int"
        assert isinstance(data["alert_on_exit"], bool), "alert_on_exit should be boolean"
        assert isinstance(data["work_locations"], list), "work_locations should be list"
        
        print(f"✓ GET /api/tracking/settings - Settings retrieved successfully")
        print(f"  - enabled: {data['enabled']}")
        print(f"  - update_interval_seconds: {data['update_interval_seconds']}")
        print(f"  - work_radius_meters: {data['work_radius_meters']}")
        print(f"  - work_locations count: {len(data['work_locations'])}")
    
    def test_update_tracking_settings(self):
        """PUT /api/tracking/settings - تحديث إعدادات التتبع"""
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/tracking/settings")
        assert get_response.status_code == 200
        original_settings = get_response.json()
        
        # Update settings
        update_data = {
            "enabled": True,
            "update_interval_seconds": 90,
            "work_radius_meters": 600,
            "alert_on_exit": True
        }
        
        response = requests.put(f"{BASE_URL}/api/tracking/settings", json=update_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Update should return success=True"
        
        # Verify update persisted
        verify_response = requests.get(f"{BASE_URL}/api/tracking/settings")
        assert verify_response.status_code == 200
        verified_data = verify_response.json()
        
        assert verified_data["update_interval_seconds"] == 90, "update_interval_seconds should be 90"
        assert verified_data["work_radius_meters"] == 600, "work_radius_meters should be 600"
        
        # Restore original settings
        restore_data = {
            "update_interval_seconds": original_settings.get("update_interval_seconds", 60),
            "work_radius_meters": original_settings.get("work_radius_meters", 500)
        }
        requests.put(f"{BASE_URL}/api/tracking/settings", json=restore_data)
        
        print(f"✓ PUT /api/tracking/settings - Settings updated and verified successfully")


class TestWorkLocations:
    """Tests for work locations management"""
    
    def test_add_work_location(self):
        """POST /api/tracking/settings/work-location - إضافة موقع عمل"""
        # Add a test work location
        location_data = {
            "name": "TEST_موقع اختبار",
            "lat": 17.0234,
            "lng": 54.0900,
            "radius": 500
        }
        
        response = requests.post(f"{BASE_URL}/api/tracking/settings/work-location", json=location_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success=True"
        assert "location" in data, "Response should include location"
        
        location = data["location"]
        assert location.get("name") == location_data["name"], "Location name should match"
        assert location.get("lat") == location_data["lat"], "Latitude should match"
        assert location.get("lng") == location_data["lng"], "Longitude should match"
        assert location.get("radius") == location_data["radius"], "Radius should match"
        assert "id" in location, "Location should have an ID"
        
        # Save location ID for cleanup
        self.test_location_id = location.get("id")
        
        # Verify in settings
        settings_response = requests.get(f"{BASE_URL}/api/tracking/settings")
        assert settings_response.status_code == 200
        settings = settings_response.json()
        
        found = any(loc.get("id") == self.test_location_id for loc in settings.get("work_locations", []))
        assert found, "New location should appear in settings"
        
        print(f"✓ POST /api/tracking/settings/work-location - Work location added successfully")
        print(f"  - Location ID: {self.test_location_id}")
        print(f"  - Name: {location_data['name']}")
        
        return self.test_location_id
    
    def test_delete_work_location(self):
        """DELETE /api/tracking/settings/work-location/{id} - حذف موقع عمل"""
        # First add a location to delete
        location_data = {
            "name": "TEST_موقع للحذف",
            "lat": 17.0500,
            "lng": 54.1000,
            "radius": 300
        }
        
        add_response = requests.post(f"{BASE_URL}/api/tracking/settings/work-location", json=location_data)
        assert add_response.status_code == 200
        location_id = add_response.json()["location"]["id"]
        
        # Delete the location
        response = requests.delete(f"{BASE_URL}/api/tracking/settings/work-location/{location_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Delete should return success=True"
        
        # Verify deleted from settings
        settings_response = requests.get(f"{BASE_URL}/api/tracking/settings")
        assert settings_response.status_code == 200
        settings = settings_response.json()
        
        found = any(loc.get("id") == location_id for loc in settings.get("work_locations", []))
        assert not found, "Deleted location should not appear in settings"
        
        print(f"✓ DELETE /api/tracking/settings/work-location/{location_id} - Work location deleted successfully")


class TestEmployeeLocation:
    """Tests for employee location tracking"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get a valid employee ID for testing"""
        response = requests.get(f"{BASE_URL}/api/tracking/employees/all")
        if response.status_code == 200:
            employees = response.json()
            if employees:
                self.test_employee = employees[0]
                self.employee_id = self.test_employee.get("id")
            else:
                self.test_employee = None
                self.employee_id = None
        else:
            self.test_employee = None
            self.employee_id = None
    
    def test_post_employee_location(self):
        """POST /api/tracking/location - إرسال موقع موظف"""
        if not self.employee_id:
            pytest.skip("No employees found to test location update")
        
        location_data = {
            "employee_id": self.employee_id,
            "latitude": 17.0234,
            "longitude": 54.0900,
            "accuracy": 10.5
        }
        
        response = requests.post(f"{BASE_URL}/api/tracking/location", json=location_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Location update should return success=True"
        assert "is_within_range" in data, "Response should include is_within_range"
        assert "distance_from_work" in data, "Response should include distance_from_work"
        
        print(f"✓ POST /api/tracking/location - Employee location updated successfully")
        print(f"  - Employee: {self.test_employee.get('name', 'Unknown')}")
        print(f"  - Is within range: {data['is_within_range']}")
        print(f"  - Distance from work: {data['distance_from_work']}m")
    
    def test_post_location_missing_fields(self):
        """POST /api/tracking/location - Should fail with missing fields"""
        location_data = {
            "latitude": 17.0234
            # Missing employee_id and longitude
        }
        
        response = requests.post(f"{BASE_URL}/api/tracking/location", json=location_data)
        assert response.status_code == 400, f"Expected 400 for missing fields, got {response.status_code}"
        print(f"✓ POST /api/tracking/location - Correctly rejects missing fields")
    
    def test_post_location_invalid_employee(self):
        """POST /api/tracking/location - Should fail with invalid employee"""
        location_data = {
            "employee_id": "invalid-employee-id-12345",
            "latitude": 17.0234,
            "longitude": 54.0900
        }
        
        response = requests.post(f"{BASE_URL}/api/tracking/location", json=location_data)
        assert response.status_code == 404, f"Expected 404 for invalid employee, got {response.status_code}"
        print(f"✓ POST /api/tracking/location - Correctly rejects invalid employee")


class TestTrackedEmployees:
    """Tests for getting tracked employees"""
    
    def test_get_tracked_employees(self):
        """GET /api/tracking/employees - جلب مواقع الموظفين المتصلين"""
        response = requests.get(f"{BASE_URL}/api/tracking/employees")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify structure if we have data
        if data:
            employee = data[0]
            expected_fields = ["employee_id", "employee_name", "latitude", "longitude", "is_within_range"]
            for field in expected_fields:
                assert field in employee, f"Employee should have {field} field"
        
        print(f"✓ GET /api/tracking/employees - Retrieved {len(data)} tracked employees")
    
    def test_get_all_employees_with_phones(self):
        """GET /api/tracking/employees/all - جلب جميع الموظفين مع أرقام هواتفهم"""
        response = requests.get(f"{BASE_URL}/api/tracking/employees/all")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if data:
            employee = data[0]
            assert "id" in employee, "Employee should have id field"
            assert "name" in employee, "Employee should have name field"
        
        print(f"✓ GET /api/tracking/employees/all - Retrieved {len(data)} employees")


class TestAlerts:
    """Tests for tracking alerts"""
    
    def test_get_alerts(self):
        """GET /api/tracking/alerts - جلب التنبيهات"""
        response = requests.get(f"{BASE_URL}/api/tracking/alerts?limit=20")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ GET /api/tracking/alerts - Retrieved {len(data)} alerts")
    
    def test_get_unread_alerts_count(self):
        """GET /api/tracking/alerts/count - عدد التنبيهات غير المقروءة"""
        response = requests.get(f"{BASE_URL}/api/tracking/alerts/count")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "count" in data, "Response should have count field"
        assert isinstance(data["count"], int), "Count should be an integer"
        
        print(f"✓ GET /api/tracking/alerts/count - Unread alerts: {data['count']}")


class TestRequestLocation:
    """Tests for location request feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get a valid employee ID for testing"""
        response = requests.get(f"{BASE_URL}/api/tracking/employees/all")
        if response.status_code == 200:
            employees = response.json()
            if employees:
                self.test_employee = employees[0]
                self.employee_id = self.test_employee.get("id")
            else:
                self.test_employee = None
                self.employee_id = None
        else:
            self.test_employee = None
            self.employee_id = None
    
    def test_request_employee_location(self):
        """POST /api/tracking/request-location/{employee_id} - طلب موقع موظف"""
        if not self.employee_id:
            pytest.skip("No employees found to test location request")
        
        response = requests.post(f"{BASE_URL}/api/tracking/request-location/{self.employee_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Request should return success=True"
        assert "tracking_link" in data, "Response should include tracking_link"
        
        print(f"✓ POST /api/tracking/request-location/{self.employee_id} - Location request sent")
        print(f"  - Tracking link: {data['tracking_link']}")
    
    def test_request_invalid_employee_location(self):
        """POST /api/tracking/request-location - Should fail with invalid employee"""
        response = requests.post(f"{BASE_URL}/api/tracking/request-location/invalid-id-12345")
        assert response.status_code == 404, f"Expected 404 for invalid employee, got {response.status_code}"
        print(f"✓ POST /api/tracking/request-location - Correctly rejects invalid employee")


class TestLocationHistory:
    """Tests for location history"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get a valid employee ID for testing"""
        response = requests.get(f"{BASE_URL}/api/tracking/employees/all")
        if response.status_code == 200:
            employees = response.json()
            if employees:
                self.test_employee = employees[0]
                self.employee_id = self.test_employee.get("id")
            else:
                self.test_employee = None
                self.employee_id = None
        else:
            self.test_employee = None
            self.employee_id = None
    
    def test_get_location_history(self):
        """GET /api/tracking/history/{employee_id} - جلب سجل تحركات موظف"""
        if not self.employee_id:
            pytest.skip("No employees found to test location history")
        
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/tracking/history/{self.employee_id}?date={today}&limit=50")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ GET /api/tracking/history/{self.employee_id} - Retrieved {len(data)} history records")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_locations(self):
        """Cleanup any TEST_ prefixed work locations"""
        settings_response = requests.get(f"{BASE_URL}/api/tracking/settings")
        if settings_response.status_code == 200:
            settings = settings_response.json()
            work_locations = settings.get("work_locations", [])
            
            deleted = 0
            for loc in work_locations:
                if loc.get("name", "").startswith("TEST_"):
                    del_response = requests.delete(f"{BASE_URL}/api/tracking/settings/work-location/{loc['id']}")
                    if del_response.status_code == 200:
                        deleted += 1
            
            print(f"✓ Cleanup completed - Deleted {deleted} test work locations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
