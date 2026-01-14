"""
Test Warehouse Centers and Alerts APIs
Tests for:
- GET /api/warehouse/centers - قائمة المراكز الستة
- POST /api/warehouse/warehouses/initialize-all - إنشاء مخازن جميع المراكز تلقائياً
- GET /api/warehouse/warehouses - قائمة المخازن مع فلترة حسب المركز
- GET /api/warehouse/warehouses/by-center - المخازن مجمعة حسب المركز
- GET /api/warehouse/warehouse-categories - تصنيفات المخازن
- GET /api/warehouse/alerts - قائمة التنبيهات
- GET /api/warehouse/alerts/summary - ملخص التنبيهات
- POST /api/warehouse/alerts/{id}/resolve - حل تنبيه
- PUT /api/warehouse/warehouses/{id}/alert-recipients - تحديث مستلمي التنبيهات
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://farmwise-erp-1.preview.emergentagent.com')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "yasir",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")

@pytest.fixture(scope="module")
def api_client(auth_token):
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestWarehouseCenters:
    """Tests for warehouse centers APIs"""
    
    def test_get_centers_returns_six_centers(self, api_client):
        """GET /api/warehouse/centers - should return 6 centers"""
        response = api_client.get(f"{BASE_URL}/api/warehouse/centers")
        assert response.status_code == 200
        
        centers = response.json()
        assert isinstance(centers, list)
        assert len(centers) == 6
        
        # Verify all expected centers are present
        expected_centers = ["زيك", "حجيف", "غدو", "طاقة", "ثمريت", "مرباط"]
        for center in expected_centers:
            assert center in centers, f"Center {center} not found"
    
    def test_get_warehouse_categories(self, api_client):
        """GET /api/warehouse/warehouse-categories - should return internal and external categories"""
        response = api_client.get(f"{BASE_URL}/api/warehouse/warehouse-categories")
        assert response.status_code == 200
        
        categories = response.json()
        assert "internal" in categories
        assert "external" in categories
        
        # Verify internal sub-warehouses
        internal = categories["internal"]
        assert internal["name_ar"] == "مخزن داخلي"
        assert len(internal["sub_warehouses"]) == 4
        internal_categories = [sw["category"] for sw in internal["sub_warehouses"]]
        assert "lab" in internal_categories
        assert "maintenance" in internal_categories
        assert "cleaning" in internal_categories
        assert "ppe" in internal_categories
        
        # Verify external sub-warehouses
        external = categories["external"]
        assert external["name_ar"] == "مخزن خارجي"
        assert len(external["sub_warehouses"]) == 3
        external_categories = [sw["category"] for sw in external["sub_warehouses"]]
        assert "feed" in external_categories
        assert "equipment" in external_categories
        assert "supplies" in external_categories


class TestWarehouseInitialization:
    """Tests for warehouse initialization"""
    
    def test_initialize_all_warehouses(self, api_client):
        """POST /api/warehouse/warehouses/initialize-all - should create or skip warehouses"""
        response = api_client.post(f"{BASE_URL}/api/warehouse/warehouses/initialize-all")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "created" in data
        assert "skipped" in data
        assert "centers" in data
        
        # Total should be 54 (6 centers * 9 warehouses each: 2 main + 4 internal + 3 external)
        total = data["created"] + data["skipped"]
        assert total == 54, f"Expected 54 total warehouses, got {total}"
        
        # Verify centers list
        assert len(data["centers"]) == 6


class TestWarehousesByCenter:
    """Tests for warehouses grouped by center"""
    
    def test_get_warehouses_by_center(self, api_client):
        """GET /api/warehouse/warehouses/by-center - should return warehouses grouped by center"""
        response = api_client.get(f"{BASE_URL}/api/warehouse/warehouses/by-center")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify all 6 centers are present
        expected_centers = ["زيك", "حجيف", "غدو", "طاقة", "ثمريت", "مرباط"]
        for center in expected_centers:
            assert center in data, f"Center {center} not found in response"
            assert "internal" in data[center]
            assert "external" in data[center]
    
    def test_get_warehouses_filtered_by_center(self, api_client):
        """GET /api/warehouse/warehouses?center_name=زيك - should filter by center"""
        response = api_client.get(f"{BASE_URL}/api/warehouse/warehouses", params={"center_name": "زيك"})
        assert response.status_code == 200
        
        warehouses = response.json()
        assert isinstance(warehouses, list)
        
        # All returned warehouses should be from زيك center
        for wh in warehouses:
            assert wh.get("center_name") == "زيك", f"Warehouse {wh.get('name')} is not from زيك"
    
    def test_get_all_warehouses(self, api_client):
        """GET /api/warehouse/warehouses - should return all warehouses"""
        response = api_client.get(f"{BASE_URL}/api/warehouse/warehouses")
        assert response.status_code == 200
        
        warehouses = response.json()
        assert isinstance(warehouses, list)
        # Should have at least 54 warehouses (from initialization)
        assert len(warehouses) >= 54, f"Expected at least 54 warehouses, got {len(warehouses)}"


class TestWarehouseAlerts:
    """Tests for warehouse alerts APIs"""
    
    def test_get_alerts(self, api_client):
        """GET /api/warehouse/alerts - should return alerts list"""
        response = api_client.get(f"{BASE_URL}/api/warehouse/alerts")
        assert response.status_code == 200
        
        alerts = response.json()
        assert isinstance(alerts, list)
    
    def test_get_alerts_summary(self, api_client):
        """GET /api/warehouse/alerts/summary - should return alerts summary"""
        response = api_client.get(f"{BASE_URL}/api/warehouse/alerts/summary")
        assert response.status_code == 200
        
        summary = response.json()
        assert "total_unresolved" in summary
        assert "by_type" in summary
        assert "by_priority" in summary
        
        # Verify priority structure
        assert "critical" in summary["by_priority"]
        assert "high" in summary["by_priority"]
        assert "medium" in summary["by_priority"]
        assert "low" in summary["by_priority"]
    
    def test_get_alerts_filtered_by_resolved(self, api_client):
        """GET /api/warehouse/alerts?is_resolved=false - should filter unresolved alerts"""
        response = api_client.get(f"{BASE_URL}/api/warehouse/alerts", params={"is_resolved": False})
        assert response.status_code == 200
        
        alerts = response.json()
        assert isinstance(alerts, list)
        # All returned alerts should be unresolved
        for alert in alerts:
            assert alert.get("is_resolved") == False
    
    def test_trigger_stock_check(self, api_client):
        """POST /api/warehouse/alerts/check - should trigger stock check"""
        response = api_client.post(f"{BASE_URL}/api/warehouse/alerts/check")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data


class TestAlertRecipients:
    """Tests for alert recipients update"""
    
    def test_update_alert_recipients(self, api_client):
        """PUT /api/warehouse/warehouses/{id}/alert-recipients - should update recipients"""
        # First get a warehouse ID
        warehouses_response = api_client.get(f"{BASE_URL}/api/warehouse/warehouses")
        assert warehouses_response.status_code == 200
        warehouses = warehouses_response.json()
        assert len(warehouses) > 0
        
        warehouse_id = warehouses[0]["id"]
        
        # Update alert recipients
        update_data = {
            "supervisor_email": "test.supervisor@example.com",
            "supervisor_phone": "12345678",
            "warehouse_manager_email": "test.manager@example.com",
            "warehouse_manager_phone": "87654321"
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/warehouse/warehouses/{warehouse_id}/alert-recipients",
            json=update_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        
        # Verify the update by fetching the warehouse
        verify_response = api_client.get(f"{BASE_URL}/api/warehouse/warehouses")
        assert verify_response.status_code == 200
        
        updated_warehouse = next((w for w in verify_response.json() if w["id"] == warehouse_id), None)
        assert updated_warehouse is not None
        assert updated_warehouse.get("supervisor_email") == "test.supervisor@example.com"
        assert updated_warehouse.get("supervisor_phone") == "12345678"


class TestAlertResolve:
    """Tests for resolving alerts"""
    
    def test_resolve_nonexistent_alert(self, api_client):
        """POST /api/warehouse/alerts/{id}/resolve - should handle nonexistent alert"""
        response = api_client.post(f"{BASE_URL}/api/warehouse/alerts/nonexistent-id/resolve")
        # Should return 404 for nonexistent alert
        assert response.status_code == 404


class TestWarehouseStructure:
    """Tests for warehouse structure validation"""
    
    def test_warehouse_has_center_fields(self, api_client):
        """Verify warehouses have center-related fields"""
        response = api_client.get(f"{BASE_URL}/api/warehouse/warehouses")
        assert response.status_code == 200
        
        warehouses = response.json()
        assert len(warehouses) > 0
        
        # Check first warehouse has required fields
        wh = warehouses[0]
        assert "center_name" in wh
        assert "warehouse_type" in wh
        assert "warehouse_category" in wh
        assert "alert_on_low_stock" in wh
        assert "alert_on_expiry" in wh
        assert "expiry_alert_days" in wh
    
    def test_warehouse_parent_child_relationship(self, api_client):
        """Verify parent-child warehouse relationships"""
        response = api_client.get(f"{BASE_URL}/api/warehouse/warehouses/by-center")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check زيك center structure
        zik_internal = data.get("زيك", {}).get("internal", [])
        
        # Find main internal warehouse and sub-warehouses
        main_warehouse = next((w for w in zik_internal if w.get("warehouse_category") is None), None)
        sub_warehouses = [w for w in zik_internal if w.get("warehouse_category") is not None]
        
        if main_warehouse and sub_warehouses:
            # Verify sub-warehouses reference the main warehouse as parent
            for sub in sub_warehouses:
                assert sub.get("parent_warehouse_id") == main_warehouse.get("id"), \
                    f"Sub-warehouse {sub.get('name')} should have parent_warehouse_id = {main_warehouse.get('id')}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
