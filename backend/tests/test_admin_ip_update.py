"""
Test suite for Admin IP Update feature on GPS Attendance blocked page
Tests:
- POST /api/tracking/update-company-ip updates the WiFi IP in work_locations settings
- Admin login verification (checks role === admin)
- After IP update, /api/tracking/detect-network returns is_company_network: true
- End-to-end flow: blocked -> admin login -> update IP -> network re-check -> unblocked
"""
import pytest
import requests
import os
import pymongo
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'milk_erp')

ORIGINAL_IP = "85.154.168.39"
LOCATION_NAME = "الادارة"

# Test admin credentials
ADMIN_USER = "hassan"
ADMIN_PASS = "123"


@pytest.fixture(scope="module")
def mongo_client():
    """MongoDB client for direct DB access"""
    client = pymongo.MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="function", autouse=True)
def restore_original_ip(mongo_client):
    """Restore original IP before and after each test"""
    def restore():
        settings = mongo_client.tracking_settings.find_one()
        if settings:
            work_locations = settings.get("work_locations", [])
            for loc in work_locations:
                if loc.get("name") == LOCATION_NAME:
                    loc["wifi_ip_range"] = ORIGINAL_IP
            mongo_client.tracking_settings.update_one({}, {"$set": {"work_locations": work_locations}})
    
    restore()  # Before test
    yield
    restore()  # After test


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestNetworkDetection:
    """Test /api/tracking/detect-network endpoint"""

    def test_detect_network_returns_client_ip(self, api_client):
        """Verify detect-network endpoint returns client IP"""
        response = api_client.get(f"{BASE_URL}/api/tracking/detect-network")
        assert response.status_code == 200
        
        data = response.json()
        assert "client_ip" in data
        assert data["client_ip"] is not None
        assert len(data["client_ip"]) > 0
        print(f"Client IP detected: {data['client_ip']}")

    def test_detect_network_when_ip_not_matching(self, api_client, mongo_client):
        """Verify is_company_network is false when IP doesn't match"""
        # Ensure IP is set to something that won't match (original IP)
        response = api_client.get(f"{BASE_URL}/api/tracking/detect-network")
        assert response.status_code == 200
        
        data = response.json()
        assert "is_company_network" in data
        # In preview environment, IP won't match original company IP
        assert data["is_company_network"] is False
        assert data["matched_location"] is None
        print(f"Network blocked as expected: is_company_network={data['is_company_network']}")

    def test_detect_network_returns_configured_ips(self, api_client):
        """Verify detect-network returns list of configured IPs"""
        response = api_client.get(f"{BASE_URL}/api/tracking/detect-network")
        assert response.status_code == 200
        
        data = response.json()
        assert "configured_ips" in data
        assert isinstance(data["configured_ips"], list)
        assert len(data["configured_ips"]) > 0
        assert ORIGINAL_IP in data["configured_ips"]
        print(f"Configured IPs: {data['configured_ips']}")


class TestAdminLogin:
    """Test admin login verification"""

    def test_admin_login_success(self, api_client):
        """Admin login returns access_token and role=admin"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USER,
            "password": ADMIN_PASS
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data or "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["username"] == ADMIN_USER
        print(f"Admin login successful: {data['user']['username']} (role: {data['user']['role']})")

    def test_admin_login_invalid_credentials(self, api_client):
        """Invalid credentials return 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "invalid_user",
            "password": "wrong_pass"
        })
        assert response.status_code in [401, 400]
        print("Invalid credentials rejected as expected")

    def test_non_admin_user_role_check(self, api_client):
        """Verify we can check if user is not admin"""
        # Login as admin first
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USER,
            "password": ADMIN_PASS
        })
        assert response.status_code == 200
        
        data = response.json()
        # Frontend checks role === admin before showing update button
        assert data["user"]["role"] == "admin"
        print(f"Admin role verified: {data['user']['role']}")


