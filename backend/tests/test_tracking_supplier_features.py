"""
Test tracking API endpoints and supplier registration features
"""
import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://location-attendance.preview.emergentagent.com')

class TestTrackingAPI:
    """Test employee tracking location API"""
    
    def test_get_tracking_settings(self):
        """Test GET /api/tracking/settings returns valid settings"""
        response = requests.get(f"{BASE_URL}/api/tracking/settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "enabled" in data
        assert "work_radius_meters" in data
        assert "work_locations" in data
        assert "update_interval_seconds" in data
        assert isinstance(data["work_locations"], list)
        print(f"✓ Settings: enabled={data['enabled']}, radius={data['work_radius_meters']}m, locations={len(data['work_locations'])}")
    
    def test_get_all_employees(self):
        """Test GET /api/tracking/employees/all returns employees list"""
        response = requests.get(f"{BASE_URL}/api/tracking/employees/all")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            emp = data[0]
            assert "id" in emp
            assert "name" in emp
            assert "civil_id" in emp or "employee_code" in emp
            print(f"✓ Got {len(data)} employees. First: {emp['name']}")
        else:
            print("✓ No employees found but API working")
    
    def test_get_online_employees(self):
        """Test GET /api/tracking/employees returns online/tracked employees"""
        response = requests.get(f"{BASE_URL}/api/tracking/employees")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} currently tracked employees")
    
    def test_post_location_with_valid_employee(self):
        """Test POST /api/tracking/location with valid employee"""
        # First get a valid employee ID
        emp_response = requests.get(f"{BASE_URL}/api/tracking/employees/all")
        employees = emp_response.json()
        
        if len(employees) == 0:
            pytest.skip("No employees available for testing")
        
        emp_id = employees[0]["id"]
        
        # Send location
        location_data = {
            "employee_id": emp_id,
            "latitude": 17.0234,
            "longitude": 54.0900,
            "accuracy": 10
        }
        
        response = requests.post(f"{BASE_URL}/api/tracking/location", json=location_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert "is_within_range" in data
        assert "distance_from_work" in data
        print(f"✓ Location sent. Within range: {data['is_within_range']}, Distance: {data['distance_from_work']:.2f}m")
    
    def test_post_location_with_invalid_employee(self):
        """Test POST /api/tracking/location returns 404 for invalid employee"""
        location_data = {
            "employee_id": "invalid-employee-id-12345",
            "latitude": 17.0234,
            "longitude": 54.0900,
            "accuracy": 10
        }
        
        response = requests.post(f"{BASE_URL}/api/tracking/location", json=location_data)
        # Should return 404 for employee not found
        assert response.status_code == 404
        print("✓ Invalid employee returns 404")
    
    def test_get_tracking_alerts(self):
        """Test GET /api/tracking/alerts returns alerts list"""
        response = requests.get(f"{BASE_URL}/api/tracking/alerts?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} alerts")
    
    def test_get_alerts_count(self):
        """Test GET /api/tracking/alerts/count returns count"""
        response = requests.get(f"{BASE_URL}/api/tracking/alerts/count")
        assert response.status_code == 200
        
        data = response.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        print(f"✓ Unread alerts count: {data['count']}")


class TestSupplierRegistration:
    """Test supplier registration endpoints"""
    
    def test_check_registration_status(self):
        """Test GET /api/supplier-registration/check-status"""
        response = requests.get(f"{BASE_URL}/api/supplier-registration/check-status")
        assert response.status_code == 200
        
        data = response.json()
        assert "is_open" in data
        assert "milk_types" in data
        print(f"✓ Registration status: is_open={data['is_open']}")
    
    def test_submit_new_registration(self):
        """Test POST /api/supplier-registration/submit with unique data"""
        # Generate unique civil ID
        unique_civil_id = ''.join(random.choices(string.digits, k=9))
        
        form_data = {
            "civil_id": unique_civil_id,
            "name": "مورد اختبار API",
            "phone": "92123456",
            "milk_type": "أبقار",
            "expected_quantity": "50",
            "address": "منطقة الاختبار",
            "notes": "طلب اختبار تلقائي"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/supplier-registration/submit",
            data=form_data
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "registration_number" in data
        assert data["registration_number"].startswith("SUP-")
        print(f"✓ New registration created: {data['registration_number']}")
        
        return data["registration_number"]
    
    def test_check_registration_by_civil_id(self):
        """Test GET /api/supplier-registration/check/{civil_id}"""
        # First create a registration
        unique_civil_id = ''.join(random.choices(string.digits, k=9))
        
        form_data = {
            "civil_id": unique_civil_id,
            "name": "مورد للتحقق",
            "phone": "92654321",
            "milk_type": "أغنام",
            "expected_quantity": "30"
        }
        
        # Create registration
        create_response = requests.post(
            f"{BASE_URL}/api/supplier-registration/submit",
            data=form_data
        )
        assert create_response.status_code == 200
        
        # Check registration by civil ID
        check_response = requests.get(f"{BASE_URL}/api/supplier-registration/check/{unique_civil_id}")
        assert check_response.status_code == 200
        
        data = check_response.json()
        assert "found" in data
        assert data["found"] == True
        assert "registration_number" in data
        assert "name" in data
        assert "status" in data
        print(f"✓ Registration found: {data['registration_number']}, status: {data['status']}")
    
    def test_check_nonexistent_registration(self):
        """Test GET /api/supplier-registration/check/{civil_id} for non-existent"""
        response = requests.get(f"{BASE_URL}/api/supplier-registration/check/000000000")
        assert response.status_code == 200
        
        data = response.json()
        assert "found" in data
        assert data["found"] == False
        print("✓ Non-existent registration returns found=false")
    
    def test_duplicate_registration_rejected(self):
        """Test that duplicate civil_id is rejected"""
        # Create first registration
        civil_id = ''.join(random.choices(string.digits, k=9))
        
        form_data = {
            "civil_id": civil_id,
            "name": "مورد أول",
            "phone": "92111111",
            "milk_type": "إبل",
            "expected_quantity": "20"
        }
        
        first_response = requests.post(
            f"{BASE_URL}/api/supplier-registration/submit",
            data=form_data
        )
        assert first_response.status_code == 200
        
        # Try to create duplicate
        form_data["name"] = "مورد ثاني بنفس الرقم"
        second_response = requests.post(
            f"{BASE_URL}/api/supplier-registration/submit",
            data=form_data
        )
        
        # Should return 400 for duplicate
        assert second_response.status_code == 400
        print("✓ Duplicate registration correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
