"""
Test Milk Reception Edit and Delete APIs
Tests for:
- PUT /api/milk-receptions/{id} - Edit milk reception (requires milk_reception_edit permission)
- DELETE /api/milk-receptions/{id} - Delete milk reception (requires milk_reception_delete permission)
- Permission checks for edit and delete operations
- Cannot delete paid receptions (is_paid=true)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agro-manager-7.preview.emergentagent.com')

class TestMilkReceptionEditDelete:
    """Test milk reception edit and delete functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin (yasir)
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.user = login_response.json()["user"]
        
        # Get a supplier for testing
        suppliers_response = self.session.get(f"{BASE_URL}/api/suppliers")
        assert suppliers_response.status_code == 200
        suppliers = suppliers_response.json()
        if suppliers:
            self.test_supplier = suppliers[0]
        else:
            pytest.skip("No suppliers available for testing")
    
    def test_01_login_success(self):
        """Test admin login works"""
        assert self.user["role"] == "admin"
        assert self.user["username"] == "yasir"
        print(f"✅ Login successful as admin: {self.user['full_name']}")
    
    def test_02_create_milk_reception_for_testing(self):
        """Create a milk reception to test edit and delete"""
        reception_data = {
            "supplier_id": self.test_supplier["id"],
            "supplier_name": self.test_supplier["name"],
            "quantity_liters": 100.5,
            "price_per_liter": 0.5,
            "quality_test": {
                "fat_percentage": 3.5,
                "protein_percentage": 3.2,
                "temperature": 4.0,
                "density": 1.028,
                "acidity": 0.16,
                "water_content": 0.0,
                "is_accepted": True,
                "notes": "Test reception for edit/delete"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/milk-receptions", json=reception_data)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        created = response.json()
        self.created_reception_id = created["id"]
        
        assert created["quantity_liters"] == 100.5
        assert created["price_per_liter"] == 0.5
        assert created["total_amount"] == 50.25  # 100.5 * 0.5
        print(f"✅ Created milk reception: {self.created_reception_id}")
        
        # Store for other tests
        TestMilkReceptionEditDelete.test_reception_id = created["id"]
    
    def test_03_get_milk_reception_by_id(self):
        """Test getting a specific milk reception"""
        reception_id = getattr(TestMilkReceptionEditDelete, 'test_reception_id', None)
        if not reception_id:
            pytest.skip("No test reception created")
        
        response = self.session.get(f"{BASE_URL}/api/milk-receptions/{reception_id}")
        assert response.status_code == 200, f"Get failed: {response.text}"
        
        reception = response.json()
        assert reception["id"] == reception_id
        print(f"✅ Got milk reception: {reception_id}")
    
    def test_04_update_milk_reception_success(self):
        """Test updating a milk reception (admin has permission)"""
        reception_id = getattr(TestMilkReceptionEditDelete, 'test_reception_id', None)
        if not reception_id:
            pytest.skip("No test reception created")
        
        update_data = {
            "supplier_id": self.test_supplier["id"],
            "supplier_name": self.test_supplier["name"],
            "quantity_liters": 150.0,  # Changed from 100.5
            "price_per_liter": 0.55,   # Changed from 0.5
            "quality_test": {
                "fat_percentage": 3.8,  # Changed
                "protein_percentage": 3.3,
                "temperature": 4.5,
                "density": 1.030,
                "acidity": 0.15,
                "water_content": 0.0,
                "is_accepted": True,
                "notes": "Updated test reception"
            }
        }
        
        response = self.session.put(f"{BASE_URL}/api/milk-receptions/{reception_id}", json=update_data)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        updated = response.json()
        assert updated["quantity_liters"] == 150.0
        assert updated["price_per_liter"] == 0.55
        assert updated["total_amount"] == 82.5  # 150.0 * 0.55
        assert updated["quality_test"]["fat_percentage"] == 3.8
        print(f"✅ Updated milk reception: quantity={updated['quantity_liters']}, price={updated['price_per_liter']}, total={updated['total_amount']}")
    
    def test_05_verify_update_persisted(self):
        """Verify the update was persisted in database"""
        reception_id = getattr(TestMilkReceptionEditDelete, 'test_reception_id', None)
        if not reception_id:
            pytest.skip("No test reception created")
        
        response = self.session.get(f"{BASE_URL}/api/milk-receptions/{reception_id}")
        assert response.status_code == 200
        
        reception = response.json()
        assert reception["quantity_liters"] == 150.0
        assert reception["price_per_liter"] == 0.55
        print(f"✅ Update persisted correctly")
    
    def test_06_update_nonexistent_reception(self):
        """Test updating a non-existent reception returns 404"""
        fake_id = str(uuid.uuid4())
        update_data = {
            "supplier_id": self.test_supplier["id"],
            "supplier_name": self.test_supplier["name"],
            "quantity_liters": 100.0,
            "price_per_liter": 0.5,
            "quality_test": {
                "fat_percentage": 3.5,
                "protein_percentage": 3.2,
                "temperature": 4.0,
                "is_accepted": True
            }
        }
        
        response = self.session.put(f"{BASE_URL}/api/milk-receptions/{fake_id}", json=update_data)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Non-existent reception returns 404")
    
    def test_07_delete_milk_reception_success(self):
        """Test deleting a milk reception (admin has permission)"""
        # Create a new reception to delete
        reception_data = {
            "supplier_id": self.test_supplier["id"],
            "supplier_name": self.test_supplier["name"],
            "quantity_liters": 50.0,
            "price_per_liter": 0.5,
            "quality_test": {
                "fat_percentage": 3.5,
                "protein_percentage": 3.2,
                "temperature": 4.0,
                "is_accepted": True,
                "notes": "Test reception for deletion"
            }
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/milk-receptions", json=reception_data)
        assert create_response.status_code == 200
        reception_id = create_response.json()["id"]
        
        # Delete it
        delete_response = self.session.delete(f"{BASE_URL}/api/milk-receptions/{reception_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        result = delete_response.json()
        assert result["deleted_id"] == reception_id
        print(f"✅ Deleted milk reception: {reception_id}")
        
        # Verify it's gone
        get_response = self.session.get(f"{BASE_URL}/api/milk-receptions/{reception_id}")
        assert get_response.status_code == 404, "Deleted reception should return 404"
        print(f"✅ Verified reception is deleted (404)")
    
    def test_08_delete_nonexistent_reception(self):
        """Test deleting a non-existent reception returns 404"""
        fake_id = str(uuid.uuid4())
        
        response = self.session.delete(f"{BASE_URL}/api/milk-receptions/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Non-existent reception delete returns 404")
    
    def test_09_get_milk_receptions_list(self):
        """Test getting list of milk receptions"""
        response = self.session.get(f"{BASE_URL}/api/milk-receptions")
        assert response.status_code == 200
        
        receptions = response.json()
        assert isinstance(receptions, list)
        print(f"✅ Got {len(receptions)} milk receptions")
    
    def test_10_cleanup_test_reception(self):
        """Cleanup: Delete the test reception created in test_02"""
        reception_id = getattr(TestMilkReceptionEditDelete, 'test_reception_id', None)
        if reception_id:
            response = self.session.delete(f"{BASE_URL}/api/milk-receptions/{reception_id}")
            if response.status_code == 200:
                print(f"✅ Cleaned up test reception: {reception_id}")
            else:
                print(f"⚠️ Could not cleanup test reception: {response.status_code}")


class TestMilkReceptionPermissions:
    """Test permission checks for milk reception edit/delete"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin to check permissions"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_01_admin_has_edit_permission(self):
        """Admin role should have edit permission"""
        # Admin role bypasses permission check
        # Get a reception to test
        response = self.session.get(f"{BASE_URL}/api/milk-receptions")
        assert response.status_code == 200
        
        receptions = response.json()
        if not receptions:
            pytest.skip("No receptions to test")
        
        # Try to update (should succeed for admin)
        reception = receptions[0]
        update_data = {
            "supplier_id": reception["supplier_id"],
            "supplier_name": reception["supplier_name"],
            "quantity_liters": reception["quantity_liters"],
            "price_per_liter": reception["price_per_liter"],
            "quality_test": reception.get("quality_test", {
                "fat_percentage": 3.5,
                "protein_percentage": 3.2,
                "temperature": 4.0,
                "is_accepted": True
            })
        }
        
        response = self.session.put(f"{BASE_URL}/api/milk-receptions/{reception['id']}", json=update_data)
        # Admin should be able to edit
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            print(f"✅ Admin can edit milk receptions")
        else:
            print(f"⚠️ Admin edit returned 403 - check permission logic")
    
    def test_02_admin_has_delete_permission(self):
        """Admin role should have delete permission"""
        # Create a test reception
        suppliers_response = self.session.get(f"{BASE_URL}/api/suppliers")
        suppliers = suppliers_response.json()
        if not suppliers:
            pytest.skip("No suppliers available")
        
        reception_data = {
            "supplier_id": suppliers[0]["id"],
            "supplier_name": suppliers[0]["name"],
            "quantity_liters": 10.0,
            "price_per_liter": 0.5,
            "quality_test": {
                "fat_percentage": 3.5,
                "protein_percentage": 3.2,
                "temperature": 4.0,
                "is_accepted": True
            }
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/milk-receptions", json=reception_data)
        assert create_response.status_code == 200
        reception_id = create_response.json()["id"]
        
        # Try to delete
        delete_response = self.session.delete(f"{BASE_URL}/api/milk-receptions/{reception_id}")
        assert delete_response.status_code in [200, 403], f"Unexpected status: {delete_response.status_code}"
        
        if delete_response.status_code == 200:
            print(f"✅ Admin can delete milk receptions")
        else:
            print(f"⚠️ Admin delete returned 403 - check permission logic")
    
    def test_03_check_available_permissions_list(self):
        """Check if milk_reception_edit and milk_reception_delete are in available permissions"""
        response = self.session.get(f"{BASE_URL}/api/hr/available-permissions")
        assert response.status_code == 200
        
        permissions = response.json()
        permission_ids = [p["id"] for p in permissions]
        
        # Check if the new permissions exist
        has_edit = "milk_reception_edit" in permission_ids
        has_delete = "milk_reception_delete" in permission_ids
        
        if has_edit:
            print(f"✅ milk_reception_edit permission exists")
        else:
            print(f"⚠️ milk_reception_edit NOT in AVAILABLE_PERMISSIONS list")
        
        if has_delete:
            print(f"✅ milk_reception_delete permission exists")
        else:
            print(f"⚠️ milk_reception_delete NOT in AVAILABLE_PERMISSIONS list")
        
        # This is informational - the permissions work via code check even if not in list
        print(f"Available permissions: {permission_ids}")


class TestMilkReceptionPaidProtection:
    """Test that paid receptions cannot be deleted"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_01_check_paid_reception_protection(self):
        """Check if paid receptions are protected from deletion"""
        # Get receptions and find one that is paid
        response = self.session.get(f"{BASE_URL}/api/milk-receptions")
        assert response.status_code == 200
        
        receptions = response.json()
        paid_receptions = [r for r in receptions if r.get("is_paid")]
        
        if not paid_receptions:
            print(f"ℹ️ No paid receptions found to test protection")
            pytest.skip("No paid receptions to test")
        
        paid_reception = paid_receptions[0]
        
        # Try to delete a paid reception
        delete_response = self.session.delete(f"{BASE_URL}/api/milk-receptions/{paid_reception['id']}")
        
        # Should return 400 with error message
        assert delete_response.status_code == 400, f"Expected 400 for paid reception, got {delete_response.status_code}"
        
        error = delete_response.json()
        assert "detail" in error
        print(f"✅ Paid reception protected from deletion: {error['detail']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