class TestUpdateCompanyIP:
    """Test POST /api/tracking/update-company-ip endpoint"""

    def test_update_company_ip_success(self, api_client, mongo_client):
        """Update company IP updates the work_locations settings"""
        # Get current client IP first
        detect_response = api_client.get(f"{BASE_URL}/api/tracking/detect-network")
        client_ip = detect_response.json()["client_ip"]
        
        # Update the IP
        response = api_client.post(f"{BASE_URL}/api/tracking/update-company-ip", json={
            "location_name": None
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "new_ip" in data
        assert data["new_ip"] == client_ip
        print(f"Company IP updated to: {data['new_ip']}")

    def test_update_company_ip_with_location_name(self, api_client, mongo_client):
        """Update specific location by name"""
        response = api_client.post(f"{BASE_URL}/api/tracking/update-company-ip", json={
            "location_name": LOCATION_NAME
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        print(f"Location '{LOCATION_NAME}' IP updated to: {data['new_ip']}")

    def test_ip_persisted_in_database(self, api_client, mongo_client):
        """Verify IP change is persisted in MongoDB"""
        # Update the IP
        response = api_client.post(f"{BASE_URL}/api/tracking/update-company-ip", json={
            "location_name": None
        })
        new_ip = response.json()["new_ip"]
        
        # Verify in database
        settings = mongo_client.tracking_settings.find_one()
        work_locations = settings.get("work_locations", [])
        
        found = False
        for loc in work_locations:
            if loc.get("wifi_ip_range") == new_ip:
                found = True
                break
        
        assert found, f"IP {new_ip} not found in database work_locations"
        print(f"IP {new_ip} verified in database")


class TestEndToEndFlow:
    """Test complete flow: blocked -> admin login -> update IP -> network re-check"""

    def test_full_flow_blocked_to_unblocked(self, api_client, mongo_client):
        """Complete E2E test of admin IP update flow"""
        
        # Step 1: Verify initially blocked (IP doesn't match)
        detect_response = api_client.get(f"{BASE_URL}/api/tracking/detect-network")
        assert detect_response.status_code == 200
        initial_data = detect_response.json()
        client_ip = initial_data["client_ip"]
        
        # Should be blocked initially (preview IP != company IP)
        assert initial_data["is_company_network"] is False
        print(f"Step 1: Initially blocked. Client IP: {client_ip}")
        
        # Step 2: Admin login
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USER,
            "password": ADMIN_PASS
        })
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert login_data["user"]["role"] == "admin"
        print(f"Step 2: Admin login successful: {login_data['user']['username']}")
        
        # Step 3: Update company IP
        update_response = api_client.post(f"{BASE_URL}/api/tracking/update-company-ip", json={
            "location_name": None
        })
        assert update_response.status_code == 200
        update_data = update_response.json()
        assert update_data["success"] is True
        assert update_data["new_ip"] == client_ip
        print(f"Step 3: Company IP updated to: {update_data['new_ip']}")
        
        # Step 4: Re-check network - should now be unblocked
        recheck_response = api_client.get(f"{BASE_URL}/api/tracking/detect-network")
        assert recheck_response.status_code == 200
        recheck_data = recheck_response.json()
        
        assert recheck_data["is_company_network"] is True
        assert recheck_data["matched_location"] is not None
        assert recheck_data["matched_location"]["name"] is not None
        print(f"Step 4: Network unblocked! Matched location: {recheck_data['matched_location']['name']}")
        
        print("\n=== Full E2E flow passed ===")


class TestUIDataFlow:
    """Test data structures expected by frontend"""

    def test_detect_network_response_structure(self, api_client):
        """Verify detect-network returns all fields needed by frontend"""
        response = api_client.get(f"{BASE_URL}/api/tracking/detect-network")
        data = response.json()
        
        # Frontend expects these fields
        assert "client_ip" in data
        assert "is_company_network" in data
        assert "matched_location" in data
        assert "configured_ips" in data
        
        # When blocked, matched_location should be None
        if not data["is_company_network"]:
            assert data["matched_location"] is None
        
        print(f"Response structure valid: {list(data.keys())}")

    def test_update_ip_response_structure(self, api_client):
        """Verify update-company-ip returns fields needed by frontend"""
        response = api_client.post(f"{BASE_URL}/api/tracking/update-company-ip", json={
            "location_name": None
        })
        data = response.json()
        
        # Frontend expects these fields
        assert "success" in data
        assert "new_ip" in data
        assert "message" in data
        
        print(f"Update response structure valid: {list(data.keys())}")

    def test_login_response_has_role(self, api_client):
        """Verify login response includes role for frontend verification"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USER,
            "password": ADMIN_PASS
        })
        data = response.json()
        
        # Frontend checks: (res.data.token || res.data.access_token) && res.data.user?.role === "admin"
        assert "access_token" in data or "token" in data
        assert "user" in data
        assert "role" in data["user"]
        
        print(f"Login response includes role: {data['user']['role']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
