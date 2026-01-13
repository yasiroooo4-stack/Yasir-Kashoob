"""
Test Refactored APIs - اختبار APIs بعد إعادة الهيكلة
Tests to verify all APIs still work after extracting models to separate file
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://leave-balance.preview.emergentagent.com').rstrip('/')

class TestAPIRoot:
    """Test API root endpoint"""
    
    def test_api_root(self):
        """Test /api/ returns correct response"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert data["message"] == "Milk Collection Center ERP API"
        print(f"✓ API root working: {data}")


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_login_admin(self):
        """Test admin login with yasir/admin123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["username"] == "yasir"
        print(f"✓ Admin login successful: {data['user']['full_name']}")
        return data["access_token"]
    
    def test_login_hr(self):
        """Test HR login with hassan/Hassan@123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "hassan",
            "password": "Hassan@123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ HR login successful: {data['user']['full_name']}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "invalid",
            "password": "invalid"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")


class TestHREmployees:
    """Test HR employees endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_employees(self, auth_token):
        """Test /api/hr/employees returns employee list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/employees", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ HR employees endpoint working: {len(data)} employees found")
        if len(data) > 0:
            # Verify employee structure
            emp = data[0]
            assert "id" in emp
            assert "name" in emp
            print(f"  First employee: {emp.get('name')}")


class TestSuppliers:
    """Test suppliers endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_suppliers(self, auth_token):
        """Test /api/suppliers returns supplier list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/suppliers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Suppliers endpoint working: {len(data)} suppliers found")
        if len(data) > 0:
            # Verify supplier structure
            sup = data[0]
            assert "id" in sup
            assert "name" in sup
            print(f"  First supplier: {sup.get('name')}")


class TestFinanceAccounts:
    """Test finance accounts endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_accounts(self, auth_token):
        """Test /api/finance/accounts returns account list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/accounts", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Finance accounts endpoint working: {len(data)} accounts found")
        if len(data) > 0:
            # Verify account structure
            acc = data[0]
            assert "id" in acc
            assert "name" in acc
            assert "account_number" in acc
            print(f"  First account: {acc.get('account_number')} - {acc.get('name')}")


class TestSMSSettings:
    """Test SMS settings endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_sms_settings(self, auth_token):
        """Test /api/sms/settings returns SMS configuration"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/sms/settings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "is_configured" in data
        print(f"✓ SMS settings endpoint working: configured={data.get('is_configured')}")


class TestDashboardStats:
    """Test dashboard stats endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_dashboard_stats(self, auth_token):
        """Test /api/dashboard/stats returns dashboard statistics"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Verify dashboard stats structure
        assert "suppliers_count" in data
        assert "customers_count" in data
        assert "today_milk_quantity" in data
        print(f"✓ Dashboard stats endpoint working")
        print(f"  Suppliers: {data.get('suppliers_count')}, Stock: {data.get('current_stock')}")


class TestAdditionalEndpoints:
    """Test additional critical endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_centers(self, auth_token):
        """Test /api/centers returns collection centers"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/centers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Centers endpoint working: {len(data)} centers found")
    
    def test_get_customers(self, auth_token):
        """Test /api/customers returns customer list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Customers endpoint working: {len(data)} customers found")
    
    def test_get_inventory(self, auth_token):
        """Test /api/inventory returns inventory list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/inventory", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Inventory endpoint working: {len(data)} items found")
    
    def test_get_milk_receptions(self, auth_token):
        """Test /api/milk-receptions returns milk reception list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/milk-receptions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Milk receptions endpoint working: {len(data)} receptions found")
    
    def test_get_sales(self, auth_token):
        """Test /api/sales returns sales list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/sales", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Sales endpoint working: {len(data)} sales found")
    
    def test_get_payments(self, auth_token):
        """Test /api/payments returns payments list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/payments", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Payments endpoint working: {len(data)} payments found")
    
    def test_get_leave_requests(self, auth_token):
        """Test /api/hr/leave-requests returns leave requests"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/leave-requests", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Leave requests endpoint working: {len(data)} requests found")
    
    def test_get_attendance(self, auth_token):
        """Test /api/hr/attendance returns attendance records"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/attendance", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Attendance endpoint working: {len(data)} records found")
    
    def test_get_loans(self, auth_token):
        """Test /api/hr/loans returns loans list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/loans", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Loans endpoint working: {len(data)} loans found")
    
    def test_get_overtime(self, auth_token):
        """Test /api/hr/overtime returns overtime records"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/overtime", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Overtime endpoint working: {len(data)} records found")


class TestFinanceEndpoints:
    """Test finance module endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_journal_entries(self, auth_token):
        """Test /api/finance/journal-entries returns journal entries"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/journal-entries", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Journal entries endpoint working: {len(data)} entries found")
    
    def test_get_accounts_payable(self, auth_token):
        """Test /api/finance/accounts-payable returns payables"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/accounts-payable", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Accounts payable endpoint working: {len(data)} records found")
    
    def test_get_accounts_receivable(self, auth_token):
        """Test /api/finance/accounts-receivable returns receivables"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/accounts-receivable", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Accounts receivable endpoint working: {len(data)} records found")
    
    def test_get_fixed_assets(self, auth_token):
        """Test /api/finance/fixed-assets returns fixed assets"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/fixed-assets", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fixed assets endpoint working: {len(data)} assets found")
    
    def test_get_budgets(self, auth_token):
        """Test /api/finance/budgets returns budgets"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/budgets", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Budgets endpoint working: {len(data)} budgets found")


class TestReportsEndpoints:
    """Test reports module endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_report_schedules(self, auth_token):
        """Test /api/reports/schedules returns report schedules"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/reports/schedules", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Report schedules endpoint working: {len(data)} schedules found")
    
    def test_get_inventory_alerts(self, auth_token):
        """Test /api/reports/inventory/alerts returns inventory alerts"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/reports/inventory/alerts", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "alerts" in data
        print(f"✓ Inventory alerts endpoint working: {len(data.get('alerts', []))} alerts found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
