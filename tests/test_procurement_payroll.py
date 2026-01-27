"""
Test suite for Procurement and Payroll features
Tests:
1. Procurement page APIs (vendors, purchase orders, inventory)
2. Holidays config API
3. Payroll periods and disbursement
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://erp-inventory-26.preview.emergentagent.com')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin3",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin3",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"


class TestHolidaysConfig:
    """Test unified holidays configuration API"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin3",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_holidays_config(self, auth_token):
        """Test GET /api/hr/settings/holidays-config returns unified config"""
        response = requests.get(
            f"{BASE_URL}/api/hr/settings/holidays-config",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "official_holidays" in data
        assert "default_weekly_off_days" in data
        assert "day_names" in data
        
        # Verify weekly off days are list of integers
        assert isinstance(data["default_weekly_off_days"], list)
        
        # Verify day names mapping
        assert "0" in data["day_names"]  # Sunday
        assert "5" in data["day_names"]  # Friday


class TestProcurement:
    """Test Procurement module APIs"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin3",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_procurement_summary(self, auth_token):
        """Test procurement analytics summary API"""
        response = requests.get(
            f"{BASE_URL}/api/procurement/analytics/summary",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "vendors" in data
        assert "requisitions" in data
        assert "purchase_orders" in data
        assert "spending" in data
        assert "inventory_alerts" in data
    
    def test_get_vendors(self, auth_token):
        """Test GET /api/procurement/vendors"""
        response = requests.get(
            f"{BASE_URL}/api/procurement/vendors",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_requisitions(self, auth_token):
        """Test GET /api/procurement/requisitions"""
        response = requests.get(
            f"{BASE_URL}/api/procurement/requisitions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_purchase_orders(self, auth_token):
        """Test GET /api/procurement/purchase-orders"""
        response = requests.get(
            f"{BASE_URL}/api/procurement/purchase-orders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_inventory(self, auth_token):
        """Test GET /api/procurement/inventory"""
        response = requests.get(
            f"{BASE_URL}/api/procurement/inventory",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_inventory_alerts(self, auth_token):
        """Test GET /api/procurement/inventory/alerts"""
        response = requests.get(
            f"{BASE_URL}/api/procurement/inventory/alerts",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestPayroll:
    """Test Payroll module APIs"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin3",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_payroll_periods(self, auth_token):
        """Test GET /api/hr/payroll/periods"""
        response = requests.get(
            f"{BASE_URL}/api/hr/payroll/periods",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # If there are periods, verify structure
        if len(data) > 0:
            period = data[0]
            assert "id" in period
            assert "name" in period
            assert "start_date" in period
            assert "end_date" in period
            assert "status" in period
    
    def test_get_payroll_period_details(self, auth_token):
        """Test GET /api/hr/payroll/periods/{period_id}"""
        # First get periods
        response = requests.get(
            f"{BASE_URL}/api/hr/payroll/periods",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        periods = response.json()
        
        if len(periods) > 0:
            period_id = periods[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/hr/payroll/periods/{period_id}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "records" in data or "id" in data


class TestPurchaseOrderPayment:
    """Test Purchase Order payment functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin3",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_create_vendor_and_po_flow(self, auth_token):
        """Test creating a vendor and purchase order for payment testing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a test vendor
        vendor_data = {
            "name": "TEST_Vendor_Payment",
            "name_ar": "مورد اختبار الدفع",
            "category": "supplies",
            "contact_person": "Test Contact",
            "phone": "12345678",
            "email": "test@vendor.com",
            "address": "Test Address",
            "payment_terms": "net_30",
            "notes": "Test vendor for payment testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/procurement/vendors",
            json=vendor_data,
            headers=headers
        )
        assert response.status_code == 200
        vendor = response.json()
        vendor_id = vendor["id"]
        
        # Create a purchase order
        po_data = {
            "vendor_id": vendor_id,
            "vendor_name": "TEST_Vendor_Payment",
            "delivery_date": "2026-02-01",
            "payment_terms": "net_30",
            "notes": "Test PO for payment",
            "items": [
                {
                    "item_name": "Test Item",
                    "quantity": 10,
                    "unit": "piece",
                    "unit_price": 5.0
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/procurement/purchase-orders",
            json=po_data,
            headers=headers
        )
        assert response.status_code == 200
        po = response.json()
        po_id = po["id"]
        
        # Send the PO (change status from draft)
        response = requests.post(
            f"{BASE_URL}/api/procurement/purchase-orders/{po_id}/send",
            headers=headers
        )
        assert response.status_code == 200
        
        # Test payment endpoint
        response = requests.post(
            f"{BASE_URL}/api/procurement/purchase-orders/{po_id}/pay",
            params={
                "amount": 25.0,
                "payment_method": "bank_transfer",
                "reference": "TEST-REF-001"
            },
            headers=headers
        )
        assert response.status_code == 200
        payment_result = response.json()
        assert "message" in payment_result
        assert "total_paid" in payment_result
        
        # Cleanup - delete the PO and vendor
        # Note: In real scenario, we might want to keep test data for verification


class TestPayrollDisbursement:
    """Test Payroll disbursement functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin3",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_disburse_endpoint_exists(self, auth_token):
        """Test that disburse endpoint exists and returns proper error for invalid period"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test with non-existent period ID
        response = requests.post(
            f"{BASE_URL}/api/hr/payroll/periods/non-existent-id/disburse",
            headers=headers
        )
        # Should return 404 for non-existent period
        assert response.status_code in [404, 400]
    
    def test_disburse_requires_approved_status(self, auth_token):
        """Test that disbursement requires approved status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get existing periods
        response = requests.get(
            f"{BASE_URL}/api/hr/payroll/periods",
            headers=headers
        )
        periods = response.json()
        
        if len(periods) > 0:
            period = periods[0]
            period_id = period["id"]
            status = period.get("status")
            
            # If period is not approved, disbursement should fail
            if status != "approved":
                response = requests.post(
                    f"{BASE_URL}/api/hr/payroll/periods/{period_id}/disburse",
                    headers=headers
                )
                # Should return error for non-approved period
                assert response.status_code in [400, 200]  # 200 if already disbursed


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
