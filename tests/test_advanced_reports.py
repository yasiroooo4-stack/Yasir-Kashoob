"""
Test Advanced Reports APIs for Milk Collection Center ERP
Tests: Payroll Comparison, Monthly Financial Report, Centers Performance, Inventory Alerts
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dairysoft.preview.emergentagent.com')

class TestAdvancedReportsAPIs:
    """Test suite for Advanced Reports APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "yasir", "password": "admin123"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    # ==================== PAYROLL PERIODS ====================
    
    def test_get_payroll_periods(self):
        """Test GET /api/hr/payroll/periods - Get all payroll periods"""
        response = self.session.get(f"{BASE_URL}/api/hr/payroll/periods")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} payroll periods")
        
        # Store period IDs for comparison test
        self.periods = data
        return data
    
    # ==================== PAYROLL COMPARISON ====================
    
    def test_payroll_comparison_missing_params(self):
        """Test payroll comparison with missing parameters"""
        response = self.session.get(f"{BASE_URL}/api/reports/payroll/comparison")
        # Should fail without period IDs
        assert response.status_code in [400, 422]
        print("✓ Payroll comparison correctly rejects missing parameters")
    
    def test_payroll_comparison_invalid_periods(self):
        """Test payroll comparison with invalid period IDs"""
        response = self.session.get(
            f"{BASE_URL}/api/reports/payroll/comparison",
            params={"period1_id": "invalid-id-1", "period2_id": "invalid-id-2"}
        )
        assert response.status_code == 404
        print("✓ Payroll comparison correctly returns 404 for invalid periods")
    
    def test_payroll_comparison_valid_periods(self):
        """Test payroll comparison with valid period IDs"""
        # First get available periods
        periods_response = self.session.get(f"{BASE_URL}/api/hr/payroll/periods")
        periods = periods_response.json()
        
        if len(periods) < 2:
            pytest.skip("Need at least 2 payroll periods for comparison test")
        
        period1_id = periods[0]["id"]
        period2_id = periods[1]["id"]
        
        response = self.session.get(
            f"{BASE_URL}/api/reports/payroll/comparison",
            params={"period1_id": period1_id, "period2_id": period2_id}
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Validate response structure
        assert "period1" in data
        assert "period2" in data
        assert "summary" in data
        assert "comparisons" in data
        
        # Validate summary fields
        summary = data["summary"]
        assert "period1_total_net" in summary
        assert "period2_total_net" in summary
        assert "net_change" in summary
        assert "percentage_change" in summary
        assert "employees_with_increase" in summary
        assert "employees_with_decrease" in summary
        assert "employees_unchanged" in summary
        
        print(f"✓ Payroll comparison successful:")
        print(f"  - Period 1 Total: {summary['period1_total_net']}")
        print(f"  - Period 2 Total: {summary['period2_total_net']}")
        print(f"  - Net Change: {summary['net_change']} ({summary['percentage_change']}%)")
        print(f"  - Employees compared: {len(data['comparisons'])}")
    
    # ==================== MONTHLY FINANCIAL REPORT ====================
    
    def test_monthly_financial_report_current_month(self):
        """Test GET /api/reports/financial/monthly - Current month"""
        from datetime import datetime
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        response = self.session.get(
            f"{BASE_URL}/api/reports/financial/monthly",
            params={"year": current_year, "month": current_month}
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Validate response structure
        assert "period" in data
        assert "revenue" in data
        assert "cost_of_goods" in data
        assert "operating_expenses" in data
        assert "profitability" in data
        
        # Validate period
        assert data["period"]["year"] == current_year
        assert data["period"]["month"] == current_month
        
        # Validate revenue structure
        revenue = data["revenue"]
        assert "total_sales" in revenue
        assert "cash_sales" in revenue
        assert "credit_sales" in revenue
        
        # Validate cost of goods
        cog = data["cost_of_goods"]
        assert "total_purchases" in cog
        assert "quantity_purchased_liters" in cog
        
        # Validate operating expenses
        expenses = data["operating_expenses"]
        assert "salaries_and_wages" in expenses
        assert "employee_count" in expenses
        
        # Validate profitability
        profit = data["profitability"]
        assert "gross_profit" in profit
        assert "net_profit" in profit
        assert "gross_margin_percentage" in profit
        assert "net_margin_percentage" in profit
        
        print(f"✓ Monthly financial report for {current_year}/{current_month}:")
        print(f"  - Total Sales: {revenue['total_sales']} OMR")
        print(f"  - Total Purchases: {cog['total_purchases']} OMR")
        print(f"  - Gross Profit: {profit['gross_profit']} OMR")
        print(f"  - Net Profit: {profit['net_profit']} OMR")
    
    def test_monthly_financial_report_january_2026(self):
        """Test GET /api/reports/financial/monthly - January 2026"""
        response = self.session.get(
            f"{BASE_URL}/api/reports/financial/monthly",
            params={"year": 2026, "month": 1}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["period"]["year"] == 2026
        assert data["period"]["month"] == 1
        print("✓ Monthly financial report for January 2026 retrieved successfully")
    
    # ==================== CENTERS PERFORMANCE ====================
    
    def test_centers_performance_all_time(self):
        """Test GET /api/reports/centers/performance - All time"""
        response = self.session.get(f"{BASE_URL}/api/reports/centers/performance")
        assert response.status_code == 200
        
        data = response.json()
        
        # Validate response structure
        assert "period" in data
        assert "totals" in data
        assert "centers" in data
        
        # Validate totals
        totals = data["totals"]
        assert "total_quantity" in totals
        assert "total_amount" in totals
        assert "total_receptions" in totals
        assert "centers_count" in totals
        
        # Validate centers data
        centers = data["centers"]
        assert isinstance(centers, list)
        
        if centers:
            center = centers[0]
            assert "center_name" in center
            assert "total_quantity" in center
            assert "total_amount" in center
            assert "suppliers_count" in center
            assert "rank" in center
        
        print(f"✓ Centers performance report:")
        print(f"  - Total Quantity: {totals['total_quantity']} liters")
        print(f"  - Total Amount: {totals['total_amount']} OMR")
        print(f"  - Centers Count: {totals['centers_count']}")
        
        for center in centers[:3]:  # Show top 3
            print(f"  - #{center['rank']} {center['center_name']}: {center['total_quantity']} liters")
    
    def test_centers_performance_with_date_filter(self):
        """Test GET /api/reports/centers/performance - With date filter"""
        response = self.session.get(
            f"{BASE_URL}/api/reports/centers/performance",
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["period"]["start_date"] == "2025-01-01"
        assert data["period"]["end_date"] == "2025-12-31"
        print("✓ Centers performance with date filter works correctly")
    
    # ==================== INVENTORY ALERTS ====================
    
    def test_inventory_alerts(self):
        """Test GET /api/reports/inventory/alerts"""
        response = self.session.get(f"{BASE_URL}/api/reports/inventory/alerts")
        assert response.status_code == 200
        
        data = response.json()
        
        # Validate response structure
        assert "alerts_count" in data
        assert "critical_count" in data
        assert "warning_count" in data
        assert "alerts" in data
        
        alerts = data["alerts"]
        assert isinstance(alerts, list)
        
        # Validate alert structure if any exist
        if alerts:
            alert = alerts[0]
            assert "product_type" in alert
            assert "current_quantity" in alert
            assert "threshold" in alert
            assert "deficit" in alert
            assert "severity" in alert
            assert alert["severity"] in ["critical", "warning"]
        
        print(f"✓ Inventory alerts:")
        print(f"  - Total Alerts: {data['alerts_count']}")
        print(f"  - Critical: {data['critical_count']}")
        print(f"  - Warning: {data['warning_count']}")
    
    def test_set_inventory_threshold(self):
        """Test POST /api/reports/inventory/set-threshold"""
        response = self.session.post(
            f"{BASE_URL}/api/reports/inventory/set-threshold",
            json={"product_type": "raw_milk", "threshold": 150}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        print("✓ Inventory threshold set successfully")
    
    def test_set_inventory_threshold_missing_params(self):
        """Test POST /api/reports/inventory/set-threshold - Missing params"""
        response = self.session.post(
            f"{BASE_URL}/api/reports/inventory/set-threshold",
            json={}
        )
        assert response.status_code == 400
        print("✓ Set threshold correctly rejects missing parameters")
    
    def test_send_inventory_alerts_missing_email(self):
        """Test POST /api/reports/inventory/send-alerts - Missing email"""
        response = self.session.post(
            f"{BASE_URL}/api/reports/inventory/send-alerts",
            json={}
        )
        assert response.status_code == 400
        print("✓ Send alerts correctly rejects missing email")
    
    def test_send_inventory_alerts_with_email(self):
        """Test POST /api/reports/inventory/send-alerts - With email"""
        response = self.session.post(
            f"{BASE_URL}/api/reports/inventory/send-alerts",
            json={"email": "test@example.com"}
        )
        # Should return 200 even if no alerts or SMTP not configured
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "sent" in data
        print(f"✓ Send inventory alerts response: {data['message']}")
    
    # ==================== NOTIFICATION SETTINGS ====================
    
    def test_get_notification_settings(self):
        """Test GET /api/notifications/settings"""
        response = self.session.get(f"{BASE_URL}/api/notifications/settings")
        assert response.status_code == 200
        
        data = response.json()
        # Should have default structure
        assert "email_alerts_enabled" in data or "type" in data
        print("✓ Notification settings retrieved successfully")
    
    def test_update_notification_settings(self):
        """Test POST /api/notifications/settings"""
        response = self.session.post(
            f"{BASE_URL}/api/notifications/settings",
            json={
                "email_alerts_enabled": True,
                "alert_email": "admin@almoroojdairy.om",
                "inventory_threshold_alert": True,
                "daily_report_email": False
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        print("✓ Notification settings updated successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
