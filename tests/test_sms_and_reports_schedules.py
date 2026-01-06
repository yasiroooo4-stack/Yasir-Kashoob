"""
Test SMS and Scheduled Reports APIs
Tests for:
- SMS Settings GET/POST /api/sms/settings
- SMS Send POST /api/sms/send
- SMS Logs GET /api/sms/logs
- Report Schedules GET /api/reports/schedules
- Report Schedule Create POST /api/reports/schedules
- Report Schedule Update PUT /api/reports/schedules/{id}
- Report Schedule Delete DELETE /api/reports/schedules/{id}
- Report Schedule Run POST /api/reports/schedules/{id}/run
- Report Logs GET /api/reports/logs
"""

import pytest
import requests
import os
import uuid

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
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


class TestSMSSettings(TestAuth):
    """SMS Settings API tests"""
    
    def test_get_sms_settings(self, headers):
        """Test GET /api/sms/settings"""
        response = requests.get(f"{BASE_URL}/api/sms/settings", headers=headers)
        assert response.status_code == 200, f"Failed to get SMS settings: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "provider" in data or "type" in data
        print(f"✅ GET /api/sms/settings - Status: {response.status_code}")
        print(f"   SMS configured: {data.get('is_configured', False)}")
    
    def test_update_sms_settings(self, headers):
        """Test POST /api/sms/settings"""
        settings_data = {
            "provider": "tamimah",
            "api_url": "https://api.tamimahsms.com/send",
            "username": "test_user",
            "password": "test_pass",
            "sender_id": "MAROOJ"
        }
        
        response = requests.post(f"{BASE_URL}/api/sms/settings", json=settings_data, headers=headers)
        assert response.status_code == 200, f"Failed to update SMS settings: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✅ POST /api/sms/settings - Status: {response.status_code}")
        print(f"   Message: {data.get('message')}")
    
    def test_verify_sms_settings_updated(self, headers):
        """Verify SMS settings were updated"""
        response = requests.get(f"{BASE_URL}/api/sms/settings", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("username") == "test_user"
        assert data.get("sender_id") == "MAROOJ"
        assert data.get("password") == "********"  # Password should be hidden
        print(f"✅ SMS settings verified - username: {data.get('username')}, sender_id: {data.get('sender_id')}")


class TestSMSSend(TestAuth):
    """SMS Send API tests"""
    
    def test_send_sms_missing_phone(self, headers):
        """Test POST /api/sms/send with missing phone"""
        response = requests.post(f"{BASE_URL}/api/sms/send", json={
            "message": "Test message"
        }, headers=headers)
        assert response.status_code == 400, f"Expected 400 for missing phone: {response.text}"
        print(f"✅ POST /api/sms/send (missing phone) - Status: {response.status_code}")
    
    def test_send_sms_missing_message(self, headers):
        """Test POST /api/sms/send with missing message"""
        response = requests.post(f"{BASE_URL}/api/sms/send", json={
            "phone": "96899123456"
        }, headers=headers)
        assert response.status_code == 400, f"Expected 400 for missing message: {response.text}"
        print(f"✅ POST /api/sms/send (missing message) - Status: {response.status_code}")
    
    def test_send_sms_valid_request(self, headers):
        """Test POST /api/sms/send with valid data (will fail without real SMS config)"""
        response = requests.post(f"{BASE_URL}/api/sms/send", json={
            "phone": "96899123456",
            "message": "رسالة اختبار من نظام المروج للألبان"
        }, headers=headers)
        # Should return 200 even if SMS fails (logs the attempt)
        assert response.status_code == 200, f"Failed to send SMS: {response.text}"
        
        data = response.json()
        # success can be True or False depending on SMS config
        assert "success" in data or "message" in data
        print(f"✅ POST /api/sms/send - Status: {response.status_code}")
        print(f"   Success: {data.get('success')}, Message: {data.get('message')}")


class TestSMSLogs(TestAuth):
    """SMS Logs API tests"""
    
    def test_get_sms_logs(self, headers):
        """Test GET /api/sms/logs"""
        response = requests.get(f"{BASE_URL}/api/sms/logs?limit=20", headers=headers)
        assert response.status_code == 200, f"Failed to get SMS logs: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/sms/logs - Status: {response.status_code}")
        print(f"   Logs count: {len(data)}")
        
        # Verify log structure if logs exist
        if len(data) > 0:
            log = data[0]
            assert "phone" in log
            assert "message" in log
            assert "status" in log
            assert "sent_at" in log
            print(f"   Latest log: phone={log.get('phone')}, status={log.get('status')}")


