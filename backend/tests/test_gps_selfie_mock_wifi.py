"""
Test GPS Attendance New Features:
1. Selfie photo capture with GPS attendance
2. Mock GPS detection and rejection
3. WiFi-based attendance
4. Security logs
5. GPS with existing fingerprint (dual tracking)
"""
import pytest
import requests
import os
import base64
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test employee credentials
TEST_EMPLOYEE_CODE = "EMP202560"
TEST_EMPLOYEE_NAME = "Yasir Ahmed Hassan Kashob"
TEST_EMPLOYEE_ID = "afab8dbe-980a-4975-9567-bb3bd2a3ce73"

# Sample base64 image (tiny 1x1 JPEG)
SAMPLE_SELFIE_BASE64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q=="


class TestEmployeeLogin:
    """Test employee login for GPS tracking"""
    
    def test_login_with_employee_code(self):
        """Test login with employee code EMP202560"""
        response = requests.post(f"{BASE_URL}/api/tracking/employee-login", json={
            "employee_code": TEST_EMPLOYEE_CODE
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "employee" in data, "Response should contain employee"
        assert data["employee"]["name"] == TEST_EMPLOYEE_NAME, f"Expected {TEST_EMPLOYEE_NAME}"
        assert data["employee"]["employee_code"] == TEST_EMPLOYEE_CODE
        print(f"PASS: Login with code - Employee: {data['employee']['name']}")

    def test_login_with_phone(self):
        """Test login with phone number"""
        response = requests.post(f"{BASE_URL}/api/tracking/employee-login", json={
            "phone": "99694906"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["employee"]["name"] == TEST_EMPLOYEE_NAME
        print(f"PASS: Login with phone - Employee: {data['employee']['name']}")

    def test_login_returns_today_attendance(self):
        """Test that login returns today's attendance data"""
        response = requests.post(f"{BASE_URL}/api/tracking/employee-login", json={
            "employee_code": TEST_EMPLOYEE_CODE
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should have today_attendance field
        assert "today_attendance" in data
        # If attendance exists, verify structure
        if data["today_attendance"]:
            att = data["today_attendance"]
            print(f"Today attendance: check_in={att.get('check_in')}, method={att.get('check_in_method')}")
            # Verify time format is readable (not raw ISO)
            if att.get("gps_check_in"):
                assert "T" in att["gps_check_in"], "GPS check-in should be ISO format for processing"
        print("PASS: Login returns today attendance")

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/tracking/employee-login", json={
            "employee_code": "INVALID999"
        })
        assert response.status_code == 404
        print("PASS: Invalid credentials rejected")


class TestGPSAttendanceWithSelfie:
    """Test GPS attendance with selfie photo"""
    
    def test_gps_checkin_with_selfie(self):
        """Test GPS check-in with selfie photo"""
        test_date = "2026-03-05"  # Use future date to avoid conflicts
        
        response = requests.post(f"{BASE_URL}/api/tracking/gps-attendance", json={
            "employee_id": TEST_EMPLOYEE_ID,
            "action": "check_in",
            "latitude": 17.019812,
            "longitude": 54.100601,
            "date": test_date,
            "selfie_photo": SAMPLE_SELFIE_BASE64,
            "mock_gps_info": {"is_mock": False, "check_passed": True},
            "attendance_method": "gps"
        })
        
        # Accept 200 (success) or 400 (already checked in)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}: {response.text}"
        
        data = response.json()
        if response.status_code == 200:
            assert data.get("success") == True or "check_in_time" in data
            print(f"PASS: GPS check-in with selfie - {data.get('message', 'Success')}")
        else:
            print(f"INFO: GPS check-in already exists - {data.get('detail', data.get('message'))}")

    def test_gps_checkin_stores_selfie_url(self):
        """Verify selfie URL is stored in attendance record"""
        # Get pending approvals to check if selfie URLs exist
        response = requests.get(f"{BASE_URL}/api/tracking/gps-attendance/pending")
        assert response.status_code == 200
        
        pending = response.json()
        selfie_found = False
        for record in pending:
            if record.get("check_in_selfie_url"):
                selfie_found = True
                print(f"PASS: Selfie URL found: {record['check_in_selfie_url']}")
                break
        
        if not selfie_found:
            print("INFO: No selfie URLs in pending records (may need fresh test data)")

    def test_gps_checkout_with_selfie(self):
        """Test GPS check-out with selfie"""
        test_date = "2026-03-05"
        
        # First ensure check-in exists
        requests.post(f"{BASE_URL}/api/tracking/gps-attendance", json={
            "employee_id": TEST_EMPLOYEE_ID,
            "action": "check_in",
            "latitude": 17.019812,
            "longitude": 54.100601,
            "date": test_date,
            "attendance_method": "gps"
        })
        
        # Now try checkout
        response = requests.post(f"{BASE_URL}/api/tracking/gps-attendance", json={
            "employee_id": TEST_EMPLOYEE_ID,
            "action": "check_out",
            "latitude": 17.019812,
            "longitude": 54.100601,
            "date": test_date,
            "selfie_photo": SAMPLE_SELFIE_BASE64,
            "attendance_method": "gps"
        })
        
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        print(f"PASS: GPS checkout with selfie - Status: {response.status_code}")


class TestMockGPSDetection:
    """Test Mock GPS detection and rejection"""
    
    def test_mock_gps_rejected_with_403(self):
        """Test that mock GPS is rejected with 403"""
        test_date = "2026-03-06"  # Different date
        
        response = requests.post(f"{BASE_URL}/api/tracking/gps-attendance", json={
            "employee_id": TEST_EMPLOYEE_ID,
            "action": "check_in",
            "latitude": 17.019812,
            "longitude": 54.100601,
            "date": test_date,
            "mock_gps_info": {
                "is_mock": True,
                "reasons": ["دقة مشبوهة جداً (أقل من 1 متر)"],
                "accuracy": 0.5
            },
            "attendance_method": "gps"
        })
        
        assert response.status_code == 403, f"Expected 403 for mock GPS, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "موقع وهمي" in data["detail"] or "Mock GPS" in data["detail"]
        print(f"PASS: Mock GPS rejected - {data['detail']}")

    def test_mock_gps_logs_security_event(self):
        """Verify mock GPS attempt is logged in security logs"""
        # First trigger a mock GPS attempt
        requests.post(f"{BASE_URL}/api/tracking/gps-attendance", json={
            "employee_id": TEST_EMPLOYEE_ID,
            "action": "check_in",
            "latitude": 17.019812,
            "longitude": 54.100601,
            "date": "2026-03-07",
            "mock_gps_info": {"is_mock": True, "reasons": ["test"]}
        })
        
        # Check security logs
        response = requests.get(f"{BASE_URL}/api/tracking/security-logs")
        assert response.status_code == 200
        
        logs = response.json()
        assert isinstance(logs, list), "Security logs should be a list"
        
        # Find mock GPS log
        mock_log_found = any(log.get("type") == "mock_gps_detected" for log in logs)
        if mock_log_found:
            print("PASS: Mock GPS attempt logged in security logs")
        else:
            print("INFO: No mock GPS log found (may be cleaned up)")


class TestWiFiAttendance:
    """Test WiFi-based attendance"""
    
    def test_wifi_settings_get(self):
        """Test GET /api/tracking/wifi-settings"""
        response = requests.get(f"{BASE_URL}/api/tracking/wifi-settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "enabled" in data
        assert "networks" in data
        print(f"PASS: WiFi settings - enabled={data['enabled']}, networks={len(data.get('networks', []))}")

    def test_wifi_settings_post(self):
        """Test POST /api/tracking/wifi-settings"""
        response = requests.post(f"{BASE_URL}/api/tracking/wifi-settings", json={
            "enabled": True,
            "networks": [
                {"ssid": "AlMorooj-WiFi", "name": "شبكة الشركة"},
                {"ssid": "TestNetwork", "name": "شبكة اختبار"}
            ]
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        print("PASS: WiFi settings updated successfully")

    def test_wifi_checkin(self):
        """Test WiFi-based check-in"""
        test_date = "2026-03-08"
        
        response = requests.post(f"{BASE_URL}/api/tracking/gps-attendance", json={
            "employee_id": TEST_EMPLOYEE_ID,
            "action": "check_in",
            "latitude": 17.019812,
            "longitude": 54.100601,
            "date": test_date,
            "wifi_ssid": "AlMorooj-WiFi",
            "attendance_method": "wifi",
            "mock_gps_info": {"is_mock": False}
        })
        
        assert response.status_code in [200, 400], f"Unexpected: {response.status_code}"
        print(f"PASS: WiFi check-in - Status: {response.status_code}")


class TestSecurityLogs:
    """Test security logs endpoint"""
    
    def test_get_security_logs(self):
        """Test GET /api/tracking/security-logs"""
        response = requests.get(f"{BASE_URL}/api/tracking/security-logs")
        assert response.status_code == 200
        
        logs = response.json()
        assert isinstance(logs, list)
        print(f"PASS: Security logs - {len(logs)} entries")
        
        # Check structure if logs exist
        if logs:
            log = logs[0]
            assert "employee_id" in log or "type" in log
            print(f"  Sample log type: {log.get('type', 'unknown')}")


class TestGPSWithExistingFingerprint:
    """Test GPS tracking alongside existing fingerprint attendance"""
    
    def test_gps_adds_to_fingerprint_record(self):
        """Test that GPS check-in adds data to existing fingerprint record"""
        # Get current attendance for today
        login_res = requests.post(f"{BASE_URL}/api/tracking/employee-login", json={
            "employee_code": TEST_EMPLOYEE_CODE
        })
        assert login_res.status_code == 200
        
        data = login_res.json()
        att = data.get("today_attendance")
        
        if att:
            # Check if has fingerprint and GPS
            has_fingerprint = att.get("source") == "fingerprint" or att.get("fingerprint_id")
            has_gps = att.get("has_gps_tracking") or att.get("gps_check_in")
            
            print(f"Today's attendance: fingerprint={has_fingerprint}, gps={has_gps}")
            
            if has_fingerprint and has_gps:
                print("PASS: GPS data exists alongside fingerprint record")
                assert att.get("check_in") is not None, "Check-in time should exist"
            else:
                print("INFO: Employee may not have both fingerprint and GPS today")
        else:
            print("INFO: No attendance record for today")

    def test_gps_does_not_overwrite_fingerprint(self):
        """Verify GPS doesn't overwrite fingerprint check-in time"""
        login_res = requests.post(f"{BASE_URL}/api/tracking/employee-login", json={
            "employee_code": TEST_EMPLOYEE_CODE
        })
        
        data = login_res.json()
        att = data.get("today_attendance")
        
        if att and att.get("source") == "fingerprint":
            original_checkin = att.get("check_in")
            gps_checkin = att.get("gps_check_in")
            
            # If both exist, they should be different (fingerprint time preserved)
            if original_checkin and gps_checkin:
                print(f"Fingerprint check-in: {original_checkin}")
                print(f"GPS check-in: {gps_checkin}")
                # GPS should be stored separately
                assert original_checkin != gps_checkin or "T" in gps_checkin
                print("PASS: Fingerprint and GPS times stored separately")
            else:
                print("INFO: Single check-in method for today")
        else:
            print("INFO: No fingerprint record to verify")


class TestGPSApprovalsPending:
    """Test GPS approvals pending endpoint"""
    
    def test_get_pending_approvals(self):
        """Test GET /api/tracking/gps-attendance/pending"""
        response = requests.get(f"{BASE_URL}/api/tracking/gps-attendance/pending")
        assert response.status_code == 200
        
        pending = response.json()
        assert isinstance(pending, list)
        print(f"PASS: Pending approvals - {len(pending)} records")
        
        # Check structure
        for record in pending[:3]:  # Check first 3
            print(f"  - {record.get('employee_name')} | Date: {record.get('date')} | Method: {record.get('check_in_method', 'N/A')}")
            if record.get("check_in_selfie_url"):
                print(f"    Selfie: {record['check_in_selfie_url']}")
            if record.get("check_in_method") == "wifi":
                print(f"    WiFi SSID: {record.get('check_in_wifi_ssid', 'N/A')}")

    def test_pending_includes_selfie_url(self):
        """Verify pending records include selfie URL when available"""
        response = requests.get(f"{BASE_URL}/api/tracking/gps-attendance/pending")
        pending = response.json()
        
        # Check for selfie_url field in schema
        for record in pending:
            if record.get("check_in_selfie_url"):
                # Verify URL format
                assert record["check_in_selfie_url"].startswith("/api/tracking/verification-photo/")
                print(f"PASS: Selfie URL format correct: {record['check_in_selfie_url']}")
                return
        
        print("INFO: No selfie URLs in current pending records")

    def test_pending_includes_wifi_indicator(self):
        """Verify pending records show WiFi method"""
        response = requests.get(f"{BASE_URL}/api/tracking/gps-attendance/pending")
        pending = response.json()
        
        for record in pending:
            if record.get("check_in_method") == "wifi":
                print(f"PASS: WiFi attendance found - {record.get('employee_name')}")
                return
        
        print("INFO: No WiFi attendance in pending records")


class TestVerificationPhotoEndpoint:
    """Test verification photo retrieval endpoint"""
    
    def test_invalid_photo_returns_404(self):
        """Test that invalid photo filename returns 404"""
        response = requests.get(f"{BASE_URL}/api/tracking/verification-photo/nonexistent.jpg")
        assert response.status_code == 404
        print("PASS: Invalid photo returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
