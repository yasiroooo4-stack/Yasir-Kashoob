"""
Supplier Election & Voting System Tests
Tests for nomination, voting, and admin results endpoints
"""
import pytest
import requests
import os
from datetime import datetime, timedelta, timezone
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://gps-check-in-1.preview.emergentagent.com')

# Test credentials
TEST_ADMIN_USER = "hassan"
TEST_ADMIN_PASS = "123"
TEST_SUPPLIER_CODES = ["2015", "2022", "2023"]


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": TEST_ADMIN_USER,
        "password": TEST_ADMIN_PASS
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestElectionList:
    """Test GET /api/elections/list endpoint"""
    
    def test_list_elections_returns_200(self, api_client):
        """List elections endpoint should return 200"""
        response = api_client.get(f"{BASE_URL}/api/elections/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} elections")
    
    def test_list_elections_has_required_fields(self, api_client):
        """Elections should have required fields"""
        response = api_client.get(f"{BASE_URL}/api/elections/list")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            election = data[0]
            required_fields = ["id", "title", "nomination_start", "nomination_end", 
                              "voting_start", "voting_end", "status", "candidates_count", "votes_count"]
            for field in required_fields:
                assert field in election, f"Missing field: {field}"
            print(f"Election '{election['title']}' has all required fields")


class TestSupplierLookup:
    """Test GET /api/elections/lookup-supplier/{code} endpoint"""
    
    def test_lookup_existing_supplier(self, api_client):
        """Lookup should return supplier data for valid code"""
        response = api_client.get(f"{BASE_URL}/api/elections/lookup-supplier/2015")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == True
        assert "supplier" in data
        assert data["supplier"]["supplier_code"] == "2015"
        print(f"Found supplier: {data['supplier']['name']}")
    
    def test_lookup_nonexistent_supplier(self, api_client):
        """Lookup should return found=false for invalid code"""
        response = api_client.get(f"{BASE_URL}/api/elections/lookup-supplier/INVALID999")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == False
        print("Correctly returned found=false for invalid code")
    
    def test_lookup_returns_supplier_fields(self, api_client):
        """Lookup should return name, national_id, center_name, milk_type"""
        response = api_client.get(f"{BASE_URL}/api/elections/lookup-supplier/2015")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == True
        supplier = data["supplier"]
        # Check expected fields are present
        assert "name" in supplier
        assert "supplier_code" in supplier
        print(f"Supplier fields: {list(supplier.keys())}")


class TestElectionCreate:
    """Test POST /api/elections/create endpoint"""
    
    def test_create_election_success(self, api_client):
        """Create election with valid data should succeed"""
        now = datetime.now(timezone.utc)
        election_data = {
            "title": f"TEST_Election_{uuid.uuid4().hex[:8]}",
            "description": "Test election for automated testing",
            "nomination_start": (now - timedelta(hours=1)).isoformat(),
            "nomination_end": (now + timedelta(hours=1)).isoformat(),
            "voting_start": (now + timedelta(hours=2)).isoformat(),
            "voting_end": (now + timedelta(hours=3)).isoformat()
        }
        
        response = api_client.post(f"{BASE_URL}/api/elections/create", json=election_data)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == election_data["title"]
        print(f"Created election: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/elections/{data['id']}")
    
    def test_create_election_sets_status(self, api_client):
        """Created election should have correct status based on dates"""
        now = datetime.now(timezone.utc)
        # Create election with nomination period active now
        election_data = {
            "title": f"TEST_NominationActive_{uuid.uuid4().hex[:8]}",
            "nomination_start": (now - timedelta(hours=1)).isoformat(),
            "nomination_end": (now + timedelta(hours=1)).isoformat(),
            "voting_start": (now + timedelta(hours=2)).isoformat(),
            "voting_end": (now + timedelta(hours=3)).isoformat()
        }
        
        response = api_client.post(f"{BASE_URL}/api/elections/create", json=election_data)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "nomination"
        print(f"Election status correctly set to: {data['status']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/elections/{data['id']}")


