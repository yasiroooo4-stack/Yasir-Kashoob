"""
Test Suite for Warehouse Management and Absence Deduction Factor APIs
Tests: Warehouse CRUD, Stock operations, Absence factor settings, Attendance report
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

# Get API base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USER = "yasir"
ADMIN_PASSWORD = "admin123"


class TestAuth:
    """Authentication helper"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USER,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


class TestWarehouseAPIs(TestAuth):
    """Warehouse Management API Tests"""
    
    def test_get_warehouses(self, auth_headers):
        """Test GET /api/warehouse/warehouses - List all warehouses"""
        response = requests.get(f"{BASE_URL}/api/warehouse/warehouses", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get warehouses: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/warehouse/warehouses - Found {len(data)} warehouses")
    
    def test_get_products(self, auth_headers):
        """Test GET /api/warehouse/products - List all products"""
        response = requests.get(f"{BASE_URL}/api/warehouse/products", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get products: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/warehouse/products - Found {len(data)} products")
    
    def test_get_stock(self, auth_headers):
        """Test GET /api/warehouse/stock - List all stock"""
        response = requests.get(f"{BASE_URL}/api/warehouse/stock", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get stock: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/warehouse/stock - Found {len(data)} stock records")
    
    def test_get_stock_summary(self, auth_headers):
        """Test GET /api/warehouse/stock/summary - Get stock summary"""
        response = requests.get(f"{BASE_URL}/api/warehouse/stock/summary", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get stock summary: {response.text}"
        data = response.json()
        
        # Verify summary structure
        assert "total_products" in data, "Summary should have total_products"
        assert "total_warehouses" in data, "Summary should have total_warehouses"
        assert "low_stock_count" in data, "Summary should have low_stock_count"
        assert "total_value" in data, "Summary should have total_value"
        
        print(f"✓ GET /api/warehouse/stock/summary - Products: {data['total_products']}, Warehouses: {data['total_warehouses']}, Value: {data['total_value']}")
    
    def test_create_warehouse(self, auth_headers):
        """Test POST /api/warehouse/warehouses - Create a new warehouse"""
        unique_code = f"TEST-WH-{uuid.uuid4().hex[:6].upper()}"
        warehouse_data = {
            "code": unique_code,
            "name": f"مخزن اختبار {unique_code}",
            "warehouse_type": "main",
            "location": "موقع اختبار",
            "status": "active",
            "description": "مخزن للاختبار"
        }
        
        response = requests.post(f"{BASE_URL}/api/warehouse/warehouses", json=warehouse_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create warehouse: {response.text}"
        
        data = response.json()
        assert data.get("code") == unique_code, "Warehouse code should match"
        assert data.get("name") == warehouse_data["name"], "Warehouse name should match"
        assert "id" in data, "Response should have id"
        
        print(f"✓ POST /api/warehouse/warehouses - Created warehouse: {data['name']} (ID: {data['id']})")
        
        # Store for cleanup
        return data["id"]
    
    def test_create_warehouse_duplicate_code(self, auth_headers):
        """Test POST /api/warehouse/warehouses - Duplicate code should fail"""
        # First create a warehouse
        unique_code = f"TEST-DUP-{uuid.uuid4().hex[:6].upper()}"
        warehouse_data = {
            "code": unique_code,
            "name": f"مخزن اختبار {unique_code}",
            "warehouse_type": "main",
            "location": "موقع اختبار",
            "status": "active"
        }
        
        response1 = requests.post(f"{BASE_URL}/api/warehouse/warehouses", json=warehouse_data, headers=auth_headers)
        assert response1.status_code == 200, f"First create should succeed: {response1.text}"
        
        # Try to create with same code
        response2 = requests.post(f"{BASE_URL}/api/warehouse/warehouses", json=warehouse_data, headers=auth_headers)
        assert response2.status_code == 400, "Duplicate code should return 400"
        
        print(f"✓ POST /api/warehouse/warehouses - Duplicate code correctly rejected")
    
    def test_get_categories(self, auth_headers):
        """Test GET /api/warehouse/categories - List product categories"""
        response = requests.get(f"{BASE_URL}/api/warehouse/categories", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get categories: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/warehouse/categories - Found {len(data)} categories")
    
    def test_get_movements(self, auth_headers):
        """Test GET /api/warehouse/movements - List stock movements"""
        response = requests.get(f"{BASE_URL}/api/warehouse/movements", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get movements: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/warehouse/movements - Found {len(data)} movements")
    
    def test_get_solutions(self, auth_headers):
        """Test GET /api/warehouse/solutions - List lab solutions"""
        response = requests.get(f"{BASE_URL}/api/warehouse/solutions", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get solutions: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/warehouse/solutions - Found {len(data)} solutions")


class TestWarehouseStockOperations(TestAuth):
    """Warehouse Stock Operations Tests"""
    
    @pytest.fixture(scope="class")
    def test_warehouse(self, auth_headers):
        """Create a test warehouse for stock operations"""
        unique_code = f"TEST-STOCK-{uuid.uuid4().hex[:6].upper()}"
        warehouse_data = {
            "code": unique_code,
            "name": f"مخزن عمليات المخزون {unique_code}",
            "warehouse_type": "main",
            "status": "active"
        }
        response = requests.post(f"{BASE_URL}/api/warehouse/warehouses", json=warehouse_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create test warehouse: {response.text}"
        return response.json()
    
    @pytest.fixture(scope="class")
    def test_product(self, auth_headers):
        """Create a test product for stock operations"""
        unique_code = f"TEST-PROD-{uuid.uuid4().hex[:6].upper()}"
        product_data = {
            "code": unique_code,
            "name": f"منتج اختبار {unique_code}",
            "unit": "قطعة",
            "category_id": None,
            "min_quantity": 10,
            "cost_price": 5.0,
            "sell_price": 10.0,
            "status": "active"
        }
        response = requests.post(f"{BASE_URL}/api/warehouse/products", json=product_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create test product: {response.text}"
        return response.json()
    
    def test_receive_stock(self, auth_headers, test_warehouse, test_product):
        """Test POST /api/warehouse/movements/receive - Receive stock"""
        receive_data = {
            "product_id": test_product["id"],
            "warehouse_id": test_warehouse["id"],
            "quantity": 100,
            "unit_price": 5.0,
            "supplier_name": "مورد اختبار",
            "reference_number": f"RCV-TEST-{uuid.uuid4().hex[:6]}",
            "notes": "استلام اختبار"
        }
        
        response = requests.post(f"{BASE_URL}/api/warehouse/movements/receive", json=receive_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to receive stock: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "movement" in data, "Response should have movement"
        assert data["movement"]["quantity"] == 100, "Quantity should match"
        
        print(f"✓ POST /api/warehouse/movements/receive - Received 100 units of {test_product['name']}")
        
        # Verify stock was updated
        stock_response = requests.get(
            f"{BASE_URL}/api/warehouse/stock?product_id={test_product['id']}&warehouse_id={test_warehouse['id']}", 
            headers=auth_headers
        )
        assert stock_response.status_code == 200
        stock_data = stock_response.json()
        
        # Find the stock record
        stock_record = next((s for s in stock_data if s["product_id"] == test_product["id"] and s["warehouse_id"] == test_warehouse["id"]), None)
        assert stock_record is not None, "Stock record should exist after receive"
        assert stock_record["quantity"] >= 100, "Stock quantity should be at least 100"
        
        print(f"✓ Stock verified: {stock_record['quantity']} units in warehouse")


class TestAbsenceDeductionFactor(TestAuth):
    """Absence Deduction Factor API Tests"""
    
    def test_get_absence_deduction_factor(self, auth_headers):
        """Test GET /api/hr/settings/absence-deduction-factor - Get current factor"""
        response = requests.get(f"{BASE_URL}/api/hr/settings/absence-deduction-factor", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get absence factor: {response.text}"
        
        data = response.json()
        assert "absence_deduction_factor" in data, "Response should have absence_deduction_factor"
        assert isinstance(data["absence_deduction_factor"], (int, float)), "Factor should be a number"
        assert 0 <= data["absence_deduction_factor"] <= 2, "Factor should be between 0 and 2"
        
        print(f"✓ GET /api/hr/settings/absence-deduction-factor - Current factor: {data['absence_deduction_factor']}")
        return data["absence_deduction_factor"]
    
    def test_update_absence_deduction_factor(self, auth_headers):
        """Test PUT /api/hr/settings/absence-deduction-factor - Update factor"""
        # Get current value first
        get_response = requests.get(f"{BASE_URL}/api/hr/settings/absence-deduction-factor", headers=auth_headers)
        original_factor = get_response.json().get("absence_deduction_factor", 1.0)
        
        # Update to 0.5
        update_data = {"factor": 0.5, "description": "معامل خصم نصف يوم للاختبار"}
        response = requests.put(
            f"{BASE_URL}/api/hr/settings/absence-deduction-factor", 
            json=update_data, 
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to update absence factor: {response.text}"
        
        data = response.json()
        assert data.get("absence_deduction_factor") == 0.5, "Factor should be updated to 0.5"
        assert "message" in data, "Response should have success message"
        
        print(f"✓ PUT /api/hr/settings/absence-deduction-factor - Updated to 0.5")
        
        # Verify the update
        verify_response = requests.get(f"{BASE_URL}/api/hr/settings/absence-deduction-factor", headers=auth_headers)
        verify_data = verify_response.json()
        assert verify_data["absence_deduction_factor"] == 0.5, "Factor should persist as 0.5"
        
        print(f"✓ Verified factor is now 0.5")
        
        # Restore original value
        restore_data = {"factor": original_factor}
        requests.put(f"{BASE_URL}/api/hr/settings/absence-deduction-factor", json=restore_data, headers=auth_headers)
        print(f"✓ Restored factor to {original_factor}")
    
    def test_update_absence_factor_invalid_value(self, auth_headers):
        """Test PUT /api/hr/settings/absence-deduction-factor - Invalid value should fail"""
        # Test value > 2
        update_data = {"factor": 3.0}
        response = requests.put(
            f"{BASE_URL}/api/hr/settings/absence-deduction-factor", 
            json=update_data, 
            headers=auth_headers
        )
        assert response.status_code == 400, "Factor > 2 should return 400"
        
        # Test negative value
        update_data = {"factor": -1.0}
        response = requests.put(
            f"{BASE_URL}/api/hr/settings/absence-deduction-factor", 
            json=update_data, 
            headers=auth_headers
        )
        assert response.status_code == 400, "Negative factor should return 400"
        
        print(f"✓ PUT /api/hr/settings/absence-deduction-factor - Invalid values correctly rejected")
    
    def test_update_absence_factor_all_valid_values(self, auth_headers):
        """Test PUT /api/hr/settings/absence-deduction-factor - All valid values"""
        valid_values = [0, 0.5, 1.0, 1.5, 2.0]
        
        for value in valid_values:
            update_data = {"factor": value}
            response = requests.put(
                f"{BASE_URL}/api/hr/settings/absence-deduction-factor", 
                json=update_data, 
                headers=auth_headers
            )
            assert response.status_code == 200, f"Factor {value} should be accepted: {response.text}"
            
            # Verify
            verify_response = requests.get(f"{BASE_URL}/api/hr/settings/absence-deduction-factor", headers=auth_headers)
            assert verify_response.json()["absence_deduction_factor"] == value, f"Factor should be {value}"
        
        print(f"✓ All valid factor values (0, 0.5, 1.0, 1.5, 2.0) accepted and persisted")
        
        # Restore to default
        requests.put(f"{BASE_URL}/api/hr/settings/absence-deduction-factor", json={"factor": 1.0}, headers=auth_headers)


class TestAttendanceReport(TestAuth):
    """Attendance Report API Tests"""
    
    def test_get_attendance_report(self, auth_headers):
        """Test GET /api/hr/attendance/report - Get attendance report"""
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/report?year={current_year}&month={current_month}", 
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get attendance report: {response.text}"
        
        data = response.json()
        assert isinstance(data, (list, dict)), "Response should be list or dict"
        
        print(f"✓ GET /api/hr/attendance/report - Report for {current_year}/{current_month}")
    
    def test_get_attendance_records(self, auth_headers):
        """Test GET /api/hr/attendance - Get attendance records"""
        response = requests.get(f"{BASE_URL}/api/hr/attendance", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get attendance: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ GET /api/hr/attendance - Found {len(data)} attendance records")
    
    def test_get_attendance_with_date_filter(self, auth_headers):
        """Test GET /api/hr/attendance with date filters"""
        start_date = "2026-01-01"
        end_date = "2026-01-31"
        
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance?start_date={start_date}&end_date={end_date}", 
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get filtered attendance: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ GET /api/hr/attendance with date filter - Found {len(data)} records")


class TestPayrollCalculation(TestAuth):
    """Payroll Calculation with Absence Factor Tests"""
    
    def test_get_payroll_periods(self, auth_headers):
        """Test GET /api/hr/payroll/periods - List payroll periods"""
        response = requests.get(f"{BASE_URL}/api/hr/payroll/periods", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get payroll periods: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ GET /api/hr/payroll/periods - Found {len(data)} periods")
        return data
    
    def test_payroll_period_details(self, auth_headers):
        """Test GET /api/hr/payroll/periods/{id} - Get period details"""
        # First get periods
        periods_response = requests.get(f"{BASE_URL}/api/hr/payroll/periods", headers=auth_headers)
        periods = periods_response.json()
        
        if len(periods) > 0:
            period_id = periods[0]["id"]
            response = requests.get(f"{BASE_URL}/api/hr/payroll/periods/{period_id}", headers=auth_headers)
            assert response.status_code == 200, f"Failed to get period details: {response.text}"
            
            data = response.json()
            assert "records" in data or "id" in data, "Response should have records or id"
            
            print(f"✓ GET /api/hr/payroll/periods/{period_id} - Period details retrieved")
        else:
            print("⚠ No payroll periods found to test details")


class TestWarehouseReports(TestAuth):
    """Warehouse Reports API Tests"""
    
    def test_get_stock_value_report(self, auth_headers):
        """Test GET /api/warehouse/reports/stock-value - Stock value report"""
        response = requests.get(f"{BASE_URL}/api/warehouse/reports/stock-value", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get stock value report: {response.text}"
        
        data = response.json()
        assert "report" in data, "Response should have report"
        assert "total_value" in data, "Response should have total_value"
        
        print(f"✓ GET /api/warehouse/reports/stock-value - Total value: {data['total_value']}")
    
    def test_get_movements_summary(self, auth_headers):
        """Test GET /api/warehouse/reports/movements-summary - Movements summary"""
        response = requests.get(f"{BASE_URL}/api/warehouse/reports/movements-summary", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get movements summary: {response.text}"
        
        data = response.json()
        assert "summary" in data, "Response should have summary"
        assert "total_movements" in data, "Response should have total_movements"
        
        print(f"✓ GET /api/warehouse/reports/movements-summary - Total movements: {data['total_movements']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
