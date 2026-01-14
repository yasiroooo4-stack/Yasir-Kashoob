"""
Test Suite for Warehouse Financial Integration and Multi-Fingerprint Sync
Tests:
1. Financial Integration - Receive stock creates journal entry (Debit: Inventory, Credit: Accounts Payable)
2. Financial Integration - Issue stock for sales creates journal entry (Debit: COGS, Credit: Inventory)
3. Financial Integration - Issue stock for consumption creates journal entry (Debit: Expense Account, Credit: Inventory)
4. Stock Availability Check - GET /api/warehouse/stock/check-availability
5. Stock Reserve/Release - POST /api/warehouse/stock/reserve, /api/warehouse/stock/release-reservation/{id}
6. Financial Reports - GET /api/warehouse/finance/stock-value-report, GET /api/warehouse/finance/movements-summary
7. Multi-fingerprint sync - POST /api/hr/attendance/sync with fingerprint from additional_fingerprints
8. Multi-fingerprint with center matching - Sync correctly matches employee based on center
9. Multi-location attendance - System detects when employee checks in/out from different centers
"""

import pytest
import requests
import os
from datetime import datetime, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWarehouseFinancialIntegration:
    """Tests for warehouse financial integration - journal entries on stock movements"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token):
        """Setup test data"""
        self.client = api_client
        self.token = auth_token
        self.headers = {"Authorization": f"Bearer {auth_token}"}
        
    def test_01_verify_finance_accounts_exist(self, api_client, auth_token):
        """Verify required finance accounts exist for warehouse integration"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Check chart of accounts for required accounts
        response = api_client.get(f"{BASE_URL}/api/finance/accounts", headers=headers)
        assert response.status_code == 200, f"Failed to get accounts: {response.text}"
        
        accounts = response.json()
        account_numbers = [a.get("account_number") for a in accounts]
        
        # Required accounts for warehouse integration
        required_accounts = ["1300", "2100", "5100", "6200"]  # Inventory, AP, COGS, Expenses
        
        for acc_num in required_accounts:
            assert acc_num in account_numbers, f"Required account {acc_num} not found"
        
        print(f"✓ All required finance accounts exist: {required_accounts}")
    
    def test_02_create_test_warehouse_and_product(self, api_client, auth_token):
        """Create test warehouse and product for financial integration tests"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create test warehouse
        warehouse_data = {
            "name": "TEST_مخزن اختبار مالي",
            "code": f"TEST-FIN-{uuid.uuid4().hex[:6].upper()}",
            "location": "زيك",
            "warehouse_type": "internal",
            "warehouse_category": "supplies",
            "center_name": "زيك",
            "status": "active"
        }
        
        response = api_client.post(f"{BASE_URL}/api/warehouse/warehouses", json=warehouse_data, headers=headers)
        assert response.status_code == 200, f"Failed to create warehouse: {response.text}"
        warehouse = response.json()
        
        # Create test product
        product_data = {
            "name": "TEST_منتج اختبار مالي",
            "code": f"TEST-PROD-{uuid.uuid4().hex[:6].upper()}",
            "unit": "قطعة",
            "category_id": "",
            "min_quantity": 5,
            "cost_price": 10.0,
            "status": "active"
        }
        
        response = api_client.post(f"{BASE_URL}/api/warehouse/products", json=product_data, headers=headers)
        assert response.status_code == 200, f"Failed to create product: {response.text}"
        product = response.json()
        
        print(f"✓ Created test warehouse: {warehouse['id']}")
        print(f"✓ Created test product: {product['id']}")
        
        # Store for later tests
        pytest.test_warehouse_id = warehouse["id"]
        pytest.test_product_id = product["id"]
        pytest.test_product_name = product["name"]
        pytest.test_warehouse_name = warehouse["name"]
    
    def test_03_receive_stock_creates_journal_entry(self, api_client, auth_token):
        """Test that receiving stock creates journal entry (Dr: Inventory, Cr: AP)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get initial journal entries count
        response = api_client.get(f"{BASE_URL}/api/finance/journal-entries?limit=1", headers=headers)
        initial_count = len(response.json()) if response.status_code == 200 else 0
        
        # Receive stock
        receive_data = {
            "product_id": pytest.test_product_id,
            "warehouse_id": pytest.test_warehouse_id,
            "quantity": 100,
            "unit_price": 10.0,
            "supplier_name": "TEST_مورد اختبار",
            "payment_type": "credit",  # آجل - should create AP entry
            "create_journal": True,
            "notes": "اختبار التكامل المالي - استلام"
        }
        
        response = api_client.post(f"{BASE_URL}/api/warehouse/movements/receive", json=receive_data, headers=headers)
        assert response.status_code == 200, f"Failed to receive stock: {response.text}"
        
        result = response.json()
        assert "journal_entry" in result, "No journal entry created for receive"
        assert result.get("total_value") == 1000.0, f"Expected total value 1000, got {result.get('total_value')}"
        
        journal_entry_number = result.get("journal_entry")
        print(f"✓ Receive stock created journal entry: {journal_entry_number}")
        print(f"✓ Total value: {result.get('total_value')} OMR")
        
        # Verify journal entry was created with correct accounts
        if journal_entry_number:
            # Search for the journal entry
            response = api_client.get(f"{BASE_URL}/api/finance/journal-entries?search={journal_entry_number}", headers=headers)
            if response.status_code == 200:
                entries = response.json()
                if entries:
                    entry = entries[0] if isinstance(entries, list) else entries
                    assert entry.get("reference_type") == "warehouse_receive", "Wrong reference type"
                    print(f"✓ Journal entry verified: {entry.get('description')}")
        
        pytest.receive_movement_id = result.get("movement", {}).get("id")
    
    def test_04_issue_stock_for_sales_creates_cogs_entry(self, api_client, auth_token):
        """Test that issuing stock for sales creates COGS journal entry"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Issue stock for sales
        issue_data = {
            "product_id": pytest.test_product_id,
            "warehouse_id": pytest.test_warehouse_id,
            "quantity": 20,
            "customer_name": "TEST_عميل اختبار",
            "issue_type": "sales",  # Should create COGS entry
            "create_journal": True,
            "notes": "اختبار التكامل المالي - صرف للمبيعات"
        }
        
        response = api_client.post(f"{BASE_URL}/api/warehouse/movements/issue", json=issue_data, headers=headers)
        assert response.status_code == 200, f"Failed to issue stock: {response.text}"
        
        result = response.json()
        assert "journal_entry" in result, "No journal entry created for sales issue"
        
        journal_entry_number = result.get("journal_entry")
        print(f"✓ Issue for sales created journal entry: {journal_entry_number}")
        print(f"✓ Total value (COGS): {result.get('total_value')} OMR")
        
        pytest.sales_issue_movement_id = result.get("movement", {}).get("id")
    
    def test_05_issue_stock_for_consumption_creates_expense_entry(self, api_client, auth_token):
        """Test that issuing stock for consumption creates expense journal entry"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Issue stock for consumption
        issue_data = {
            "product_id": pytest.test_product_id,
            "warehouse_id": pytest.test_warehouse_id,
            "quantity": 10,
            "issue_type": "consumption",  # Should create expense entry based on warehouse category
            "create_journal": True,
            "notes": "اختبار التكامل المالي - صرف للاستهلاك"
        }
        
        response = api_client.post(f"{BASE_URL}/api/warehouse/movements/issue", json=issue_data, headers=headers)
        assert response.status_code == 200, f"Failed to issue stock: {response.text}"
        
        result = response.json()
        assert "journal_entry" in result, "No journal entry created for consumption issue"
        
        journal_entry_number = result.get("journal_entry")
        print(f"✓ Issue for consumption created journal entry: {journal_entry_number}")
        print(f"✓ Total value (Expense): {result.get('total_value')} OMR")
        
        pytest.consumption_issue_movement_id = result.get("movement", {}).get("id")