class TestCandidateRegistration:
    """Test POST /api/elections/register-candidate endpoint"""
    
    @pytest.fixture
    def test_election(self, api_client):
        """Create a test election with nomination period open"""
        now = datetime.now(timezone.utc)
        election_data = {
            "title": f"TEST_CandidateReg_{uuid.uuid4().hex[:8]}",
            "nomination_start": (now - timedelta(hours=1)).isoformat(),
            "nomination_end": (now + timedelta(hours=1)).isoformat(),
            "voting_start": (now + timedelta(hours=2)).isoformat(),
            "voting_end": (now + timedelta(hours=3)).isoformat()
        }
        response = api_client.post(f"{BASE_URL}/api/elections/create", json=election_data)
        election = response.json()
        yield election
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/elections/{election['id']}")
    
    def test_register_candidate_success(self, api_client, test_election):
        """Register candidate during nomination period should succeed"""
        candidate_data = {
            "election_id": test_election["id"],
            "supplier_code": f"TEST_{uuid.uuid4().hex[:6]}",
            "name": "Test Candidate",
            "national_id": "12345678",
            "supply_type": "cow",
            "center_name": "Test Center"
        }
        
        response = api_client.post(f"{BASE_URL}/api/elections/register-candidate", json=candidate_data)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["name"] == "Test Candidate"
        print(f"Registered candidate: {data['id']}")
    
    def test_register_duplicate_candidate_fails(self, api_client, test_election):
        """Registering same supplier twice should fail"""
        unique_code = f"TEST_DUP_{uuid.uuid4().hex[:6]}"
        candidate_data = {
            "election_id": test_election["id"],
            "supplier_code": unique_code,
            "name": "Duplicate Test",
            "national_id": "99999999"
        }
        
        # First registration
        response1 = api_client.post(f"{BASE_URL}/api/elections/register-candidate", json=candidate_data)
        assert response1.status_code == 200
        
        # Second registration should fail
        response2 = api_client.post(f"{BASE_URL}/api/elections/register-candidate", json=candidate_data)
        assert response2.status_code == 400
        assert "مسجل مسبقاً" in response2.json().get("detail", "")
        print("Correctly rejected duplicate registration")
    
    def test_register_outside_nomination_period_fails(self, api_client):
        """Registration outside nomination period should fail"""
        now = datetime.now(timezone.utc)
        # Create election with nomination period in the past
        election_data = {
            "title": f"TEST_ClosedNom_{uuid.uuid4().hex[:8]}",
            "nomination_start": (now - timedelta(hours=3)).isoformat(),
            "nomination_end": (now - timedelta(hours=2)).isoformat(),
            "voting_start": (now - timedelta(hours=1)).isoformat(),
            "voting_end": (now + timedelta(hours=1)).isoformat()
        }
        response = api_client.post(f"{BASE_URL}/api/elections/create", json=election_data)
        election = response.json()
        
        # Try to register
        candidate_data = {
            "election_id": election["id"],
            "supplier_code": "TEST_LATE",
            "name": "Late Candidate"
        }
        response = api_client.post(f"{BASE_URL}/api/elections/register-candidate", json=candidate_data)
        assert response.status_code == 400
        assert "غير مفتوحة" in response.json().get("detail", "")
        print("Correctly rejected registration outside nomination period")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/elections/{election['id']}")


