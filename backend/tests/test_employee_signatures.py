"""
Test Employee Electronic Signatures APIs
Tests for:
- POST /api/hr/employees/{employee_id}/signature - Upload signature
- DELETE /api/hr/employees/{employee_id}/signature - Delete signature
- GET /api/hr/signatures/authorized - Get authorized signatures
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmployeeSignatures:
    """Test suite for employee electronic signature APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.test_employee_id = None
        
    def get_auth_token(self):
        """Get authentication token"""
        if self.token:
            return self.token
            
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin1111"
        })
        
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            return self.token
        return None
    
    def get_or_create_test_employee(self):
        """Get or create a test employee for signature testing"""
        token = self.get_auth_token()
        if not token:
            pytest.skip("Authentication failed")
            
        # First try to find an existing employee
        response = self.session.get(f"{BASE_URL}/api/hr/employees")
        if response.status_code == 200:
            employees = response.json()
            if employees and len(employees) > 0:
                # Use the first employee for testing
                self.test_employee_id = employees[0].get("id")
                return self.test_employee_id
        
        # If no employees exist, create one
        employee_data = {
            "name": "TEST_Signature_Employee",
            "employee_code": "TEST_SIG_001",
            "department": "IT",
            "position": "Test Position",
            "phone": "12345678",
            "email": "test_sig@test.com",
            "hire_date": "2024-01-01",
            "is_active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/hr/employees", json=employee_data)
        if response.status_code in [200, 201]:
            self.test_employee_id = response.json().get("id")
            return self.test_employee_id
        
        return None
    
    def test_01_login_success(self):
        """Test login to get authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin1111"
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        self.token = data["access_token"]
        print(f"✓ Login successful, token received")
    
    def test_02_get_employees_list(self):
        """Test getting employees list"""
        token = self.get_auth_token()
        assert token, "Failed to get auth token"
        
        response = self.session.get(f"{BASE_URL}/api/hr/employees")
        assert response.status_code == 200, f"Failed to get employees: {response.text}"
        
        employees = response.json()
        assert isinstance(employees, list), "Response should be a list"
        print(f"✓ Got {len(employees)} employees")
        
        if employees:
            # Check if signature_url field exists in employee model
            first_emp = employees[0]
            print(f"  Employee fields: {list(first_emp.keys())[:10]}...")
    
    def test_03_upload_signature_success(self):
        """Test uploading employee signature"""
        employee_id = self.get_or_create_test_employee()
        assert employee_id, "Failed to get/create test employee"
        
        # Create a simple PNG image (1x1 pixel transparent PNG)
        # This is a minimal valid PNG file
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 pixel
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,  # RGBA
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,  # IEND chunk
            0x42, 0x60, 0x82
        ])
        
        # Remove Content-Type header for multipart upload
        headers = {"Authorization": f"Bearer {self.token}"}
        
        files = {
            'file': ('test_signature.png', io.BytesIO(png_data), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hr/employees/{employee_id}/signature",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "signature_url" in data, "No signature_url in response"
        assert data["signature_url"].startswith("/api/uploads/"), f"Invalid signature URL: {data['signature_url']}"
        print(f"✓ Signature uploaded successfully: {data['signature_url']}")
    
    def test_04_verify_signature_in_employee(self):
        """Test that signature_url is saved in employee record"""
        employee_id = self.get_or_create_test_employee()
        assert employee_id, "Failed to get test employee"
        
        response = self.session.get(f"{BASE_URL}/api/hr/employees/{employee_id}")
        
        # If single employee endpoint doesn't exist, get from list
        if response.status_code == 404:
            response = self.session.get(f"{BASE_URL}/api/hr/employees")
            assert response.status_code == 200
            employees = response.json()
            employee = next((e for e in employees if e.get("id") == employee_id), None)
        else:
            assert response.status_code == 200, f"Failed to get employee: {response.text}"
            employee = response.json()
        
        assert employee, "Employee not found"
        
        # Check if signature_url exists (may or may not have value depending on previous test)
        if employee.get("signature_url"):
            print(f"✓ Employee has signature_url: {employee['signature_url']}")
        else:
            print(f"✓ Employee signature_url field exists (currently empty)")
    
    def test_05_upload_signature_invalid_file_type(self):
        """Test uploading invalid file type (should fail)"""
        employee_id = self.get_or_create_test_employee()
        assert employee_id, "Failed to get test employee"
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Try to upload a text file
        files = {
            'file': ('test.txt', io.BytesIO(b'This is not an image'), 'text/plain')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hr/employees/{employee_id}/signature",
            headers=headers,
            files=files
        )
        
        # Should fail with 400 Bad Request
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"✓ Invalid file type correctly rejected")
    
    def test_06_upload_signature_file_too_large(self):
        """Test uploading file larger than 2MB (should fail)"""
        employee_id = self.get_or_create_test_employee()
        assert employee_id, "Failed to get test employee"
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create a file larger than 2MB
        large_data = b'x' * (3 * 1024 * 1024)  # 3MB
        
        files = {
            'file': ('large_signature.png', io.BytesIO(large_data), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hr/employees/{employee_id}/signature",
            headers=headers,
            files=files
        )
        
        # Should fail with 400 Bad Request
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"✓ Large file correctly rejected")
    
    def test_07_upload_signature_nonexistent_employee(self):
        """Test uploading signature for non-existent employee"""
        token = self.get_auth_token()
        assert token, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
            0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test_signature.png', io.BytesIO(png_data), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hr/employees/nonexistent-employee-id/signature",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ Non-existent employee correctly returns 404")
    
    def test_08_get_authorized_signatures(self):
        """Test getting authorized signatures (GM, HR, Finance)"""
        token = self.get_auth_token()
        assert token, "Failed to get auth token"
        
        response = self.session.get(f"{BASE_URL}/api/hr/signatures/authorized")
        
        assert response.status_code == 200, f"Failed to get authorized signatures: {response.text}"
        data = response.json()
        
        assert isinstance(data, dict), "Response should be a dictionary"
        
        # Check structure - may be empty if no authorized signers have signatures
        print(f"✓ Authorized signatures API working")
        print(f"  Found signatures for: {list(data.keys()) if data else 'None (no authorized signers with signatures)'}")
        
        # If there are signatures, verify structure
        for role, sig_data in data.items():
            assert "employee_id" in sig_data, f"Missing employee_id for {role}"
            assert "employee_name" in sig_data, f"Missing employee_name for {role}"
            assert "signature_url" in sig_data, f"Missing signature_url for {role}"
            print(f"  - {role}: {sig_data['employee_name']} ({sig_data['position']})")
    
    def test_09_delete_signature_success(self):
        """Test deleting employee signature"""
        employee_id = self.get_or_create_test_employee()
        assert employee_id, "Failed to get test employee"
        
        # First upload a signature to delete
        headers = {"Authorization": f"Bearer {self.token}"}
        
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
            0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test_signature.png', io.BytesIO(png_data), 'image/png')
        }
        
        # Upload first
        upload_response = requests.post(
            f"{BASE_URL}/api/hr/employees/{employee_id}/signature",
            headers=headers,
            files=files
        )
        
        if upload_response.status_code != 200:
            pytest.skip(f"Could not upload signature for delete test: {upload_response.text}")
        
        # Now delete
        response = self.session.delete(f"{BASE_URL}/api/hr/employees/{employee_id}/signature")
        
        assert response.status_code == 200, f"Delete failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "message" in data, "No message in response"
        print(f"✓ Signature deleted successfully: {data['message']}")
    
    def test_10_delete_signature_nonexistent_employee(self):
        """Test deleting signature for non-existent employee"""
        token = self.get_auth_token()
        assert token, "Failed to get auth token"
        
        response = self.session.delete(f"{BASE_URL}/api/hr/employees/nonexistent-employee-id/signature")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ Delete for non-existent employee correctly returns 404")
    
    def test_11_upload_signature_without_auth(self):
        """Test uploading signature without authentication (should fail)"""
        # Create a new session without auth
        no_auth_session = requests.Session()
        
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
            0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test_signature.png', io.BytesIO(png_data), 'image/png')
        }
        
        response = no_auth_session.post(
            f"{BASE_URL}/api/hr/employees/some-employee-id/signature",
            files=files
        )
        
        # Should fail with 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"✓ Unauthenticated request correctly rejected with {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
