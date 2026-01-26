"""
Test file for Permissions and Theme Settings - اختبار الصلاحيات وإعدادات المظهر
Tests:
1. Employee login returns correct permissions from user_permissions table
2. Theme settings are saved per user (not global)
3. Permissions grant/revoke API works correctly
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmployeePermissions:
    """Test employee permissions are returned correctly on login"""
    
    def test_emp201802_has_dashboard_view_permission(self):
        """EMP201802 should have dashboard_view permission"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "EMP201802",
            "password": "0000"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify user data
        assert "user" in data
        user = data["user"]
        assert user["full_name"] == "Said Mohammed Said Al Maamari"
        
        # Verify permissions
        permissions = user.get("permissions", [])
        assert "dashboard_view" in permissions, f"Expected dashboard_view in permissions, got: {permissions}"
        assert len(permissions) == 1, f"Expected 1 permission, got {len(permissions)}: {permissions}"
    
    def test_emp202554_has_17_permissions(self):
        """EMP202554 should have 17 HR-related permissions"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "EMP202554",
            "password": "0000"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify user data
        assert "user" in data
        user = data["user"]
        assert user["full_name"] == "Aya Ahmed Said Al Masahli"
        
        # Verify permissions count
        permissions = user.get("permissions", [])
        assert len(permissions) == 17, f"Expected 17 permissions, got {len(permissions)}: {permissions}"
        
        # Verify some key HR permissions are present
        expected_permissions = [
            "hr_employees_view",
            "hr_payroll_view",
            "hr_attendance_view",
            "hr_leaves_view"
        ]
        for perm in expected_permissions:
            assert perm in permissions, f"Expected {perm} in permissions"


class TestThemeSettings:
    """Test theme settings are saved per user"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin1111"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture
    def employee_token(self):
        """Get employee authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "EMP201802",
            "password": "0000"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_user_settings(self, admin_token):
        """Test GET /api/user/settings returns user settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/user/settings", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify settings structure
        assert "user_id" in data
        assert "app_theme" in data
        assert "dark_mode" in data
    
    def test_update_theme_settings(self, admin_token):
        """Test PUT /api/user/settings updates theme"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Update to sunset theme
        response = requests.put(f"{BASE_URL}/api/user/settings", 
            headers=headers,
            json={
                "app_theme": "sunset",
                "dark_mode": False,
                "background_id": "bg1",
                "theme": "light",
                "sidebar_collapsed": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["app_theme"] == "sunset"
        assert data["dark_mode"] == False
        
        # Verify settings persisted
        get_response = requests.get(f"{BASE_URL}/api/user/settings", headers=headers)
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["app_theme"] == "sunset"
    
    def test_theme_settings_are_per_user(self, admin_token, employee_token):
        """Test that theme settings are separate for each user"""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        employee_headers = {"Authorization": f"Bearer {employee_token}"}
        
        # Set admin theme to ocean
        requests.put(f"{BASE_URL}/api/user/settings", 
            headers=admin_headers,
            json={
                "app_theme": "ocean",
                "dark_mode": True,
                "background_id": "bg1",
                "theme": "light",
                "sidebar_collapsed": False
            }
        )
        
        # Set employee theme to forest
        requests.put(f"{BASE_URL}/api/user/settings", 
            headers=employee_headers,
            json={
                "app_theme": "forest",
                "dark_mode": False,
                "background_id": "bg1",
                "theme": "light",
                "sidebar_collapsed": False
            }
        )
        
        # Verify admin settings
        admin_settings = requests.get(f"{BASE_URL}/api/user/settings", headers=admin_headers).json()
        assert admin_settings["app_theme"] == "ocean"
        assert admin_settings["dark_mode"] == True
        
        # Verify employee settings are different
        employee_settings = requests.get(f"{BASE_URL}/api/user/settings", headers=employee_headers).json()
        assert employee_settings["app_theme"] == "forest"
        assert employee_settings["dark_mode"] == False
        
        # Verify user_ids are different
        assert admin_settings["user_id"] != employee_settings["user_id"]


class TestPermissionsAPI:
    """Test permissions management API"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin1111"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_available_permissions(self, admin_token):
        """Test GET /api/permissions/available returns all permissions"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/permissions/available", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "permissions" in data
        assert "categories" in data
        assert len(data["permissions"]) > 100  # Should have 113+ permissions
    
    def test_get_departments(self, admin_token):
        """Test GET /api/permissions/departments returns all departments"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/permissions/departments", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "departments" in data
        assert len(data["departments"]) >= 9  # Should have 9 departments
    
    def test_get_user_permissions(self, admin_token):
        """Test GET /api/permissions/user/{employee_id} returns user permissions"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get an employee ID
        emp_response = requests.get(f"{BASE_URL}/api/hr/employees", headers=headers)
        assert emp_response.status_code == 200
        employees = emp_response.json()
        
        if employees:
            employee_id = employees[0]["id"]
            response = requests.get(f"{BASE_URL}/api/permissions/user/{employee_id}", headers=headers)
            
            assert response.status_code == 200
            data = response.json()
            
            assert "employee_id" in data
            assert "employee_name" in data
            assert "granted_permissions" in data
            assert "all_permissions" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