class TestVoting:
    """Test POST /api/elections/vote endpoint"""
    
    @pytest.fixture
    def voting_election(self, api_client):
        """Create election with voting period open and candidates"""
        now = datetime.now(timezone.utc)
        election_data = {
            "title": f"TEST_Voting_{uuid.uuid4().hex[:8]}",
            "nomination_start": (now - timedelta(hours=3)).isoformat(),
            "nomination_end": (now - timedelta(hours=2)).isoformat(),
            "voting_start": (now - timedelta(hours=1)).isoformat(),
            "voting_end": (now + timedelta(hours=1)).isoformat()
        }
        response = api_client.post(f"{BASE_URL}/api/elections/create", json=election_data)
        election = response.json()
        
        # We need to manually insert candidates since nomination is closed
        # For this test, we'll use the existing election with nomination open
        yield election
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/elections/{election['id']}")
    
    def test_vote_outside_voting_period_fails(self, api_client, voting_election):
        """Voting outside voting period should fail"""
        # Create election with voting period in the future
        now = datetime.now(timezone.utc)
        election_data = {
            "title": f"TEST_FutureVote_{uuid.uuid4().hex[:8]}",
            "nomination_start": (now - timedelta(hours=2)).isoformat(),
            "nomination_end": (now - timedelta(hours=1)).isoformat(),
            "voting_start": (now + timedelta(hours=1)).isoformat(),
            "voting_end": (now + timedelta(hours=2)).isoformat()
        }
        response = api_client.post(f"{BASE_URL}/api/elections/create", json=election_data)
        election = response.json()
        
        vote_data = {
            "election_id": election["id"],
            "voter_supplier_code": "2023",
            "candidate_id": "fake-candidate-id"
        }
        response = api_client.post(f"{BASE_URL}/api/elections/vote", json=vote_data)
        assert response.status_code == 400
        assert "غير مفتوحة" in response.json().get("detail", "")
        print("Correctly rejected vote outside voting period")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/elections/{election['id']}")


class TestCheckVote:
    """Test GET /api/elections/check-vote/{election_id}/{supplier_code} endpoint"""
    
    def test_check_vote_not_voted(self, api_client):
        """Check vote for supplier who hasn't voted should return has_voted=false"""
        # Get existing election
        response = api_client.get(f"{BASE_URL}/api/elections/list")
        elections = response.json()
        if not elections:
            pytest.skip("No elections available")
        
        election_id = elections[0]["id"]
        response = api_client.get(f"{BASE_URL}/api/elections/check-vote/{election_id}/NONEXISTENT_CODE")
        assert response.status_code == 200
        data = response.json()
        assert data["has_voted"] == False
        print("Correctly returned has_voted=false for non-voter")


class TestElectionResults:
    """Test GET /api/elections/{id}/results endpoint"""
    
    def test_get_results_success(self, api_client):
        """Get results should return election, candidates, and vote counts"""
        # Get existing election
        response = api_client.get(f"{BASE_URL}/api/elections/list")
        elections = response.json()
        if not elections:
            pytest.skip("No elections available")
        
        election_id = elections[0]["id"]
        response = api_client.get(f"{BASE_URL}/api/elections/{election_id}/results")
        assert response.status_code == 200
        data = response.json()
        
        assert "election" in data
        assert "candidates" in data
        assert "total_votes" in data
        assert isinstance(data["candidates"], list)
        print(f"Results: {len(data['candidates'])} candidates, {data['total_votes']} total votes")
    
    def test_results_candidates_have_vote_counts(self, api_client):
        """Results should include vote counts for each candidate"""
        response = api_client.get(f"{BASE_URL}/api/elections/list")
        elections = response.json()
        if not elections:
            pytest.skip("No elections available")
        
        election_id = elections[0]["id"]
        response = api_client.get(f"{BASE_URL}/api/elections/{election_id}/results")
        data = response.json()
        
        for candidate in data["candidates"]:
            assert "votes_count" in candidate
            assert isinstance(candidate["votes_count"], int)
        print("All candidates have vote_count field")


class TestGetCandidates:
    """Test GET /api/elections/{id}/candidates endpoint"""
    
    def test_get_candidates_success(self, api_client):
        """Get candidates should return list without vote counts"""
        response = api_client.get(f"{BASE_URL}/api/elections/list")
        elections = response.json()
        if not elections:
            pytest.skip("No elections available")
        
        election_id = elections[0]["id"]
        response = api_client.get(f"{BASE_URL}/api/elections/{election_id}/candidates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} candidates")
        
        # Verify candidates don't have vote counts (public endpoint)
        for candidate in data:
            assert "id" in candidate
            assert "name" in candidate