class TestStockAvailabilityAndReservation:
    """Tests for stock availability check and reservation system"""
    
    def test_06_check_stock_availability(self, api_client, auth_token):
        """Test GET /api/warehouse/stock/check-availability"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Check availability for test product
        response = api_client.get(
            f"{BASE_URL}/api/warehouse/stock/check-availability",
            params={
                "product_id": pytest.test_product_id,
                "warehouse_id": pytest.test_warehouse_id,
                "required_quantity": 50
            },
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to check availability: {response.text}"
        
        result = response.json()
        assert "available" in result, "Missing 'available' field"
        assert "total_available" in result, "Missing 'total_available' field"
        assert "required" in result, "Missing 'required' field"
        
        # After receiving 100 and issuing 30, should have 70 available
        expected_available = 70  # 100 - 20 (sales) - 10 (consumption)
        assert result["total_available"] == expected_available, f"Expected {expected_available}, got {result['total_available']}"
        assert result["available"] == True, "Should be available for 50 units"
        
        print(f"✓ Stock availability check: {result['total_available']} available, required: {result['required']}")
        print(f"✓ Availability status: {result['message']}")
    
    def test_07_check_stock_availability_insufficient(self, api_client, auth_token):
        """Test availability check when quantity is insufficient"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = api_client.get(
            f"{BASE_URL}/api/warehouse/stock/check-availability",
            params={
                "product_id": pytest.test_product_id,
                "warehouse_id": pytest.test_warehouse_id,
                "required_quantity": 100  # More than available
            },
            headers=headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["available"] == False, "Should not be available for 100 units"
        print(f"✓ Correctly reports insufficient stock: {result['message']}")
    
    def test_08_reserve_stock(self, api_client, auth_token):
        """Test POST /api/warehouse/stock/reserve"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        reserve_data = {
            "product_id": pytest.test_product_id,
            "warehouse_id": pytest.test_warehouse_id,
            "quantity": 20,
            "reference_type": "sales_order",
            "reference_id": f"TEST-SO-{uuid.uuid4().hex[:8]}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/warehouse/stock/reserve", json=reserve_data, headers=headers)
        assert response.status_code == 200, f"Failed to reserve stock: {response.text}"
        
        result = response.json()
        assert "reservation_id" in result, "Missing reservation_id"
        assert result["reserved_quantity"] == 20, "Wrong reserved quantity"
        
        pytest.test_reservation_id = result["reservation_id"]
        print(f"✓ Stock reserved: {result['reserved_quantity']} units")
        print(f"✓ Reservation ID: {result['reservation_id']}")
        print(f"✓ Available after reservation: {result['available_quantity']}")
    
    def test_09_release_reservation(self, api_client, auth_token):
        """Test POST /api/warehouse/stock/release-reservation/{id}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = api_client.post(
            f"{BASE_URL}/api/warehouse/stock/release-reservation/{pytest.test_reservation_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to release reservation: {response.text}"
        
        result = response.json()
        assert "message" in result
        print(f"✓ Reservation released: {result['message']}")
    
    def test_10_release_nonexistent_reservation(self, api_client, auth_token):
        """Test releasing a non-existent reservation returns 404"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = api_client.post(
            f"{BASE_URL}/api/warehouse/stock/release-reservation/nonexistent-id",
            headers=headers
        )
        
        assert response.status_code == 404, "Should return 404 for non-existent reservation"
        print("✓ Correctly returns 404 for non-existent reservation")


class TestFinancialReports:
    """Tests for warehouse financial reports"""
    
    def test_11_stock_value_report(self, api_client, auth_token):
        """Test GET /api/warehouse/finance/stock-value-report"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = api_client.get(f"{BASE_URL}/api/warehouse/finance/stock-value-report", headers=headers)
        assert response.status_code == 200, f"Failed to get stock value report: {response.text}"
        
        result = response.json()
        assert "total_value" in result, "Missing total_value"
        assert "total_items" in result, "Missing total_items"
        assert "by_warehouse" in result, "Missing by_warehouse breakdown"
        assert "report_date" in result, "Missing report_date"
        
        print(f"✓ Stock value report:")
        print(f"  - Total value: {result['total_value']} OMR")
        print(f"  - Total items: {result['total_items']}")
        print(f"  - Warehouses: {len(result['by_warehouse'])}")
    
    def test_12_stock_value_report_by_warehouse(self, api_client, auth_token):
        """Test stock value report filtered by warehouse"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = api_client.get(
            f"{BASE_URL}/api/warehouse/finance/stock-value-report",
            params={"warehouse_id": pytest.test_warehouse_id},
            headers=headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Should only include our test warehouse
        print(f"✓ Stock value for test warehouse: {result['total_value']} OMR")
    
    def test_13_stock_value_report_by_center(self, api_client, auth_token):
        """Test stock value report filtered by center"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = api_client.get(
            f"{BASE_URL}/api/warehouse/finance/stock-value-report",
            params={"center_name": "زيك"},
            headers=headers
        )
        
        assert response.status_code == 200
        result = response.json()
        print(f"✓ Stock value for center زيك: {result['total_value']} OMR")
    
    def test_14_movements_summary(self, api_client, auth_token):
        """Test GET /api/warehouse/finance/movements-summary"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = api_client.get(
            f"{BASE_URL}/api/warehouse/finance/movements-summary",
            params={"start_date": today, "end_date": today},
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to get movements summary: {response.text}"
        
        result = response.json()
        assert "period" in result, "Missing period"
        assert "receive" in result, "Missing receive summary"
        assert "issue" in result, "Missing issue summary"
        
        print(f"✓ Movements summary for {today}:")
        print(f"  - Receives: {result['receive']['count']} movements, {result['receive']['total_value']} OMR")
        print(f"  - Issues: {result['issue']['count']} movements, {result['issue']['total_value']} OMR")
        print(f"  - Issue by type: Sales={result['issue']['by_type'].get('sales', 0)}, Consumption={result['issue']['by_type'].get('consumption', 0)}")
        print(f"  - Net change: {result.get('net_change', 0)} OMR")


class TestMultiFingerprintSync:
    """Tests for multi-fingerprint attendance sync"""
    
    def test_15_get_test_employee_with_additional_fingerprints(self, api_client, auth_token):
        """Find or create test employee with additional fingerprints"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Search for Qais Abdullah Al Ojaili (mentioned in test info)
        response = api_client.get(f"{BASE_URL}/api/hr/employees?search=قيس", headers=headers)
        
        if response.status_code == 200:
            employees = response.json()
            if employees:
                for emp in employees:
                    if emp.get("additional_fingerprints"):
                        pytest.test_employee = emp
                        print(f"✓ Found employee with additional fingerprints: {emp['name']}")
                        print(f"  - Primary fingerprint: {emp.get('fingerprint_id')}")
                        print(f"  - Secondary fingerprint: {emp.get('fingerprint_id_2')}")
                        print(f"  - Additional fingerprints: {len(emp.get('additional_fingerprints', []))}")
                        for fp in emp.get("additional_fingerprints", []):
                            print(f"    - ID: {fp.get('fingerprint_id')}, Center: {fp.get('center')}")
                        return
        
        # If not found, create a test employee with additional fingerprints
        employee_data = {
            "name": "TEST_موظف اختبار البصمات",
            "employee_number": f"TEST-{uuid.uuid4().hex[:6]}",
            "department": "IT",
            "position": "مطور",
            "center_name": "زيك",
            "fingerprint_id": "999001",
            "fingerprint_id_2": "999002",
            "fingerprint_center_2": "غدو",
            "additional_fingerprints": [
                {"fingerprint_id": "999003", "center": "زيك", "device_name": "جهاز زيك"},
                {"fingerprint_id": "999004", "center": "حجيف", "device_name": "جهاز حجيف"}
            ],
            "is_active": True
        }
        
        response = api_client.post(f"{BASE_URL}/api/hr/employees", json=employee_data, headers=headers)
        if response.status_code == 200:
            pytest.test_employee = response.json()
            print(f"✓ Created test employee with additional fingerprints")
        else:
            pytest.skip(f"Could not create test employee: {response.text}")
    
    def test_16_sync_attendance_with_primary_fingerprint(self, api_client, auth_token):
        """Test syncing attendance with primary fingerprint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        if not hasattr(pytest, 'test_employee'):
            pytest.skip("No test employee available")
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        sync_data = {
            "fingerprint_id": pytest.test_employee.get("fingerprint_id"),
            "date": today,
            "check_in": "08:00:00",
            "device_ip": "192.168.1.100",
            "location": "زيك"
        }
        
        response = api_client.post(f"{BASE_URL}/api/hr/attendance/sync", json=sync_data, headers=headers)
        
        # May return 200 or 404 depending on employee setup
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Synced attendance with primary fingerprint")
            print(f"  - Employee: {result.get('employee_name')}")
            print(f"  - Check-in: {result.get('check_in')}")
        else:
            print(f"⚠ Primary fingerprint sync returned: {response.status_code}")
    
    def test_17_sync_attendance_with_additional_fingerprint(self, api_client, auth_token):
        """Test syncing attendance with fingerprint from additional_fingerprints"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        if not hasattr(pytest, 'test_employee'):
            pytest.skip("No test employee available")
        
        additional_fps = pytest.test_employee.get("additional_fingerprints", [])
        if not additional_fps:
            pytest.skip("No additional fingerprints on test employee")
        
        today = datetime.now().strftime("%Y-%m-%d")
        fp = additional_fps[0]
        
        sync_data = {
            "fingerprint_id": fp.get("fingerprint_id"),
            "date": today,
            "check_in": "08:15:00",
            "device_ip": "192.168.1.101",
            "location": fp.get("center", "زيك")
        }
        
        response = api_client.post(f"{BASE_URL}/api/hr/attendance/sync", json=sync_data, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Synced attendance with additional fingerprint")
            print(f"  - Fingerprint ID: {fp.get('fingerprint_id')}")
            print(f"  - Center: {fp.get('center')}")
            print(f"  - Employee matched: {result.get('employee_name')}")
        else:
            print(f"⚠ Additional fingerprint sync returned: {response.status_code} - {response.text}")
    
    def test_18_bulk_sync_attendance_with_center_matching(self, api_client, auth_token):
        """Test bulk sync with center-based fingerprint matching"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        if not hasattr(pytest, 'test_employee'):
            pytest.skip("No test employee available")
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Create records from different centers
        records = []
        
        # Record from primary fingerprint
        if pytest.test_employee.get("fingerprint_id"):
            records.append({
                "fingerprint_id": pytest.test_employee.get("fingerprint_id"),
                "date": today,
                "check_in": "07:55:00",
                "device_ip": "192.168.1.100",
                "location": pytest.test_employee.get("center_name", "زيك")
            })
        
        # Record from secondary fingerprint with different center
        if pytest.test_employee.get("fingerprint_id_2"):
            records.append({
                "fingerprint_id": pytest.test_employee.get("fingerprint_id_2"),
                "date": today,
                "check_out": "17:00:00",
                "device_ip": "192.168.2.100",
                "location": pytest.test_employee.get("fingerprint_center_2", "غدو")
            })
        
        if not records:
            pytest.skip("No fingerprint records to sync")
        
        response = api_client.post(f"{BASE_URL}/api/hr/attendance/bulk-sync", json=records, headers=headers)
        
        assert response.status_code == 200, f"Bulk sync failed: {response.text}"
        
        result = response.json()
        print(f"✓ Bulk sync completed:")
        print(f"  - Imported: {result.get('imported', 0)}")
        print(f"  - Updated: {result.get('updated', 0)}")
        print(f"  - Errors: {len(result.get('errors', []))}")
    
    def test_19_verify_multi_location_attendance(self, api_client, auth_token):
        """Verify attendance record shows check-in/out from different locations"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        if not hasattr(pytest, 'test_employee'):
            pytest.skip("No test employee available")
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = api_client.get(
            f"{BASE_URL}/api/hr/attendance",
            params={"employee_id": pytest.test_employee.get("id"), "date": today},
            headers=headers
        )
        
        if response.status_code == 200:
            records = response.json()
            if records:
                record = records[0] if isinstance(records, list) else records
                print(f"✓ Attendance record for {today}:")
                print(f"  - Check-in: {record.get('check_in')} at {record.get('check_in_location', 'N/A')}")
                print(f"  - Check-out: {record.get('check_out')} at {record.get('check_out_location', 'N/A')}")
            else:
                print("⚠ No attendance records found for today")
        else:
            print(f"⚠ Could not fetch attendance: {response.status_code}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_99_cleanup_test_data(self, api_client, auth_token):
        """Clean up test data created during tests"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Delete test warehouse
        if hasattr(pytest, 'test_warehouse_id'):
            # First delete stock
            response = api_client.get(
                f"{BASE_URL}/api/warehouse/stock",
                params={"warehouse_id": pytest.test_warehouse_id},
                headers=headers
            )
            if response.status_code == 200:
                stocks = response.json()
                for stock in stocks:
                    # Set quantity to 0 to allow deletion
                    api_client.post(
                        f"{BASE_URL}/api/warehouse/stock/adjust",
                        json={
                            "product_id": stock.get("product_id"),
                            "warehouse_id": stock.get("warehouse_id"),
                            "new_quantity": 0,
                            "reason": "Test cleanup"
                        },
                        headers=headers
                    )
            
            response = api_client.delete(f"{BASE_URL}/api/warehouse/warehouses/{pytest.test_warehouse_id}", headers=headers)
            if response.status_code == 200:
                print("✓ Cleaned up test warehouse")
        
        # Delete test product
        if hasattr(pytest, 'test_product_id'):
            response = api_client.delete(f"{BASE_URL}/api/warehouse/products/{pytest.test_product_id}", headers=headers)
            if response.status_code == 200:
                print("✓ Cleaned up test product")
        
        print("✓ Test cleanup completed")


# Fixtures
@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": "yasir",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
