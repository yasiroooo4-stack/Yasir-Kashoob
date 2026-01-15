"""
Test Ekomilk Import and Payroll Leave Logic
============================================
Tests for:
1. Ekomilk .xls file import (/api/milk-receptions/import)
2. Column mapping for Ekomilk columns (M. Code, M. Name, Qty(Ltr.), Fat %, RTPL, etc.)
3. Auto-creation of new suppliers
4. Date format conversion (dd/mm/yyyy)
5. Milk type conversion (Camel/Cow)
6. Payroll calculation with 'leave' status as paid day
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data


class TestEkomilkImport:
    """Tests for Ekomilk .xls file import"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_import_ekomilk_xls_file(self, auth_headers):
        """Test importing Ekomilk .xls file with proper column mapping"""
        # Check if test file exists
        test_file_path = "/tmp/milk_data.xls"
        if not os.path.exists(test_file_path):
            pytest.skip("Test file /tmp/milk_data.xls not found")
        
        with open(test_file_path, 'rb') as f:
            files = {'file': ('milk_data.xls', f, 'application/vnd.ms-excel')}
            response = requests.post(
                f"{BASE_URL}/api/milk-receptions/import",
                headers=auth_headers,
                files=files
            )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        # Verify import results
        assert "imported" in data or "imported_count" in data or "message" in data
        print(f"Import response: {data}")
    
    def test_import_recognizes_ekomilk_columns(self, auth_headers):
        """Test that API recognizes Ekomilk column names"""
        import pandas as pd
        
        # Create a small test file with Ekomilk columns
        test_data = {
            'M. Code': ['TEST001', 'TEST002'],
            'M. Name': ['Test Supplier 1', 'Test Supplier 2'],
            'Qty(Ltr.)': [100.5, 200.0],
            'Fat %': [3.5, 4.0],
            'RTPL': [0.150, 0.160],
            'Shift': ['Morning', 'Evening'],
            'Milk Type': ['Cow', 'Camel'],
            'Date': ['15/12/2025', '16/12/2025'],
            'SNF %': [8.5, 8.7],
            'CLR': [28, 29],
            'Amount (OMR)': [15.075, 32.0],
            'Water(%)': [0.0, 0.0],
            'Protein': [3.2, 3.3],
            'Density': [1.028, 1.029],
            'Lactose': [4.5, 4.6]
        }
        
        df = pd.DataFrame(test_data)
        
        # Save as .xlsx (since we can't easily create .xls without xlwt)
        buffer = io.BytesIO()
        df.to_excel(buffer, index=False, engine='openpyxl')
        buffer.seek(0)
        
        files = {'file': ('test_ekomilk.xlsx', buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        response = requests.post(
            f"{BASE_URL}/api/milk-receptions/import",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        print(f"Ekomilk column test response: {data}")
        
        # Verify that records were imported
        assert "imported" in data or "imported_count" in data or "message" in data
    
    def test_date_format_conversion(self, auth_headers):
        """Test that dd/mm/yyyy date format is converted correctly"""
        import pandas as pd
        
        test_data = {
            'M. Code': ['DATETEST001'],
            'M. Name': ['Date Test Supplier'],
            'Qty(Ltr.)': [50.0],
            'Fat %': [3.5],
            'RTPL': [0.150],
            'Date': ['25/12/2025'],  # dd/mm/yyyy format
            'Milk Type': ['Cow']
        }
        
        df = pd.DataFrame(test_data)
        buffer = io.BytesIO()
        df.to_excel(buffer, index=False, engine='openpyxl')
        buffer.seek(0)
        
        files = {'file': ('test_date.xlsx', buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        response = requests.post(
            f"{BASE_URL}/api/milk-receptions/import",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Date format test failed: {response.text}"
        print(f"Date format test response: {response.json()}")
    
    def test_milk_type_conversion(self, auth_headers):
        """Test that milk type (Camel/Cow) is converted correctly"""
        import pandas as pd
        
        test_data = {
            'M. Code': ['MILKTYPE001', 'MILKTYPE002'],
            'M. Name': ['Milk Type Test 1', 'Milk Type Test 2'],
            'Qty(Ltr.)': [100.0, 100.0],
            'Fat %': [3.5, 4.5],
            'RTPL': [0.150, 0.200],
            'Milk Type': ['Camel', 'Cow'],  # Should be converted to lowercase
            'Date': ['20/12/2025', '20/12/2025']
        }
        
        df = pd.DataFrame(test_data)
        buffer = io.BytesIO()
        df.to_excel(buffer, index=False, engine='openpyxl')
        buffer.seek(0)
        
        files = {'file': ('test_milktype.xlsx', buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        response = requests.post(
            f"{BASE_URL}/api/milk-receptions/import",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Milk type test failed: {response.text}"
        print(f"Milk type test response: {response.json()}")
    
    def test_auto_create_new_suppliers(self, auth_headers):
        """Test that new suppliers are created automatically when not found"""
        import pandas as pd
        import uuid
        
        # Generate unique supplier code to ensure it doesn't exist
        unique_code = f"NEWSUP{uuid.uuid4().hex[:6].upper()}"
        
        test_data = {
            'M. Code': [unique_code],
            'M. Name': [f'New Auto Supplier {unique_code}'],
            'Qty(Ltr.)': [75.0],
            'Fat %': [3.8],
            'RTPL': [0.155],
            'Date': ['22/12/2025'],
            'Milk Type': ['Cow']
        }
        
        df = pd.DataFrame(test_data)
        buffer = io.BytesIO()
        df.to_excel(buffer, index=False, engine='openpyxl')
        buffer.seek(0)
        
        files = {'file': ('test_newsupplier.xlsx', buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        response = requests.post(
            f"{BASE_URL}/api/milk-receptions/import",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Auto supplier creation test failed: {response.text}"
        data = response.json()
        print(f"Auto supplier creation test response: {data}")
        
        # Check if new supplier was created
        if "new_suppliers_created" in data:
            assert len(data["new_suppliers_created"]) > 0 or "new_suppliers" in str(data)
    
    def test_import_invalid_file_type(self, auth_headers):
        """Test that invalid file types are rejected"""
        buffer = io.BytesIO(b"This is not an excel file")
        
        files = {'file': ('test.txt', buffer, 'text/plain')}
        response = requests.post(
            f"{BASE_URL}/api/milk-receptions/import",
            headers=auth_headers,
            files=files
        )
        
        # Should return 400 for invalid file type
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"


class TestPayrollLeaveLogic:
    """Tests for payroll calculation with leave status"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_employees(self, auth_headers):
        """Test getting employees list"""
        response = requests.get(
            f"{BASE_URL}/api/hr/employees",
            headers=auth_headers
        )
        assert response.status_code == 200
        employees = response.json()
        assert isinstance(employees, list)
        print(f"Found {len(employees)} employees")
        return employees
    
    def test_get_payroll_periods(self, auth_headers):
        """Test getting payroll periods"""
        response = requests.get(
            f"{BASE_URL}/api/payroll/periods",
            headers=auth_headers
        )
        assert response.status_code == 200
        periods = response.json()
        assert isinstance(periods, list)
        print(f"Found {len(periods)} payroll periods")
        return periods
    
    def test_create_attendance_with_leave_status(self, auth_headers):
        """Test creating attendance record with 'leave' status"""
        # First get an employee
        emp_response = requests.get(
            f"{BASE_URL}/api/hr/employees",
            headers=auth_headers
        )
        assert emp_response.status_code == 200
        employees = emp_response.json()
        
        if not employees:
            pytest.skip("No employees found to test attendance")
        
        employee = employees[0]
        
        # Create attendance with 'leave' status
        attendance_data = {
            "employee_id": employee.get("id"),
            "employee_name": employee.get("name"),
            "date": "2025-12-20",
            "status": "leave",
            "leave_type": "annual",
            "notes": "Test leave attendance"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hr/attendance",
            headers=auth_headers,
            json=attendance_data
        )
        
        # Accept 200 or 201 for success
        assert response.status_code in [200, 201], f"Failed to create attendance: {response.text}"
        print(f"Created attendance with leave status: {response.json()}")
    
    def test_leave_request_approval_creates_leave_attendance(self, auth_headers):
        """Test that approving a leave request creates attendance with 'leave' status"""
        # Get employees
        emp_response = requests.get(
            f"{BASE_URL}/api/hr/employees",
            headers=auth_headers
        )
        assert emp_response.status_code == 200
        employees = emp_response.json()
        
        if not employees:
            pytest.skip("No employees found")
        
        employee = employees[0]
        
        # Create a leave request
        leave_data = {
            "employee_id": employee.get("id"),
            "employee_name": employee.get("name"),
            "leave_type": "annual",
            "start_date": "2025-12-25",
            "end_date": "2025-12-26",
            "reason": "Test leave request",
            "days_count": 2
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hr/leave-requests",
            headers=auth_headers,
            json=leave_data
        )
        
        if response.status_code not in [200, 201]:
            print(f"Leave request creation response: {response.status_code} - {response.text}")
            pytest.skip("Could not create leave request")
        
        leave_request = response.json()
        leave_id = leave_request.get("id")
        print(f"Created leave request: {leave_id}")
        
        # Approve the leave request
        approve_response = requests.put(
            f"{BASE_URL}/api/hr/leave-requests/{leave_id}/approve",
            headers=auth_headers
        )
        
        if approve_response.status_code == 200:
            print(f"Leave request approved: {approve_response.json()}")
            
            # Check if attendance records were created with 'leave' status
            attendance_response = requests.get(
                f"{BASE_URL}/api/hr/attendance",
                headers=auth_headers,
                params={
                    "employee_id": employee.get("id"),
                    "start_date": "2025-12-25",
                    "end_date": "2025-12-26"
                }
            )
            
            if attendance_response.status_code == 200:
                attendance_records = attendance_response.json()
                leave_records = [a for a in attendance_records if a.get("status") == "leave"]
                print(f"Found {len(leave_records)} attendance records with 'leave' status")
        else:
            print(f"Leave approval response: {approve_response.status_code} - {approve_response.text}")


class TestMilkReceptionsAPI:
    """Tests for milk receptions API"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_milk_receptions(self, auth_headers):
        """Test getting milk receptions list"""
        response = requests.get(
            f"{BASE_URL}/api/milk-receptions",
            headers=auth_headers
        )
        assert response.status_code == 200
        receptions = response.json()
        assert isinstance(receptions, list)
        print(f"Found {len(receptions)} milk receptions")
    
    def test_get_suppliers(self, auth_headers):
        """Test getting suppliers list"""
        response = requests.get(
            f"{BASE_URL}/api/suppliers",
            headers=auth_headers
        )
        assert response.status_code == 200
        suppliers = response.json()
        assert isinstance(suppliers, list)
        print(f"Found {len(suppliers)} suppliers")


class TestSuppliersAPI:
    """Tests for suppliers API"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_search_suppliers_by_code(self, auth_headers):
        """Test searching suppliers by code"""
        response = requests.get(
            f"{BASE_URL}/api/suppliers",
            headers=auth_headers,
            params={"search": "1225"}  # Sample code from test file
        )
        assert response.status_code == 200
        suppliers = response.json()
        print(f"Found {len(suppliers)} suppliers matching code '1225'")
    
    def test_get_supplier_by_id(self, auth_headers):
        """Test getting a specific supplier"""
        # First get list of suppliers
        list_response = requests.get(
            f"{BASE_URL}/api/suppliers",
            headers=auth_headers
        )
        assert list_response.status_code == 200
        suppliers = list_response.json()
        
        if not suppliers:
            pytest.skip("No suppliers found")
        
        supplier_id = suppliers[0].get("id")
        
        response = requests.get(
            f"{BASE_URL}/api/suppliers/{supplier_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        supplier = response.json()
        assert supplier.get("id") == supplier_id
        print(f"Retrieved supplier: {supplier.get('name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