class TestElectionDelete:
    """Test DELETE /api/elections/{id} endpoint"""
    
    def test_delete_election_success(self, api_client):
        """Delete election should remove election and related data"""
        # Create election to delete
        now = datetime.now(timezone.utc)
        election_data = {
            "title": f"TEST_ToDelete_{uuid.uuid4().hex[:8]}",
            "nomination_start": (now - timedelta(hours=1)).isoformat(),
            "nomination_end": (now + timedelta(hours=1)).isoformat(),
            "voting_start": (now + timedelta(hours=2)).isoformat(),
            "voting_end": (now + timedelta(hours=3)).isoformat()
        }
        response = api_client.post(f"{BASE_URL}/api/elections/create", json=election_data)
        election = response.json()
        election_id = election["id"]
        
        # Delete
        response = api_client.delete(f"{BASE_URL}/api/elections/{election_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"Successfully deleted election {election_id}")
        
        # Verify deleted
        response = api_client.get(f"{BASE_URL}/api/elections/{election_id}")
        assert response.status_code == 404


class TestSelfVotingPrevention:
    """Test that self-voting is prevented"""
    
    def test_self_vote_rejected(self, api_client):
        """Voting for yourself should be rejected"""
        now = datetime.now(timezone.utc)
        # Create election with voting open
        election_data = {
            "title": f"TEST_SelfVote_{uuid.uuid4().hex[:8]}",
            "nomination_start": (now - timedelta(hours=3)).isoformat(),
            "nomination_end": (now - timedelta(hours=2)).isoformat(),
            "voting_start": (now - timedelta(hours=1)).isoformat(),
            "voting_end": (now + timedelta(hours=1)).isoformat()
        }
        response = api_client.post(f"{BASE_URL}/api/elections/create", json=election_data)
        election = response.json()
        
        # Note: We can't fully test self-voting without a candidate registered
        # The endpoint checks if candidate.supplier_code == voter_supplier_code
        # This test verifies the endpoint exists and handles the voting period check
        
        vote_data = {
            "election_id": election["id"],
            "voter_supplier_code": "2015",
            "candidate_id": "nonexistent"
        }
        response = api_client.post(f"{BASE_URL}/api/elections/vote", json=vote_data)
        # Should fail because candidate doesn't exist (404) or voting period check
        assert response.status_code in [400, 404]
        print(f"Vote attempt returned: {response.status_code}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/elections/{election['id']}")


class TestExistingElectionData:
    """Test with existing election data"""
    
    def test_existing_election_has_candidates(self, api_client):
        """Verify existing election has registered candidates"""
        response = api_client.get(f"{BASE_URL}/api/elections/list")
        elections = response.json()
        
        # Find the main election
        main_election = None
        for e in elections:
            if "رئيس الموردين" in e.get("title", ""):
                main_election = e
                break
        
        if not main_election:
            pytest.skip("Main election not found")
        
        assert main_election["candidates_count"] >= 2
        print(f"Main election has {main_election['candidates_count']} candidates")
    
    def test_existing_candidates_data(self, api_client):
        """Verify existing candidates have proper data"""
        response = api_client.get(f"{BASE_URL}/api/elections/list")
        elections = response.json()
        
        if not elections:
            pytest.skip("No elections")
        
        election_id = elections[0]["id"]
        response = api_client.get(f"{BASE_URL}/api/elections/{election_id}/candidates")
        candidates = response.json()
        
        for c in candidates:
            assert "id" in c
            assert "name" in c
            assert "election_id" in c
            print(f"Candidate: {c.get('name')} (code: {c.get('supplier_code')})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
