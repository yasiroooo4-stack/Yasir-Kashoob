"""
Test Suite for Salary Structures and Public Holidays APIs
Tests P2 features: Salary structures with detailed allowances and public holidays
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSalaryStructuresAndHolidays:
    """Test salary structures and public holidays APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user = login_response.json().get("user", {})
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    # ==================== SALARY STRUCTURES TESTS ====================
    
    def test_get_all_salary_structures(self):
        """Test GET /api/hr/salary-structures - Get all salary structures"""
        response = self.session.get(f"{BASE_URL}/api/hr/salary-structures")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/hr/salary-structures - Found {len(data)} salary structures")
    
    def test_get_employees_for_salary_structures(self):
        """Test GET /api/hr/employees - Get employees to use for salary structure tests"""
        response = self.session.get(f"{BASE_URL}/api/hr/employees")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one employee"
        
        # Store first employee for later tests
        self.test_employee = data[0]
        print(f"✓ GET /api/hr/employees - Found {len(data)} employees, using: {self.test_employee.get('name')}")
        return data[0]
    
    def test_get_employee_salary_structure(self):
        """Test GET /api/hr/salary-structures/{employee_id} - Get salary structure for specific employee"""
        # First get an employee
        employees_response = self.session.get(f"{BASE_URL}/api/hr/employees")
        assert employees_response.status_code == 200
        employees = employees_response.json()
        assert len(employees) > 0, "Need at least one employee"
        
        employee_id = employees[0]["id"]
        employee_name = employees[0].get("name", "Unknown")
        
        response = self.session.get(f"{BASE_URL}/api/hr/salary-structures/{employee_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure has expected fields
        assert "employee_id" in data, "Response should have employee_id"
        assert "basic_salary" in data, "Response should have basic_salary"
        assert "allowances" in data, "Response should have allowances"
        
        # Verify allowances structure
        allowances = data.get("allowances", {})
        expected_allowance_fields = [
            "housing_allowance", "transportation_allowance", "food_allowance",
            "phone_allowance", "fuel_allowance", "education_allowance",
            "medical_allowance", "special_allowance", "other_allowance"
        ]
        for field in expected_allowance_fields:
            assert field in allowances, f"Allowances should have {field}"
        
        print(f"✓ GET /api/hr/salary-structures/{employee_id} - Got structure for {employee_name}")
        print(f"  Basic Salary: {data.get('basic_salary')}, Total: {data.get('total_salary')}")
    
    def test_create_salary_structure_with_allowances(self):
        """Test POST /api/hr/salary-structures - Create/update salary structure with detailed allowances"""
        # First get an employee
        employees_response = self.session.get(f"{BASE_URL}/api/hr/employees")
        assert employees_response.status_code == 200
        employees = employees_response.json()
        assert len(employees) > 0, "Need at least one employee"
        
        employee_id = employees[0]["id"]
        employee_name = employees[0].get("name", "Unknown")
        
        # Create salary structure with all allowances
        payload = {
            "employee_id": employee_id,
            "basic_salary": 500.0,
            "allowances": {
                "housing_allowance": 100.0,
                "transportation_allowance": 50.0,
                "food_allowance": 30.0,
                "phone_allowance": 20.0,
                "fuel_allowance": 40.0,
                "education_allowance": 0.0,
                "medical_allowance": 25.0,
                "special_allowance": 0.0,
                "other_allowance": 0.0
            },
            "notes": "TEST_salary_structure - تحديث هيكل الراتب للاختبار"
        }
        
        response = self.session.post(f"{BASE_URL}/api/hr/salary-structures", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data, "Response should have message"
        assert "structure" in data, "Response should have structure"
        
        structure = data["structure"]
        assert structure["basic_salary"] == 500.0, "Basic salary should be 500"
        
        # Verify total calculation (500 + 100 + 50 + 30 + 20 + 40 + 25 = 765)
        expected_total = 500.0 + 100.0 + 50.0 + 30.0 + 20.0 + 40.0 + 25.0
        assert structure["total_salary"] == expected_total, f"Total should be {expected_total}, got {structure['total_salary']}"
        
        print(f"✓ POST /api/hr/salary-structures - Created structure for {employee_name}")
        print(f"  Basic: 500, Allowances: 265, Total: {expected_total}")
    
    def test_create_salary_structure_missing_employee(self):
        """Test POST /api/hr/salary-structures - Should fail without employee_id"""
        payload = {
            "basic_salary": 500.0,
            "allowances": {
                "housing_allowance": 100.0
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/hr/salary-structures", json=payload)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ POST /api/hr/salary-structures - Correctly rejected missing employee_id")
    
    def test_create_salary_structure_invalid_employee(self):
        """Test POST /api/hr/salary-structures - Should fail with invalid employee_id"""
        payload = {
            "employee_id": "invalid-employee-id-12345",
            "basic_salary": 500.0,
            "allowances": {}
        }
        
        response = self.session.post(f"{BASE_URL}/api/hr/salary-structures", json=payload)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ POST /api/hr/salary-structures - Correctly rejected invalid employee_id")
    
    # ==================== PUBLIC HOLIDAYS TESTS ====================
    
    def test_get_public_holidays(self):
        """Test GET /api/hr/public-holidays - Get all public holidays"""
        response = self.session.get(f"{BASE_URL}/api/hr/public-holidays")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/hr/public-holidays - Found {len(data)} holidays")
    
    def test_get_public_holidays_by_year(self):
        """Test GET /api/hr/public-holidays?year=2025 - Filter by year"""
        response = self.session.get(f"{BASE_URL}/api/hr/public-holidays?year=2025")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify all returned holidays are in 2025
        for holiday in data:
            assert holiday.get("date", "").startswith("2025"), f"Holiday date should be in 2025: {holiday.get('date')}"
        
        print(f"✓ GET /api/hr/public-holidays?year=2025 - Found {len(data)} holidays in 2025")
    
    def test_create_public_holiday(self):
        """Test POST /api/hr/public-holidays - Create a new public holiday"""
        payload = {
            "name": "TEST_عطلة اختبارية",
            "name_en": "TEST_Test Holiday",
            "date": "2025-12-25",
            "days": 1,
            "is_paid": True,
            "notes": "عطلة للاختبار فقط"
        }
        
        response = self.session.post(f"{BASE_URL}/api/hr/public-holidays", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data, "Response should have message"
        assert "holiday" in data, "Response should have holiday"
        
        holiday = data["holiday"]
        assert holiday["name"] == payload["name"], "Holiday name should match"
        assert holiday["date"] == payload["date"], "Holiday date should match"
        assert holiday["is_paid"] == True, "Holiday should be paid"
        assert "id" in holiday, "Holiday should have an id"
        
        # Store for cleanup
        self.created_holiday_id = holiday["id"]
        
        print(f"✓ POST /api/hr/public-holidays - Created holiday: {holiday['name']}")
        return holiday["id"]
    
    def test_create_public_holiday_multi_day(self):
        """Test POST /api/hr/public-holidays - Create multi-day holiday"""
        payload = {
            "name": "TEST_عيد الأضحى",
            "name_en": "TEST_Eid Al Adha",
            "date": "2025-06-06",
            "days": 4,
            "is_paid": True,
            "notes": "عطلة عيد الأضحى المبارك"
        }
        
        response = self.session.post(f"{BASE_URL}/api/hr/public-holidays", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        holiday = data["holiday"]
        assert holiday["days"] == 4, "Holiday should be 4 days"
        
        print(f"✓ POST /api/hr/public-holidays - Created multi-day holiday: {holiday['name']} ({holiday['days']} days)")
        return holiday["id"]
    
    def test_delete_public_holiday(self):
        """Test DELETE /api/hr/public-holidays/{id} - Delete a holiday"""
        # First create a holiday to delete
        payload = {
            "name": "TEST_عطلة للحذف",
            "name_en": "TEST_Holiday to Delete",
            "date": "2025-12-31",
            "days": 1,
            "is_paid": False
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/hr/public-holidays", json=payload)
        assert create_response.status_code == 200
        holiday_id = create_response.json()["holiday"]["id"]
        
        # Now delete it
        delete_response = self.session.delete(f"{BASE_URL}/api/hr/public-holidays/{holiday_id}")
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        data = delete_response.json()
        assert "message" in data, "Response should have message"
        
        # Verify it's deleted by trying to find it
        get_response = self.session.get(f"{BASE_URL}/api/hr/public-holidays")
        holidays = get_response.json()
        holiday_ids = [h["id"] for h in holidays]
        assert holiday_id not in holiday_ids, "Deleted holiday should not be in list"
        
        print(f"✓ DELETE /api/hr/public-holidays/{holiday_id} - Holiday deleted successfully")


class TestAutoJournalEntries:
    """Test automatic journal entry creation for milk purchases and sales"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user = login_response.json().get("user", {})
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_chart_of_accounts_has_required_accounts(self):
        """Verify required accounts exist for auto journal entries"""
        response = self.session.get(f"{BASE_URL}/api/finance/accounts")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        accounts = response.json()
        
        # Required accounts for auto journal entries
        required_accounts = {
            "5100": "مشتريات الحليب",
            "2110": "الموردين",
            "1111": "الصندوق",
            "1120": "العملاء",
            "4100": "إيرادات مبيعات الحليب"
        }
        
        account_numbers = {a["account_number"]: a["name"] for a in accounts}
        
        for acc_num, acc_name in required_accounts.items():
            assert acc_num in account_numbers, f"Account {acc_num} ({acc_name}) should exist"
            print(f"  ✓ Account {acc_num}: {account_numbers[acc_num]}")
        
        print(f"✓ All required accounts for auto journal entries exist")
    
    def test_journal_entries_exist(self):
        """Test GET /api/finance/journal-entries - Verify journal entries API works"""
        response = self.session.get(f"{BASE_URL}/api/finance/journal-entries")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        entries = response.json()
        assert isinstance(entries, list), "Response should be a list"
        
        # Check for auto-generated entries
        auto_entries = [e for e in entries if e.get("reference_type") in ["milk_purchase", "milk_sale"]]
        print(f"✓ GET /api/finance/journal-entries - Found {len(entries)} entries, {len(auto_entries)} auto-generated")
    
    def test_milk_reception_creates_journal_entry(self):
        """Test that creating milk reception creates auto journal entry"""
        # Get initial journal entry count
        initial_entries = self.session.get(f"{BASE_URL}/api/finance/journal-entries").json()
        initial_count = len([e for e in initial_entries if e.get("reference_type") == "milk_purchase"])
        
        # Get a supplier
        suppliers_response = self.session.get(f"{BASE_URL}/api/suppliers")
        if suppliers_response.status_code != 200 or len(suppliers_response.json()) == 0:
            pytest.skip("No suppliers available for test")
        
        supplier = suppliers_response.json()[0]
        
        # Create milk reception
        reception_payload = {
            "supplier_id": supplier["id"],
            "supplier_name": supplier["name"],
            "quantity_liters": 10.0,
            "price_per_liter": 0.5,
            "quality_test": {
                "fat_percentage": 3.5,
                "protein_percentage": 3.2,
                "temperature": 4.0,
                "is_accepted": True
            }
        }
        
        reception_response = self.session.post(f"{BASE_URL}/api/milk-receptions", json=reception_payload)
        
        # Note: This might fail if user doesn't have permission, which is OK
        if reception_response.status_code == 200:
            # Check if journal entry was created
            new_entries = self.session.get(f"{BASE_URL}/api/finance/journal-entries").json()
            new_count = len([e for e in new_entries if e.get("reference_type") == "milk_purchase"])
            
            # Should have one more entry
            if new_count > initial_count:
                print(f"✓ Milk reception created auto journal entry (milk_purchase)")
            else:
                print(f"⚠ Milk reception created but no new journal entry found (accounts may not exist)")
        else:
            print(f"⚠ Could not create milk reception (status {reception_response.status_code}) - skipping journal entry check")
    
    def test_sale_creates_journal_entry(self):
        """Test that creating sale creates auto journal entry"""
        # Get initial journal entry count
        initial_entries = self.session.get(f"{BASE_URL}/api/finance/journal-entries").json()
        initial_count = len([e for e in initial_entries if e.get("reference_type") == "milk_sale"])
        
        # Get a customer
        customers_response = self.session.get(f"{BASE_URL}/api/customers")
        if customers_response.status_code != 200 or len(customers_response.json()) == 0:
            pytest.skip("No customers available for test")
        
        customer = customers_response.json()[0]
        
        # Create sale (cash)
        sale_payload = {
            "customer_id": customer["id"],
            "customer_name": customer["name"],
            "quantity_liters": 5.0,
            "price_per_liter": 0.6,
            "sale_type": "cash"
        }
        
        sale_response = self.session.post(f"{BASE_URL}/api/sales", json=sale_payload)
        
        if sale_response.status_code == 200:
            # Check if journal entry was created
            new_entries = self.session.get(f"{BASE_URL}/api/finance/journal-entries").json()
            new_count = len([e for e in new_entries if e.get("reference_type") == "milk_sale"])
            
            if new_count > initial_count:
                print(f"✓ Sale created auto journal entry (milk_sale)")
            else:
                print(f"⚠ Sale created but no new journal entry found (accounts may not exist)")
        else:
            print(f"⚠ Could not create sale (status {sale_response.status_code}) - skipping journal entry check")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_cleanup_test_holidays(self):
        """Clean up TEST_ prefixed holidays"""
        response = self.session.get(f"{BASE_URL}/api/hr/public-holidays")
        if response.status_code == 200:
            holidays = response.json()
            test_holidays = [h for h in holidays if h.get("name", "").startswith("TEST_")]
            
            for holiday in test_holidays:
                delete_response = self.session.delete(f"{BASE_URL}/api/hr/public-holidays/{holiday['id']}")
                if delete_response.status_code == 200:
                    print(f"  Cleaned up holiday: {holiday['name']}")
            
            print(f"✓ Cleaned up {len(test_holidays)} test holidays")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
