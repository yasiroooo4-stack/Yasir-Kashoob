"""
Finance System API Tests - النظام المالي
Tests for:
- Chart of Accounts (شجرة الحسابات)
- Journal Entries (القيود اليومية)
- Fixed Assets (الأصول الثابتة)
- Budgets (الميزانيات)
- Financial Reports (التقارير المالية)
- Finance Dashboard (لوحة التحكم المالية)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "yasir"
TEST_PASSWORD = "admin123"


class TestFinanceSystemAuth:
    """Authentication tests for Finance System"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["username"] == TEST_USERNAME


class TestChartOfAccounts:
    """Chart of Accounts API Tests - شجرة الحسابات"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_initialize_chart_of_accounts(self, auth_headers):
        """Test POST /api/finance/accounts/initialize - تهيئة شجرة الحسابات"""
        response = requests.post(
            f"{BASE_URL}/api/finance/accounts/initialize",
            headers=auth_headers
        )
        # Should return 200 whether accounts exist or not
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Either "تم إنشاء شجرة الحسابات بنجاح" or "شجرة الحسابات موجودة مسبقاً"
        assert "count" in data or "شجرة الحسابات" in data["message"]
        print(f"Initialize accounts response: {data}")
    
    def test_get_all_accounts(self, auth_headers):
        """Test GET /api/finance/accounts - جلب شجرة الحسابات"""
        response = requests.get(
            f"{BASE_URL}/api/finance/accounts",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total accounts: {len(data)}")
        
        # Verify account structure if accounts exist
        if len(data) > 0:
            account = data[0]
            assert "id" in account
            assert "account_number" in account
            assert "name" in account
            assert "account_type" in account
    
    def test_get_accounts_by_type(self, auth_headers):
        """Test GET /api/finance/accounts?account_type=asset - جلب حسابات حسب النوع"""
        response = requests.get(
            f"{BASE_URL}/api/finance/accounts?account_type=asset",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned accounts should be assets
        for account in data:
            assert account["account_type"] == "asset"
        print(f"Asset accounts: {len(data)}")
    
    def test_create_account(self, auth_headers):
        """Test POST /api/finance/accounts - إنشاء حساب جديد"""
        unique_number = f"9{uuid.uuid4().hex[:3].upper()}"
        account_data = {
            "account_number": unique_number,
            "name": f"TEST_حساب اختبار {unique_number}",
            "account_type": "expense",
            "description": "حساب تجريبي للاختبار"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/finance/accounts",
            headers=auth_headers,
            json=account_data
        )
        
        # Should succeed or fail if account number exists
        assert response.status_code in [200, 400]
        data = response.json()
        
        if response.status_code == 200:
            assert "message" in data
            print(f"Created account: {unique_number}")
        else:
            print(f"Account creation response: {data}")


class TestJournalEntries:
    """Journal Entries API Tests - القيود اليومية"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def accounts(self, auth_headers):
        """Get available accounts for journal entries"""
        response = requests.get(
            f"{BASE_URL}/api/finance/accounts",
            headers=auth_headers
        )
        return response.json()
    
    def test_get_journal_entries(self, auth_headers):
        """Test GET /api/finance/journal-entries - جلب القيود اليومية"""
        response = requests.get(
            f"{BASE_URL}/api/finance/journal-entries",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total journal entries: {len(data)}")
        
        # Verify entry structure if entries exist
        if len(data) > 0:
            entry = data[0]
            assert "id" in entry
            assert "entry_number" in entry
            assert "entry_date" in entry
            assert "description" in entry
            assert "total_debit" in entry
            assert "total_credit" in entry
            assert "status" in entry
    
    def test_create_journal_entry(self, auth_headers, accounts):
        """Test POST /api/finance/journal-entries - إنشاء قيد يومية"""
        if len(accounts) < 2:
            pytest.skip("Not enough accounts to create journal entry")
        
        # Find cash and expense accounts
        cash_account = next((a for a in accounts if "صندوق" in a.get("name", "") or "1111" in a.get("account_number", "")), None)
        expense_account = next((a for a in accounts if a.get("account_type") == "expense"), None)
        
        if not cash_account or not expense_account:
            # Use first two accounts
            cash_account = accounts[0]
            expense_account = accounts[1] if len(accounts) > 1 else accounts[0]
        
        entry_data = {
            "description": "TEST_قيد اختبار - مصروفات تشغيلية",
            "entry_date": datetime.now().strftime("%Y-%m-%d"),
            "lines": [
                {
                    "account_id": expense_account["id"],
                    "account_number": expense_account["account_number"],
                    "account_name": expense_account["name"],
                    "debit": 100.0,
                    "credit": 0
                },
                {
                    "account_id": cash_account["id"],
                    "account_number": cash_account["account_number"],
                    "account_name": cash_account["name"],
                    "debit": 0,
                    "credit": 100.0
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/finance/journal-entries",
            headers=auth_headers,
            json=entry_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "entry_number" in data
        assert "id" in data
        print(f"Created journal entry: {data['entry_number']}")
        
        return data["id"]
    
    def test_create_unbalanced_entry_fails(self, auth_headers, accounts):
        """Test that unbalanced journal entry fails"""
        if len(accounts) < 1:
            pytest.skip("No accounts available")
        
        entry_data = {
            "description": "TEST_قيد غير متوازن",
            "entry_date": datetime.now().strftime("%Y-%m-%d"),
            "lines": [
                {
                    "account_id": accounts[0]["id"],
                    "account_number": accounts[0]["account_number"],
                    "account_name": accounts[0]["name"],
                    "debit": 100.0,
                    "credit": 0
                },
                {
                    "account_id": accounts[0]["id"],
                    "account_number": accounts[0]["account_number"],
                    "account_name": accounts[0]["name"],
                    "debit": 0,
                    "credit": 50.0  # Unbalanced - should fail
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/finance/journal-entries",
            headers=auth_headers,
            json=entry_data
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"Unbalanced entry correctly rejected: {data['detail']}")


class TestFixedAssets:
    """Fixed Assets API Tests - الأصول الثابتة"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_get_fixed_assets(self, auth_headers):
        """Test GET /api/finance/fixed-assets - جلب الأصول الثابتة"""
        response = requests.get(
            f"{BASE_URL}/api/finance/fixed-assets",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total fixed assets: {len(data)}")
        
        # Verify asset structure if assets exist
        if len(data) > 0:
            asset = data[0]
            assert "id" in asset
            assert "asset_number" in asset
            assert "name" in asset
            assert "category" in asset
            assert "purchase_cost" in asset
    
    def test_create_fixed_asset(self, auth_headers):
        """Test POST /api/finance/fixed-assets - إضافة أصل ثابت"""
        asset_data = {
            "name": f"TEST_شاحنة نقل {uuid.uuid4().hex[:4]}",
            "category": "vehicles",
            "purchase_date": datetime.now().strftime("%Y-%m-%d"),
            "purchase_cost": 25000.0,
            "useful_life_years": 10,
            "salvage_value": 2500.0,
            "location": "مركز حجيف",
            "notes": "أصل تجريبي للاختبار"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/finance/fixed-assets",
            headers=auth_headers,
            json=asset_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "asset_number" in data
        print(f"Created fixed asset: {data['asset_number']}")
    
    def test_get_fixed_assets_by_category(self, auth_headers):
        """Test GET /api/finance/fixed-assets?category=vehicles"""
        response = requests.get(
            f"{BASE_URL}/api/finance/fixed-assets?category=vehicles",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned assets should be vehicles
        for asset in data:
            assert asset["category"] == "vehicles"
        print(f"Vehicle assets: {len(data)}")


class TestBudgets:
    """Budgets API Tests - الميزانيات"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_get_budgets(self, auth_headers):
        """Test GET /api/finance/budgets - جلب الميزانيات"""
        response = requests.get(
            f"{BASE_URL}/api/finance/budgets",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total budgets: {len(data)}")


class TestFinancialReports:
    """Financial Reports API Tests - التقارير المالية"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_get_trial_balance(self, auth_headers):
        """Test GET /api/finance/reports/trial-balance - ميزان المراجعة"""
        response = requests.get(
            f"{BASE_URL}/api/finance/reports/trial-balance",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "accounts" in data
        assert "total_debit" in data
        assert "total_credit" in data
        assert "is_balanced" in data
        
        print(f"Trial Balance - Debit: {data['total_debit']}, Credit: {data['total_credit']}, Balanced: {data['is_balanced']}")
    
    def test_get_income_statement(self, auth_headers):
        """Test GET /api/finance/reports/income-statement - قائمة الدخل"""
        response = requests.get(
            f"{BASE_URL}/api/finance/reports/income-statement",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "revenue" in data
        assert "total_revenue" in data
        assert "expenses" in data
        assert "total_expenses" in data
        assert "net_income" in data
        
        print(f"Income Statement - Revenue: {data['total_revenue']}, Expenses: {data['total_expenses']}, Net: {data['net_income']}")
    
    def test_get_balance_sheet(self, auth_headers):
        """Test GET /api/finance/reports/balance-sheet - الميزانية العمومية"""
        response = requests.get(
            f"{BASE_URL}/api/finance/reports/balance-sheet",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "assets" in data
        assert "total_assets" in data
        assert "liabilities" in data
        assert "total_liabilities" in data
        assert "equity" in data
        assert "total_equity" in data
        assert "is_balanced" in data
        assert "as_of_date" in data
        
        print(f"Balance Sheet - Assets: {data['total_assets']}, Liabilities: {data['total_liabilities']}, Equity: {data['total_equity']}")


class TestFinanceDashboard:
    """Finance Dashboard API Tests - لوحة التحكم المالية"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_get_finance_dashboard(self, auth_headers):
        """Test GET /api/finance/dashboard - لوحة التحكم المالية"""
        response = requests.get(
            f"{BASE_URL}/api/finance/dashboard",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        summary = data["summary"]
        
        # Verify all summary fields exist
        assert "total_assets" in summary
        assert "total_liabilities" in summary
        assert "total_revenue" in summary
        assert "total_expenses" in summary
        assert "accounts_payable" in summary
        assert "accounts_receivable" in summary
        assert "fixed_assets_value" in summary
        assert "fixed_assets_count" in summary
        
        assert "recent_entries" in data
        
        print(f"Dashboard Summary:")
        print(f"  - Total Assets: {summary['total_assets']}")
        print(f"  - Total Liabilities: {summary['total_liabilities']}")
        print(f"  - Total Revenue: {summary['total_revenue']}")
        print(f"  - Total Expenses: {summary['total_expenses']}")
        print(f"  - Accounts Payable: {summary['accounts_payable']}")
        print(f"  - Accounts Receivable: {summary['accounts_receivable']}")
        print(f"  - Fixed Assets Value: {summary['fixed_assets_value']}")
        print(f"  - Fixed Assets Count: {summary['fixed_assets_count']}")


class TestAccountsPayableReceivable:
    """Accounts Payable/Receivable API Tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_get_accounts_payable(self, auth_headers):
        """Test GET /api/finance/accounts-payable - الحسابات الدائنة"""
        response = requests.get(
            f"{BASE_URL}/api/finance/accounts-payable",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Accounts Payable records: {len(data)}")
    
    def test_get_accounts_payable_summary(self, auth_headers):
        """Test GET /api/finance/accounts-payable/summary"""
        response = requests.get(
            f"{BASE_URL}/api/finance/accounts-payable/summary",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "total_payable" in data
        assert "total_records" in data
        print(f"AP Summary - Total: {data['total_payable']}, Records: {data['total_records']}")
    
    def test_get_accounts_receivable(self, auth_headers):
        """Test GET /api/finance/accounts-receivable - الحسابات المدينة"""
        response = requests.get(
            f"{BASE_URL}/api/finance/accounts-receivable",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Accounts Receivable records: {len(data)}")
    
    def test_get_accounts_receivable_summary(self, auth_headers):
        """Test GET /api/finance/accounts-receivable/summary"""
        response = requests.get(
            f"{BASE_URL}/api/finance/accounts-receivable/summary",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "total_receivable" in data
        assert "total_records" in data
        print(f"AR Summary - Total: {data['total_receivable']}, Records: {data['total_records']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
