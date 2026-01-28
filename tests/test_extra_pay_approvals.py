"""
Test Extra Pay Approvals APIs
Tests for the new extra pay approval feature for weekend/holiday work
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://inventory-plus-93.preview.emergentagent.com')

class TestExtraPayApprovals:
    """Extra Pay Approval endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_pending_extra_pay_requests(self):
        """Test GET /api/hr/attendance/pending-extra-pay"""
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/pending-extra-pay",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify structure of returned records
        if len(data) > 0:
            record = data[0]
            assert "id" in record
            assert "employee_name" in record
            assert "date" in record
            assert "is_weekend" in record or "is_holiday" in record
            print(f"Found {len(data)} pending extra pay requests")
    
    def test_get_pending_extra_pay_with_date_filter(self):
        """Test GET /api/hr/attendance/pending-extra-pay with date filters"""
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/pending-extra-pay",
            params={"start_date": "2025-12-01", "end_date": "2025-12-31"},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} pending requests in December 2025")
    
    def test_approve_extra_pay_request(self):
        """Test POST /api/hr/attendance/{id}/approve-extra-pay"""
        # First get a pending request
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/pending-extra-pay",
            headers=self.headers
        )
        assert response.status_code == 200
        pending = response.json()
        
        if len(pending) == 0:
            pytest.skip("No pending requests to approve")
        
        # Find a request that hasn't been approved or rejected
        test_record = None
        for record in pending:
            if not record.get("extra_pay_approved") and not record.get("extra_pay_rejected"):
                test_record = record
                break
        
        if not test_record:
            pytest.skip("No unapproved requests found")
        
        # Approve the request
        response = requests.post(
            f"{BASE_URL}/api/hr/attendance/{test_record['id']}/approve-extra-pay",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "الموافقة" in data["message"] or "success" in data["message"].lower()
        print(f"Approved extra pay for {test_record['employee_name']}")
    
    def test_reject_extra_pay_request(self):
        """Test POST /api/hr/attendance/{id}/reject-extra-pay"""
        # First get a pending request
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/pending-extra-pay",
            headers=self.headers
        )
        assert response.status_code == 200
        pending = response.json()
        
        if len(pending) == 0:
            pytest.skip("No pending requests to reject")
        
        # Find a request that hasn't been approved or rejected
        test_record = None
        for record in pending:
            if not record.get("extra_pay_approved") and not record.get("extra_pay_rejected"):
                test_record = record
                break
        
        if not test_record:
            pytest.skip("No unapproved requests found")
        
        # Reject the request
        response = requests.post(
            f"{BASE_URL}/api/hr/attendance/{test_record['id']}/reject-extra-pay",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "رفض" in data["message"] or "reject" in data["message"].lower()
        print(f"Rejected extra pay for {test_record['employee_name']}")
    
    def test_bulk_approve_extra_pay_requests(self):
        """Test POST /api/hr/attendance/bulk-approve-extra-pay"""
        # First get pending requests
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/pending-extra-pay",
            headers=self.headers
        )
        assert response.status_code == 200
        pending = response.json()
        
        if len(pending) < 2:
            pytest.skip("Not enough pending requests for bulk approve test")
        
        # Get IDs of first 2 unapproved requests
        ids_to_approve = []
        for record in pending:
            if not record.get("extra_pay_approved") and not record.get("extra_pay_rejected"):
                ids_to_approve.append(record["id"])
                if len(ids_to_approve) >= 2:
                    break
        
        if len(ids_to_approve) < 2:
            pytest.skip("Not enough unapproved requests found")
        
        # Bulk approve
        response = requests.post(
            f"{BASE_URL}/api/hr/attendance/bulk-approve-extra-pay",
            json=ids_to_approve,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"Bulk approved {len(ids_to_approve)} records: {data['message']}")
    
    def test_approve_nonexistent_request(self):
        """Test approving a non-existent request returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/hr/attendance/nonexistent-id-12345/approve-extra-pay",
            headers=self.headers
        )
        
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent request")


class TestUserPermissions:
    """Test that admin role has proper permissions"""
    
    def test_admin_user_has_access(self):
        """Test that admin user can access extra pay APIs"""
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin123"
        })
        assert response.status_code == 200
        
        user_data = response.json()["user"]
        assert user_data["role"] == "admin"
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test access to pending extra pay
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/pending-extra-pay",
            headers=headers
        )
        assert response.status_code == 200
        print("Admin user has access to extra pay APIs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
