"""
Test Advanced Inventory APIs and Supplier Portal Feed Types
اختبار واجهات برمجة التطبيقات للمخزون المتقدم وبوابة الموردين
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSupplierPortalFeedTypes:
    """Test Supplier Portal Feed Types API - اختبار أنواع الأعلاف في بوابة الموردين"""
    
    def test_get_feed_types_no_auth(self):
        """Feed types endpoint should work without authentication"""
        response = requests.get(f"{BASE_URL}/api/supplier-portal/feed-types")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} feed types")
        
    def test_feed_types_have_required_fields(self):
        """Each feed type should have required fields with pricing"""
        response = requests.get(f"{BASE_URL}/api/supplier-portal/feed-types")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            feed_type = data[0]
            # Check required fields
            assert "id" in feed_type
            assert "name" in feed_type
            assert "price_per_unit" in feed_type
            assert "kg_per_unit" in feed_type
            assert "is_active" in feed_type
            print(f"Feed type: {feed_type['name']}, Price: {feed_type['price_per_unit']}")
        else:
            print("No feed types found in database")


class TestAdvancedInventoryBatches:
    """Test Batch Tracking API - اختبار تتبع الدفعات"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_token):
        self.headers = {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_batches(self, auth_token):
        """GET /api/inventory-advanced/batches should return 200"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/inventory-advanced/batches", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} batches")
    
    def test_get_batches_with_filters(self, auth_token):
        """GET /api/inventory-advanced/batches with filters should work"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/inventory-advanced/batches?status=active",
            headers=headers
        )
        assert response.status_code == 200
        
    def test_get_expiring_batches(self, auth_token):
        """GET /api/inventory-advanced/batches/expiring should return expiring batches"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/inventory-advanced/batches/expiring?days=30",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "expiring_soon" in data
        assert "count" in data
        assert "cutoff_date" in data
        print(f"Expiring batches: {data['count']}")


class TestAdvancedInventoryCycleCounts:
    """Test Cycle Count API - اختبار الجرد الدوري"""
    
    def test_get_cycle_counts(self, auth_token):
        """GET /api/inventory-advanced/cycle-counts should return 200"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/inventory-advanced/cycle-counts", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} cycle counts")
    
    def test_get_cycle_counts_with_status_filter(self, auth_token):
        """GET /api/inventory-advanced/cycle-counts with status filter"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/inventory-advanced/cycle-counts?status=draft",
            headers=headers
        )
        assert response.status_code == 200


class TestAdvancedInventoryReturns:
    """Test Returns Management API - اختبار إدارة المرتجعات"""
    
    def test_get_returns(self, auth_token):
        """GET /api/inventory-advanced/returns should return 200"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/inventory-advanced/returns", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} returns")
    
    def test_get_returns_with_type_filter(self, auth_token):
        """GET /api/inventory-advanced/returns with return_type filter"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/inventory-advanced/returns?return_type=customer",
            headers=headers
        )
        assert response.status_code == 200


class TestAdvancedInventoryValuation:
    """Test Inventory Valuation API - اختبار تقييم المخزون"""
    
    def test_get_valuation(self, auth_token):
        """GET /api/inventory-advanced/valuation should return 200"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/inventory-advanced/valuation", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "method" in data
        assert "total_value" in data
        assert "items_count" in data
        assert "items" in data
        print(f"Valuation method: {data['method']}, Total value: {data['total_value']}")
    
    def test_get_valuation_with_method(self, auth_token):
        """GET /api/inventory-advanced/valuation with specific method"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/inventory-advanced/valuation?method=weighted_average",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["method"] == "weighted_average"
    
    def test_get_turnover(self, auth_token):
        """GET /api/inventory-advanced/turnover should return turnover analysis"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/inventory-advanced/turnover", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "period_months" in data
        assert "turnover_rate" in data
        assert "days_of_inventory" in data
        assert "analysis" in data
        print(f"Turnover rate: {data['turnover_rate']}, Days of inventory: {data['days_of_inventory']}")


class TestCreateBatchAndVerify:
    """Test creating a batch and verifying persistence"""
    
    def test_create_batch_and_get(self, auth_token):
        """Create a batch and verify it's persisted"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Create batch
        batch_data = {
            "product_id": "TEST_PRODUCT_001",
            "product_name": "TEST Product",
            "product_code": "TST001",
            "warehouse_id": "TEST_WAREHOUSE_001",
            "warehouse_name": "Test Warehouse",
            "quantity": 100,
            "unit_cost": 10.5,
            "production_date": "2026-01-01",
            "expiry_date": "2027-01-01"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/inventory-advanced/batches",
            headers=headers,
            json=batch_data
        )
        assert response.status_code == 200
        created_batch = response.json()
        assert "id" in created_batch
        assert "batch_number" in created_batch
        assert created_batch["quantity"] == 100
        print(f"Created batch: {created_batch['batch_number']}")
        
        # Verify by getting batches
        get_response = requests.get(
            f"{BASE_URL}/api/inventory-advanced/batches?product_id=TEST_PRODUCT_001",
            headers=headers
        )
        assert get_response.status_code == 200
        batches = get_response.json()
        assert len(batches) > 0
        print(f"Verified batch exists in database")


@pytest.fixture
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "yasir", "password": "admin1111"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")
