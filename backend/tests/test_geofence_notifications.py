"""
Test Geofence Push Notification APIs
Tests for notification bell badge count and recent alerts endpoints
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGeofenceNotificationAPIs:
    """Test GET /api/tracking/alerts/recent and /api/tracking/alerts/count endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_alerts_count_endpoint_returns_json(self):
        """Test GET /api/tracking/alerts/count returns valid JSON with count field"""
        response = self.session.get(f"{BASE_URL}/api/tracking/alerts/count")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "count" in data, "Response should have 'count' field"
        assert isinstance(data["count"], int), "Count should be an integer"
        assert data["count"] >= 0, "Count should be non-negative"
        print(f"✓ Unread alerts count: {data['count']}")
    
    def test_alerts_recent_endpoint_returns_list(self):
        """Test GET /api/tracking/alerts/recent returns a list"""
        response = self.session.get(f"{BASE_URL}/api/tracking/alerts/recent")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Recent alerts returned: {len(data)} alerts")
    
    def test_alerts_recent_with_since_filter(self):
        """Test GET /api/tracking/alerts/recent?since=<timestamp> filters correctly"""
        # Use a future timestamp - should return empty
        future_time = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        response = self.session.get(f"{BASE_URL}/api/tracking/alerts/recent?since={future_time}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 0, f"Future timestamp should return empty list, got {len(data)} alerts"
        print(f"✓ Since filter correctly returns empty for future timestamp")
    
    def test_alerts_recent_with_past_since_filter(self):
        """Test GET /api/tracking/alerts/recent?since=<past_timestamp> includes recent alerts"""
        # Use a past timestamp - should return any alerts after that time
        past_time = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        response = self.session.get(f"{BASE_URL}/api/tracking/alerts/recent?since={past_time}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Past since filter returned {len(data)} alerts")
    
    def test_alert_structure_if_exists(self):
        """Test that alerts have required fields when present"""
        response = self.session.get(f"{BASE_URL}/api/tracking/alerts/recent")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            alert = data[0]
            # Check required fields
            assert "id" in alert, "Alert should have 'id' field"
            assert "employee_name" in alert, "Alert should have 'employee_name' field"
            assert "alert_type" in alert, "Alert should have 'alert_type' field"
            assert "is_read" in alert, "Alert should have 'is_read' field"
            assert "is_dismissed" in alert, "Alert should have 'is_dismissed' field"
            assert "created_at" in alert, "Alert should have 'created_at' field"
            assert alert["is_read"] == False, "Recent alerts should be unread"
            assert alert["is_dismissed"] == False, "Recent alerts should not be dismissed"
            print(f"✓ Alert structure verified: {alert['employee_name']} - {alert['alert_type']}")
        else:
            print("✓ No alerts to verify structure (skipping)")
    
    def test_alerts_sorted_by_created_at_desc(self):
        """Test that alerts are sorted by created_at in descending order"""
        response = self.session.get(f"{BASE_URL}/api/tracking/alerts/recent")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 1:
            for i in range(len(data) - 1):
                assert data[i]["created_at"] >= data[i + 1]["created_at"], \
                    "Alerts should be sorted by created_at descending"
            print(f"✓ Alerts sorted correctly (most recent first)")
        else:
            print("✓ Less than 2 alerts, sorting check skipped")


class TestAlertReadDismissAPIs:
    """Test mark as read and dismiss endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_mark_alert_read_endpoint_exists(self):
        """Test PUT /api/tracking/alerts/{alert_id}/read endpoint exists"""
        # Use a dummy ID - endpoint should still work (just won't find the doc)
        test_id = "test-nonexistent-id"
        response = self.session.put(f"{BASE_URL}/api/tracking/alerts/{test_id}/read")
        
        # Should succeed (update returns success even if no match)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        print(f"✓ Mark as read endpoint working")
    
    def test_dismiss_alert_endpoint_exists(self):
        """Test PUT /api/tracking/alerts/{alert_id}/dismiss endpoint exists"""
        test_id = "test-nonexistent-id"
        response = self.session.put(f"{BASE_URL}/api/tracking/alerts/{test_id}/dismiss")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        print(f"✓ Dismiss alert endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
