"""
Test Warehouse Storage Locations and Fixed Assets APIs
Tests for hierarchical warehouse structure and fixed assets tracking
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER = {"username": "yasir", "password": "admin1111"}


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestWarehousesByCenter:
    """Test GET /api/warehouse/warehouses/by-center API"""
    
    def test_get_warehouses_by_center_returns_200(self, headers):
        """Test that API returns 200 status"""
        response = requests.get(f"{BASE_URL}/api/warehouse/warehouses/by-center", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_get_warehouses_by_center_structure(self, headers):
        """Test that response has correct structure with centers"""
        response = requests.get(f"{BASE_URL}/api/warehouse/warehouses/by-center", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        # Should have centers as keys
        expected_centers = ["زيك", "حجيف", "غدو", "طاقة", "ثمريت", "مرباط"]
        
        for center in expected_centers:
            assert center in data, f"Center '{center}' not found in response"
            assert "internal" in data[center], f"'internal' key missing for center {center}"
            assert "external" in data[center], f"'external' key missing for center {center}"
    
    def test_warehouses_have_required_fields(self, headers):
        """Test that warehouses have required fields"""
        response = requests.get(f"{BASE_URL}/api/warehouse/warehouses/by-center", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        # Check first center with warehouses
        for center_name, center_data in data.items():
            all_warehouses = center_data.get("internal", []) + center_data.get("external", [])
            if all_warehouses:
                warehouse = all_warehouses[0]
                assert "id" in warehouse, "Warehouse missing 'id'"
                assert "name" in warehouse, "Warehouse missing 'name'"
                assert "code" in warehouse, "Warehouse missing 'code'"
                assert "warehouse_type" in warehouse, "Warehouse missing 'warehouse_type'"
                break


class TestCreateWarehouse:
    """Test POST /api/warehouse/warehouses API"""
    
    def test_create_warehouse_success(self, headers):
        """Test creating a new warehouse"""
        unique_code = f"TEST-WH-{uuid.uuid4().hex[:6].upper()}"
        warehouse_data = {
            "name": f"مخزن اختبار {unique_code}",
            "code": unique_code,
            "location": "زيك",
            "warehouse_type": "internal",
            "warehouse_category": "lab",
            "center_name": "زيك",
            "capacity": "100",
            "temperature_controlled": False
        }
        
        response = requests.post(f"{BASE_URL}/api/warehouse/warehouses", json=warehouse_data, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == warehouse_data["name"]
        assert data["code"] == warehouse_data["code"]
        assert data["warehouse_type"] == "internal"
        assert "id" in data
    
    def test_create_warehouse_with_parent(self, headers):
        """Test creating a warehouse with parent warehouse"""
        # First get existing warehouses to find a parent
        response = requests.get(f"{BASE_URL}/api/warehouse/warehouses", headers=headers)
        assert response.status_code == 200
        
        warehouses = response.json()
        if not warehouses:
            pytest.skip("No warehouses available to use as parent")
        
        parent_warehouse = warehouses[0]
        unique_code = f"TEST-SUB-{uuid.uuid4().hex[:6].upper()}"
        
        warehouse_data = {
            "name": f"مخزن فرعي اختبار {unique_code}",
            "code": unique_code,
            "location": parent_warehouse.get("location", "زيك"),
            "warehouse_type": "internal",
            "warehouse_category": "supplies",
            "center_name": parent_warehouse.get("center_name", "زيك"),
            "parent_warehouse_id": parent_warehouse["id"]
        }
        
        response = requests.post(f"{BASE_URL}/api/warehouse/warehouses", json=warehouse_data, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["parent_warehouse_id"] == parent_warehouse["id"]
    
    def test_create_warehouse_duplicate_code_fails(self, headers):
        """Test that duplicate warehouse code fails"""
        # Get existing warehouse
        response = requests.get(f"{BASE_URL}/api/warehouse/warehouses", headers=headers)
        assert response.status_code == 200
        
        warehouses = response.json()
        if not warehouses:
            pytest.skip("No warehouses available")
        
        existing_code = warehouses[0]["code"]
        
        warehouse_data = {
            "name": "مخزن مكرر",
            "code": existing_code,  # Duplicate code
            "location": "زيك",
            "warehouse_type": "internal",
            "center_name": "زيك"
        }
        
        response = requests.post(f"{BASE_URL}/api/warehouse/warehouses", json=warehouse_data, headers=headers)
        assert response.status_code == 400, f"Expected 400 for duplicate code, got {response.status_code}"


class TestFixedAssetsAPI:
    """Test Fixed Assets APIs"""
    
    def test_get_fixed_assets_returns_200(self, headers):
        """Test GET /api/warehouse/fixed-assets returns 200"""
        response = requests.get(f"{BASE_URL}/api/warehouse/fixed-assets", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_get_fixed_assets_stats_returns_200(self, headers):
        """Test GET /api/warehouse/fixed-assets/stats returns 200"""
        response = requests.get(f"{BASE_URL}/api/warehouse/fixed-assets/stats", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total" in data, "Stats should have 'total'"
        assert "active" in data, "Stats should have 'active'"
        assert "in_maintenance" in data, "Stats should have 'in_maintenance'"
        assert "disposed" in data, "Stats should have 'disposed'"
        assert "total_value" in data, "Stats should have 'total_value'"
        assert "by_type" in data, "Stats should have 'by_type'"
        assert "by_category" in data, "Stats should have 'by_category'"
    
    def test_create_fixed_asset_success(self, headers):
        """Test POST /api/warehouse/fixed-assets creates asset"""
        # Get a warehouse for the asset
        response = requests.get(f"{BASE_URL}/api/warehouse/warehouses", headers=headers)
        warehouses = response.json()
        warehouse = warehouses[0] if warehouses else None
        
        asset_data = {
            "name": f"TEST_جهاز اختبار {uuid.uuid4().hex[:6]}",
            "asset_type": "equipment",
            "category": "fixed_assets",
            "brand": "Test Brand",
            "model": "Test Model",
            "serial_number": f"SN-{uuid.uuid4().hex[:8].upper()}",
            "purchase_date": "2024-01-15",
            "purchase_price": 5000,
            "current_value": 4500,
            "condition": "good",
            "notes": "Test asset for automated testing"
        }
        
        if warehouse:
            asset_data["warehouse_id"] = warehouse["id"]
            asset_data["warehouse_name"] = warehouse["name"]
            asset_data["center_id"] = warehouse.get("center_id")
            asset_data["center_name"] = warehouse.get("center_name")
        
        response = requests.post(f"{BASE_URL}/api/warehouse/fixed-assets", json=asset_data, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == asset_data["name"]
        assert data["asset_type"] == "equipment"
        assert data["category"] == "fixed_assets"
        assert "id" in data
        assert "asset_code" in data, "Asset should have auto-generated asset_code"
        
        # Store asset ID for cleanup
        return data["id"]
    
    def test_get_fixed_asset_by_id(self, headers):
        """Test GET /api/warehouse/fixed-assets/{id} returns asset details"""
        # First create an asset
        asset_data = {
            "name": f"TEST_أصل للاختبار {uuid.uuid4().hex[:6]}",
            "asset_type": "electronics",
            "category": "fixed_assets",
            "purchase_price": 1000,
            "current_value": 900,
            "condition": "excellent"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/warehouse/fixed-assets", json=asset_data, headers=headers)
        assert create_response.status_code == 200
        
        asset_id = create_response.json()["id"]
        
        # Get the asset by ID
        response = requests.get(f"{BASE_URL}/api/warehouse/fixed-assets/{asset_id}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == asset_id
        assert data["name"] == asset_data["name"]
        assert "movements" in data, "Asset details should include movements history"
    
    def test_filter_fixed_assets_by_category(self, headers):
        """Test filtering fixed assets by category"""
        response = requests.get(f"{BASE_URL}/api/warehouse/fixed-assets?category=fixed_assets", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        for asset in data:
            assert asset["category"] == "fixed_assets", f"Asset category should be 'fixed_assets', got {asset['category']}"
    
    def test_filter_fixed_assets_by_status(self, headers):
        """Test filtering fixed assets by status"""
        response = requests.get(f"{BASE_URL}/api/warehouse/fixed-assets?status=active", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        for asset in data:
            assert asset["status"] == "active", f"Asset status should be 'active', got {asset['status']}"


class TestFixedAssetTransfer:
    """Test Fixed Asset Transfer API"""
    
    def test_transfer_fixed_asset(self, headers):
        """Test POST /api/warehouse/fixed-assets/{id}/transfer"""
        # Create an asset first
        asset_data = {
            "name": f"TEST_أصل للتحويل {uuid.uuid4().hex[:6]}",
            "asset_type": "furniture",
            "category": "fixed_assets",
            "purchase_price": 2000,
            "current_value": 1800,
            "condition": "good"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/warehouse/fixed-assets", json=asset_data, headers=headers)
        assert create_response.status_code == 200
        
        asset_id = create_response.json()["id"]
        
        # Get a warehouse to transfer to
        wh_response = requests.get(f"{BASE_URL}/api/warehouse/warehouses", headers=headers)
        warehouses = wh_response.json()
        
        if not warehouses:
            pytest.skip("No warehouses available for transfer test")
        
        target_warehouse = warehouses[0]
        
        transfer_data = {
            "to_warehouse_id": target_warehouse["id"],
            "to_location": "الطابق الأول - غرفة 101",
            "reason": "نقل للاختبار"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/warehouse/fixed-assets/{asset_id}/transfer",
            json=transfer_data,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "movement" in data
        assert data["movement"]["movement_type"] == "transfer"


class TestInitializeWarehouses:
    """Test Initialize Warehouses API"""
    
    def test_initialize_warehouses_returns_200(self, headers):
        """Test POST /api/warehouse/warehouses/initialize-all"""
        response = requests.post(f"{BASE_URL}/api/warehouse/warehouses/initialize-all", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "created" in data, "Response should have 'created' count"
        assert "skipped" in data, "Response should have 'skipped' count"
        assert "centers" in data, "Response should have 'centers' list"
        
        # Verify centers list
        expected_centers = ["زيك", "حجيف", "غدو", "طاقة", "ثمريت", "مرباط"]
        for center in expected_centers:
            assert center in data["centers"], f"Center '{center}' should be in response"


class TestWarehouseCenters:
    """Test Warehouse Centers API"""
    
    def test_get_centers_returns_200(self, headers):
        """Test GET /api/warehouse/centers returns 200"""
        response = requests.get(f"{BASE_URL}/api/warehouse/centers", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
