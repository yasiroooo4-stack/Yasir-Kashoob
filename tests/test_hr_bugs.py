"""
Test HR Bug Fixes:
1. PUT /api/hr/employees/{id}/leave-rate - Monthly leave rate update
2. GET /api/hr/attendance - Attendance records for refresh button
3. GET /api/suppliers - Suppliers with optional phone/address fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLeaveRateEndpoint:
    """Test monthly leave rate update endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and employee ID"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get an employee ID for testing
        emp_response = requests.get(f"{BASE_URL}/api/hr/employees", headers=self.headers)
        assert emp_response.status_code == 200, f"Failed to get employees: {emp_response.text}"
        employees = emp_response.json()
        assert len(employees) > 0, "No employees found for testing"
        self.employee = employees[0]
        self.employee_id = self.employee.get("id")
    
    def test_update_leave_rate_success(self):
        """Test successful leave rate update"""
        # Update leave rate
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{self.employee_id}/leave-rate",
            json={"monthly_leave_rate": 3.0},
            headers=self.headers
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "new_rate" in data, "Response should contain new_rate"
        assert data["new_rate"] == 3.0, f"Expected rate 3.0, got {data['new_rate']}"
        print(f"✓ Leave rate updated successfully: {data}")
    
    def test_update_leave_rate_auto_rate(self):
        """Test updating with auto rate (2.6 default)"""
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{self.employee_id}/leave-rate",
            json={"monthly_leave_rate": 2.6},
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["new_rate"] == 2.6, f"Expected rate 2.6, got {data['new_rate']}"
        print(f"✓ Auto rate (2.6) set successfully: {data}")
    
    def test_update_leave_rate_invalid_employee(self):
        """Test updating leave rate for non-existent employee"""
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/invalid-employee-id-12345/leave-rate",
            json={"monthly_leave_rate": 3.0},
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ Invalid employee correctly returns 404")
    
    def test_update_leave_rate_unauthorized(self):
        """Test updating leave rate without auth"""
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{self.employee_id}/leave-rate",
            json={"monthly_leave_rate": 3.0}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"✓ Unauthorized request correctly returns 401")


class TestAttendanceRefresh:
    """Test attendance endpoint for refresh button functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_attendance_records(self):
        """Test fetching attendance records"""
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Attendance records fetched: {len(data)} records")
    
    def test_get_attendance_with_date_filter(self):
        """Test fetching attendance with date filter"""
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance",
            params={
                "start_date": "2026-01-01",
                "end_date": "2026-01-31"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Attendance records with date filter: {len(data)} records")
    
    def test_get_attendance_report(self):
        """Test fetching attendance report (used by refresh button)"""
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/report",
            params={"year": 2026, "month": 1},
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "report" in data, "Response should contain 'report' key"
        print(f"✓ Attendance report fetched successfully")


class TestSuppliersOptionalFields:
    """Test suppliers API with optional phone/address fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_suppliers(self):
        """Test fetching suppliers list"""
        response = requests.get(
            f"{BASE_URL}/api/suppliers",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Suppliers fetched: {len(data)} suppliers")
        
        # Check that suppliers can have optional phone/address
        if len(data) > 0:
            supplier = data[0]
            # These fields should exist but can be None/empty
            assert "name" in supplier, "Supplier should have name"
            print(f"✓ Sample supplier: {supplier.get('name')}, phone: {supplier.get('phone', 'N/A')}, address: {supplier.get('address', 'N/A')}")
    
    def test_create_supplier_without_phone_address(self):
        """Test creating supplier without phone and address (optional fields)"""
        import uuid
        test_code = f"TEST_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/suppliers",
            json={
                "name": f"Test Supplier {test_code}",
                "code": test_code,
                "milk_type": "cow"
                # phone and address are intentionally omitted
            },
            headers=self.headers
        )
        
        # Should succeed even without phone/address
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data or "name" in data, "Response should contain supplier data"
        print(f"✓ Supplier created without phone/address: {data.get('name', data.get('id'))}")
        
        # Cleanup - delete the test supplier
        if "id" in data:
            cleanup_response = requests.delete(
                f"{BASE_URL}/api/suppliers/{data['id']}",
                headers=self.headers
            )
            print(f"✓ Test supplier cleaned up: {cleanup_response.status_code}")
    
    def test_create_supplier_with_phone_address(self):
        """Test creating supplier with phone and address"""
        import uuid
        test_code = f"TEST_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/suppliers",
            json={
                "name": f"Test Supplier {test_code}",
                "code": test_code,
                "milk_type": "cow",
                "phone": "12345678",
                "address": "Test Address"
            },
            headers=self.headers
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        print(f"✓ Supplier created with phone/address: {data.get('name', data.get('id'))}")
        
        # Cleanup
        if "id" in data:
            requests.delete(f"{BASE_URL}/api/suppliers/{data['id']}", headers=self.headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