class TestReportSchedules(TestAuth):
    """Report Schedules API tests"""
    
    created_schedule_id = None
    
    def test_get_report_schedules(self, headers):
        """Test GET /api/reports/schedules"""
        response = requests.get(f"{BASE_URL}/api/reports/schedules", headers=headers)
        assert response.status_code == 200, f"Failed to get schedules: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/reports/schedules - Status: {response.status_code}")
        print(f"   Schedules count: {len(data)}")
    
    def test_create_report_schedule(self, headers):
        """Test POST /api/reports/schedules"""
        schedule_data = {
            "name": f"TEST_تقرير اختبار_{uuid.uuid4().hex[:8]}",
            "report_type": "daily_summary",
            "frequency": "daily",
            "time": "08:00",
            "recipients": ["test@example.com"],
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/reports/schedules", json=schedule_data, headers=headers)
        assert response.status_code == 200, f"Failed to create schedule: {response.text}"
        
        data = response.json()
        assert "schedule" in data
        assert "id" in data["schedule"]
        
        # Store for later tests
        TestReportSchedules.created_schedule_id = data["schedule"]["id"]
        
        print(f"✅ POST /api/reports/schedules - Status: {response.status_code}")
        print(f"   Created schedule ID: {TestReportSchedules.created_schedule_id}")
    
    def test_verify_schedule_created(self, headers):
        """Verify schedule was created by fetching all schedules"""
        response = requests.get(f"{BASE_URL}/api/reports/schedules", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        schedule_ids = [s.get("id") for s in data]
        assert TestReportSchedules.created_schedule_id in schedule_ids
        print(f"✅ Schedule verified in list")
    
    def test_update_report_schedule(self, headers):
        """Test PUT /api/reports/schedules/{id}"""
        if not TestReportSchedules.created_schedule_id:
            pytest.skip("No schedule created to update")
        
        update_data = {
            "name": "TEST_تقرير محدث",
            "frequency": "weekly",
            "day_of_week": 1,
            "is_active": False
        }
        
        response = requests.put(
            f"{BASE_URL}/api/reports/schedules/{TestReportSchedules.created_schedule_id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to update schedule: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✅ PUT /api/reports/schedules/{TestReportSchedules.created_schedule_id} - Status: {response.status_code}")
    
    def test_run_report_schedule(self, headers):
        """Test POST /api/reports/schedules/{id}/run"""
        if not TestReportSchedules.created_schedule_id:
            pytest.skip("No schedule created to run")
        
        response = requests.post(
            f"{BASE_URL}/api/reports/schedules/{TestReportSchedules.created_schedule_id}/run",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to run schedule: {response.text}"
        
        data = response.json()
        # Can succeed or fail depending on SMTP config
        assert "success" in data or "error" in data or "message" in data
        print(f"✅ POST /api/reports/schedules/{TestReportSchedules.created_schedule_id}/run - Status: {response.status_code}")
        print(f"   Result: {data}")
    
    def test_run_nonexistent_schedule(self, headers):
        """Test POST /api/reports/schedules/{id}/run with invalid ID"""
        response = requests.post(
            f"{BASE_URL}/api/reports/schedules/nonexistent-id/run",
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404 for nonexistent schedule: {response.text}"
        print(f"✅ POST /api/reports/schedules/nonexistent-id/run - Status: {response.status_code}")
    
    def test_delete_report_schedule(self, headers):
        """Test DELETE /api/reports/schedules/{id}"""
        if not TestReportSchedules.created_schedule_id:
            pytest.skip("No schedule created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/reports/schedules/{TestReportSchedules.created_schedule_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to delete schedule: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✅ DELETE /api/reports/schedules/{TestReportSchedules.created_schedule_id} - Status: {response.status_code}")
    
    def test_verify_schedule_deleted(self, headers):
        """Verify schedule was deleted"""
        response = requests.get(f"{BASE_URL}/api/reports/schedules", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        schedule_ids = [s.get("id") for s in data]
        assert TestReportSchedules.created_schedule_id not in schedule_ids
        print(f"✅ Schedule deletion verified")


class TestReportLogs(TestAuth):
    """Report Logs API tests"""
    
    def test_get_report_logs(self, headers):
        """Test GET /api/reports/logs"""
        response = requests.get(f"{BASE_URL}/api/reports/logs?limit=20", headers=headers)
        assert response.status_code == 200, f"Failed to get report logs: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/reports/logs - Status: {response.status_code}")
        print(f"   Logs count: {len(data)}")
        
        # Verify log structure if logs exist
        if len(data) > 0:
            log = data[0]
            assert "report_type" in log
            assert "status" in log
            assert "sent_at" in log
            print(f"   Latest log: type={log.get('report_type')}, status={log.get('status')}")


class TestScheduleReportTypes(TestAuth):
    """Test different report types for schedules"""
    
    def test_create_weekly_schedule(self, headers):
        """Test creating weekly schedule"""
        schedule_data = {
            "name": f"TEST_تقرير أسبوعي_{uuid.uuid4().hex[:8]}",
            "report_type": "weekly_summary",
            "frequency": "weekly",
            "day_of_week": 0,  # Monday
            "time": "09:00",
            "recipients": ["weekly@example.com"],
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/reports/schedules", json=schedule_data, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        schedule_id = data["schedule"]["id"]
        print(f"✅ Created weekly schedule: {schedule_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/reports/schedules/{schedule_id}", headers=headers)
    
    def test_create_monthly_schedule(self, headers):
        """Test creating monthly schedule"""
        schedule_data = {
            "name": f"TEST_تقرير شهري_{uuid.uuid4().hex[:8]}",
            "report_type": "monthly_financial",
            "frequency": "monthly",
            "day_of_month": 1,
            "time": "10:00",
            "recipients": ["monthly@example.com"],
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/reports/schedules", json=schedule_data, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        schedule_id = data["schedule"]["id"]
        print(f"✅ Created monthly schedule: {schedule_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/reports/schedules/{schedule_id}", headers=headers)
    
    def test_create_inventory_alerts_schedule(self, headers):
        """Test creating inventory alerts schedule"""
        schedule_data = {
            "name": f"TEST_تنبيهات المخزون_{uuid.uuid4().hex[:8]}",
            "report_type": "inventory_alerts",
            "frequency": "daily",
            "time": "07:00",
            "recipients": ["inventory@example.com"],
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/reports/schedules", json=schedule_data, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        schedule_id = data["schedule"]["id"]
        print(f"✅ Created inventory alerts schedule: {schedule_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/reports/schedules/{schedule_id}", headers=headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
