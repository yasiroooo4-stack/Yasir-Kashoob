#!/usr/bin/env python3
"""
Backend API Testing for Milk Collection Center ERP - Procurement Module Testing
Tests the Procurement Module APIs as requested in the review:
1. Login and Authentication Test (yasir/admin123)
2. GET /api/procurement/analytics/summary - ملخص المشتريات
3. GET /api/procurement/vendors - قائمة الموردين
4. POST /api/procurement/vendors - إضافة مورد جديد
5. GET /api/procurement/requisitions - قائمة طلبات الشراء
6. POST /api/procurement/requisitions - إنشاء طلب شراء
7. POST /api/procurement/requisitions/{id}/submit - تقديم الطلب للموافقة
8. POST /api/procurement/requisitions/{id}/approve - الموافقة على الطلب
9. GET /api/procurement/purchase-orders - أوامر الشراء
10. GET /api/procurement/inventory - المخزون
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Get backend URL from frontend .env
BACKEND_URL = "https://dairy-farm-erp-3.preview.emergentagent.com/api"

# Test credentials (as specified in review request)
TEST_USERNAME = "yasir"
TEST_PASSWORD = "admin123"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_data = None
        self.test_results = []
        self.test_vendor_id = None
        self.test_requisition_id = None
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_login_and_authentication(self):
        """Test 1: Login with yasir/admin123 and verify authentication works"""
        try:
            # Test login
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json={
                    "username": TEST_USERNAME,
                    "password": TEST_PASSWORD
                },
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.user_data = data.get("user")
                self.session.headers.update({
                    "Authorization": f"Bearer {self.token}"
                })
                
                # Test authentication by getting user profile
                profile_response = self.session.get(f"{BACKEND_URL}/auth/me")
                
                if profile_response.status_code == 200:
                    profile = profile_response.json()
                    
                    self.log_test(
                        "Login and Authentication Test", 
                        True, 
                        f"Successfully logged in as {self.user_data.get('username')} ({self.user_data.get('role')})"
                    )
                    return True
                else:
                    self.log_test(
                        "Login and Authentication Test", 
                        False, 
                        f"Authentication verification failed with status {profile_response.status_code}",
                        profile_response.text
                    )
                    return False
            else:
                self.log_test(
                    "Login and Authentication Test", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Login and Authentication Test", False, f"Error: {str(e)}")
            return False

    def test_procurement_analytics_summary(self):
        """Test 2: GET /api/procurement/analytics/summary - ملخص المشتريات"""
        try:
            if not self.token:
                self.log_test("Procurement Analytics Summary Test", False, "No authentication token available")
                return False
            
            response = self.session.get(f"{BACKEND_URL}/procurement/analytics/summary")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["vendors", "requisitions", "purchase_orders", "spending", "inventory_alerts"]
                if all(field in data for field in required_fields):
                    vendors_total = data["vendors"].get("total", 0)
                    requisitions_total = data["requisitions"].get("total", 0)
                    pos_total = data["purchase_orders"].get("total", 0)
                    spending_total = data["spending"].get("total", 0)
                    alerts_count = data.get("inventory_alerts", 0)
                    
                    self.log_test(
                        "Procurement Analytics Summary Test", 
                        True, 
                        f"Successfully retrieved analytics: {vendors_total} vendors, {requisitions_total} requisitions, {pos_total} POs, {spending_total} total spending, {alerts_count} alerts"
                    )
                    return True
                else:
                    missing_fields = [field for field in required_fields if field not in data]
                    self.log_test(
                        "Procurement Analytics Summary Test", 
                        False, 
                        f"Response missing required fields: {missing_fields}",
                        data
                    )
                    return False
            else:
                self.log_test(
                    "Procurement Analytics Summary Test", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Procurement Analytics Summary Test", False, f"Error: {str(e)}")
            return False

    def test_procurement_get_vendors(self):
        """Test 3: GET /api/procurement/vendors - قائمة الموردين"""
        try:
            if not self.token:
                self.log_test("Procurement Get Vendors Test", False, "No authentication token available")
                return False
            
            response = self.session.get(f"{BACKEND_URL}/procurement/vendors")
            
            if response.status_code == 200:
                vendors = response.json()
                
                # Should return a list (even if empty)
                if isinstance(vendors, list):
                    vendors_count = len(vendors)
                    
                    # Check structure of first vendor if any exist
                    if vendors_count > 0:
                        first_vendor = vendors[0]
                        required_fields = ["id", "name", "category", "status"]
                        if all(field in first_vendor for field in required_fields):
                            self.log_test(
                                "Procurement Get Vendors Test", 
                                True, 
                                f"Successfully retrieved {vendors_count} vendors with correct structure"
                            )
                        else:
                            missing_fields = [field for field in required_fields if field not in first_vendor]
                            self.log_test(
                                "Procurement Get Vendors Test", 
                                False, 
                                f"Vendor structure missing required fields: {missing_fields}",
                                first_vendor
                            )
                            return False
                    else:
                        self.log_test(
                            "Procurement Get Vendors Test", 
                            True, 
                            "Successfully retrieved empty vendors list"
                        )
                    return True
                else:
                    self.log_test(
                        "Procurement Get Vendors Test", 
                        False, 
                        "Response is not a list",
                        vendors
                    )
                    return False
            else:
                self.log_test(
                    "Procurement Get Vendors Test", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Procurement Get Vendors Test", False, f"Error: {str(e)}")
            return False

    def test_procurement_create_vendor(self):
        """Test 4: POST /api/procurement/vendors - إضافة مورد جديد"""
        try:
            if not self.token:
                self.log_test("Procurement Create Vendor Test", False, "No authentication token available")
                return False
            
            # Test vendor data
            vendor_data = {
                "name": "مورد اختبار API",
                "name_ar": "مورد اختبار API",
                "category": "equipment",
                "contact_person": "أحمد محمد",
                "phone": "+968 9123 4567",
                "email": "test@vendor.com",
                "address": "مسقط، سلطنة عمان",
                "tax_number": "TAX123456",
                "payment_terms": "net_30",
                "rating": 4,
                "notes": "مورد اختبار للنظام"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/procurement/vendors",
                json=vendor_data
            )
            
            if response.status_code == 200:
                created_vendor = response.json()
                
                # Verify vendor was created with correct data
                if (created_vendor.get("name") == vendor_data["name"] and 
                    created_vendor.get("category") == vendor_data["category"] and
                    created_vendor.get("contact_person") == vendor_data["contact_person"] and
                    "id" in created_vendor and
                    "status" in created_vendor):
                    
                    # Store vendor ID for later tests
                    self.test_vendor_id = created_vendor["id"]
                    
                    self.log_test(
                        "Procurement Create Vendor Test", 
                        True, 
                        f"Successfully created vendor '{vendor_data['name']}' with ID {created_vendor['id']}"
                    )
                    return True
                else:
                    self.log_test(
                        "Procurement Create Vendor Test", 
                        False, 
                        "Created vendor data doesn't match input data",
                        created_vendor
                    )
                    return False
            else:
                self.log_test(
                    "Procurement Create Vendor Test", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Procurement Create Vendor Test", False, f"Error: {str(e)}")
            return False

    def test_procurement_get_requisitions(self):
        """Test 5: GET /api/procurement/requisitions - قائمة طلبات الشراء"""
        try:
            if not self.token:
                self.log_test("Procurement Get Requisitions Test", False, "No authentication token available")
                return False
            
            response = self.session.get(f"{BACKEND_URL}/procurement/requisitions")
            
            if response.status_code == 200:
                requisitions = response.json()
                
                # Should return a list (even if empty)
                if isinstance(requisitions, list):
                    req_count = len(requisitions)
                    
                    # Check structure of first requisition if any exist
                    if req_count > 0:
                        first_req = requisitions[0]
                        required_fields = ["id", "requisition_number", "title", "department", "status"]
                        if all(field in first_req for field in required_fields):
                            self.log_test(
                                "Procurement Get Requisitions Test", 
                                True, 
                                f"Successfully retrieved {req_count} requisitions with correct structure"
                            )
                        else:
                            missing_fields = [field for field in required_fields if field not in first_req]
                            self.log_test(
                                "Procurement Get Requisitions Test", 
                                False, 
                                f"Requisition structure missing required fields: {missing_fields}",
                                first_req
                            )
                            return False
                    else:
                        self.log_test(
                            "Procurement Get Requisitions Test", 
                            True, 
                            "Successfully retrieved empty requisitions list"
                        )
                    return True
                else:
                    self.log_test(
                        "Procurement Get Requisitions Test", 
                        False, 
                        "Response is not a list",
                        requisitions
                    )
                    return False
            else:
                self.log_test(
                    "Procurement Get Requisitions Test", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Procurement Get Requisitions Test", False, f"Error: {str(e)}")
            return False

    def test_procurement_create_requisition(self):
        """Test 6: POST /api/procurement/requisitions - إنشاء طلب شراء"""
        try:
            if not self.token:
                self.log_test("Procurement Create Requisition Test", False, "No authentication token available")
                return False
            
            # Test requisition data
            requisition_data = {
                "title": "طلب شراء معدات مكتبية",
                "department": "الإدارة",
                "priority": "medium",
                "required_date": "2025-02-15",
                "justification": "نحتاج لمعدات مكتبية جديدة لتحسين الإنتاجية",
                "items": [
                    {
                        "item_name": "طابعة ليزر",
                        "description": "طابعة ليزر ملونة عالية الجودة",
                        "quantity": 2,
                        "unit": "piece",
                        "estimated_price": 500.0
                    },
                    {
                        "item_name": "ورق A4",
                        "description": "ورق طباعة أبيض A4",
                        "quantity": 10,
                        "unit": "pack",
                        "estimated_price": 15.0
                    }
                ]
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/procurement/requisitions",
                json=requisition_data
            )
            
            if response.status_code == 200:
                created_req = response.json()
                
                # Verify requisition was created with correct data
                if (created_req.get("title") == requisition_data["title"] and 
                    created_req.get("department") == requisition_data["department"] and
                    created_req.get("priority") == requisition_data["priority"] and
                    "id" in created_req and
                    "requisition_number" in created_req and
                    "status" in created_req and
                    len(created_req.get("items", [])) == len(requisition_data["items"])):
                    
                    # Store requisition ID for later tests
                    self.test_requisition_id = created_req["id"]
                    
                    self.log_test(
                        "Procurement Create Requisition Test", 
                        True, 
                        f"Successfully created requisition '{created_req['requisition_number']}' with {len(created_req['items'])} items"
                    )
                    return True
                else:
                    self.log_test(
                        "Procurement Create Requisition Test", 
                        False, 
                        "Created requisition data doesn't match input data",
                        created_req
                    )
                    return False
            else:
                self.log_test(
                    "Procurement Create Requisition Test", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Procurement Create Requisition Test", False, f"Error: {str(e)}")
            return False

    def test_procurement_submit_requisition(self):
        """Test 7: POST /api/procurement/requisitions/{id}/submit - تقديم الطلب للموافقة"""
        try:
            if not self.token:
                self.log_test("Procurement Submit Requisition Test", False, "No authentication token available")
                return False
            
            if not self.test_requisition_id:
                self.log_test("Procurement Submit Requisition Test", False, "No test requisition ID available from previous test")
                return False
            
            response = self.session.post(f"{BACKEND_URL}/procurement/requisitions/{self.test_requisition_id}/submit")
            
            if response.status_code == 200:
                result = response.json()
                
                if "message" in result:
                    # Verify requisition status was updated by getting it again
                    get_response = self.session.get(f"{BACKEND_URL}/procurement/requisitions")
                    
                    if get_response.status_code == 200:
                        requisitions = get_response.json()
                        
                        # Find our test requisition
                        test_req = next((req for req in requisitions if req.get("id") == self.test_requisition_id), None)
                        
                        if test_req and test_req.get("status") == "pending_dept_approval":
                            self.log_test(
                                "Procurement Submit Requisition Test", 
                                True, 
                                f"Successfully submitted requisition {self.test_requisition_id} for approval"
                            )
                            return True
                        else:
                            self.log_test(
                                "Procurement Submit Requisition Test", 
                                False, 
                                "Requisition status was not updated correctly after submission",
                                test_req
                            )
                            return False
                    else:
                        self.log_test(
                            "Procurement Submit Requisition Test", 
                            False, 
                            "Failed to verify requisition status after submission",
                            get_response.text
                        )
                        return False
                else:
                    self.log_test(
                        "Procurement Submit Requisition Test", 
                        False, 
                        "Response missing message field",
                        result
                    )
                    return False
            else:
                self.log_test(
                    "Procurement Submit Requisition Test", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Procurement Submit Requisition Test", False, f"Error: {str(e)}")
            return False

    def test_procurement_approve_requisition(self):
        """Test 8: POST /api/procurement/requisitions/{id}/approve - الموافقة على الطلب"""
        try:
            if not self.token:
                self.log_test("Procurement Approve Requisition Test", False, "No authentication token available")
                return False
            
            if not self.test_requisition_id:
                self.log_test("Procurement Approve Requisition Test", False, "No test requisition ID available from previous test")
                return False
            
            # Approve with comments
            approval_data = {
                "comments": "موافقة على الطلب - المعدات ضرورية للعمل"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/procurement/requisitions/{self.test_requisition_id}/approve",
                params=approval_data
            )
            
            if response.status_code == 200:
                result = response.json()
                
                if "message" in result:
                    # Verify requisition status was updated
                    get_response = self.session.get(f"{BACKEND_URL}/procurement/requisitions")
                    
                    if get_response.status_code == 200:
                        requisitions = get_response.json()
                        
                        # Find our test requisition
                        test_req = next((req for req in requisitions if req.get("id") == self.test_requisition_id), None)
                        
                        if test_req and test_req.get("status") in ["pending_finance_approval", "approved"]:
                            approval_history = test_req.get("approval_history", [])
                            has_approval = any(entry.get("action") == "approved" for entry in approval_history)
                            
                            self.log_test(
                                "Procurement Approve Requisition Test", 
                                True, 
                                f"Successfully approved requisition {self.test_requisition_id}, new status: {test_req.get('status')}, approval history: {len(approval_history)} entries"
                            )
                            return True
                        else:
                            self.log_test(
                                "Procurement Approve Requisition Test", 
                                False, 
                                "Requisition status was not updated correctly after approval",
                                test_req
                            )
                            return False
                    else:
                        self.log_test(
                            "Procurement Approve Requisition Test", 
                            False, 
                            "Failed to verify requisition status after approval",
                            get_response.text
                        )
                        return False
                else:
                    self.log_test(
                        "Procurement Approve Requisition Test", 
                        False, 
                        "Response missing message field",
                        result
                    )
                    return False
            else:
                self.log_test(
                    "Procurement Approve Requisition Test", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Procurement Approve Requisition Test", False, f"Error: {str(e)}")
            return False

    def test_procurement_get_purchase_orders(self):
        """Test 9: GET /api/procurement/purchase-orders - أوامر الشراء"""
        try:
            if not self.token:
                self.log_test("Procurement Get Purchase Orders Test", False, "No authentication token available")
                return False
            
            response = self.session.get(f"{BACKEND_URL}/procurement/purchase-orders")
            
            if response.status_code == 200:
                purchase_orders = response.json()
                
                # Should return a list (even if empty)
                if isinstance(purchase_orders, list):
                    po_count = len(purchase_orders)
                    
                    # Check structure of first PO if any exist
                    if po_count > 0:
                        first_po = purchase_orders[0]
                        required_fields = ["id", "po_number", "vendor_id", "vendor_name", "status", "total_amount"]
                        if all(field in first_po for field in required_fields):
                            self.log_test(
                                "Procurement Get Purchase Orders Test", 
                                True, 
                                f"Successfully retrieved {po_count} purchase orders with correct structure"
                            )
                        else:
                            missing_fields = [field for field in required_fields if field not in first_po]
                            self.log_test(
                                "Procurement Get Purchase Orders Test", 
                                False, 
                                f"Purchase order structure missing required fields: {missing_fields}",
                                first_po
                            )
                            return False
                    else:
                        self.log_test(
                            "Procurement Get Purchase Orders Test", 
                            True, 
                            "Successfully retrieved empty purchase orders list"
                        )
                    return True
                else:
                    self.log_test(
                        "Procurement Get Purchase Orders Test", 
                        False, 
                        "Response is not a list",
                        purchase_orders
                    )
                    return False
            else:
                self.log_test(
                    "Procurement Get Purchase Orders Test", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Procurement Get Purchase Orders Test", False, f"Error: {str(e)}")
            return False

    def test_procurement_get_inventory(self):
        """Test 10: GET /api/procurement/inventory - المخزون"""
        try:
            if not self.token:
                self.log_test("Procurement Get Inventory Test", False, "No authentication token available")
                return False
            
            response = self.session.get(f"{BACKEND_URL}/procurement/inventory")
            
            if response.status_code == 200:
                inventory_items = response.json()
                
                # Should return a list (even if empty)
                if isinstance(inventory_items, list):
                    items_count = len(inventory_items)
                    
                    # Check structure of first item if any exist
                    if items_count > 0:
                        first_item = inventory_items[0]
                        required_fields = ["id", "name", "category", "current_quantity", "unit"]
                        if all(field in first_item for field in required_fields):
                            self.log_test(
                                "Procurement Get Inventory Test", 
                                True, 
                                f"Successfully retrieved {items_count} inventory items with correct structure"
                            )
                        else:
                            missing_fields = [field for field in required_fields if field not in first_item]
                            self.log_test(
                                "Procurement Get Inventory Test", 
                                False, 
                                f"Inventory item structure missing required fields: {missing_fields}",
                                first_item
                            )
                            return False
                    else:
                        self.log_test(
                            "Procurement Get Inventory Test", 
                            True, 
                            "Successfully retrieved empty inventory list"
                        )
                    return True
                else:
                    self.log_test(
                        "Procurement Get Inventory Test", 
                        False, 
                        "Response is not a list",
                        inventory_items
                    )
                    return False
            else:
                self.log_test(
                    "Procurement Get Inventory Test", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Procurement Get Inventory Test", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("MILK COLLECTION CENTER ERP - ZKTECO SYNC MANAGER TESTING")
        print("=" * 60)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Credentials: {TEST_USERNAME}/{TEST_PASSWORD}")
        print("=" * 60)
        
        tests = [
            self.test_login_and_authentication,
            self.test_zkteco_get_devices_and_settings,
            self.test_zkteco_add_device,
            self.test_zkteco_test_device_connection,
            self.test_zkteco_update_sync_settings,
            self.test_zkteco_sync_attendance,
            self.test_zkteco_delete_device
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
            print()  # Add spacing between tests
        
        print("=" * 60)
        print(f"TEST SUMMARY: {passed}/{total} tests passed")
        print("=" * 60)
        
        # Print detailed results
        for result in self.test_results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"{status}: {result['test']}")
            if not result["success"] and result["details"]:
                print(f"   Details: {result['details']}")
        
        return passed == total

def main():
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()