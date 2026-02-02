"""
Test Driver Tasks Delete API and Vehicle Fleet Integration
Tests for iteration 27 features:
1. DELETE /api/operations/driver-tasks/{task_id} - Delete driver task
2. GET /api/operations/vehicles - Vehicle fleet for driver task selection
3. POST /api/operations/driver-tasks - Create driver task with vehicle selection
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDriverTasksDelete:
    """Test driver task delete functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin1111"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_vehicles_list(self):
        """Test GET /api/operations/vehicles - Get vehicle fleet"""
        response = requests.get(f"{BASE_URL}/api/operations/vehicles", headers=self.headers)
        assert response.status_code == 200, f"Failed to get vehicles: {response.text}"
        vehicles = response.json()
        assert isinstance(vehicles, list), "Vehicles should be a list"
        print(f"✓ GET /api/operations/vehicles - Found {len(vehicles)} vehicles")
        return vehicles
    
    def test_get_driver_tasks(self):
        """Test GET /api/operations/driver-tasks - Get driver tasks"""
        response = requests.get(f"{BASE_URL}/api/operations/driver-tasks", headers=self.headers)
        assert response.status_code == 200, f"Failed to get driver tasks: {response.text}"
        tasks = response.json()
        assert isinstance(tasks, list), "Tasks should be a list"
        print(f"✓ GET /api/operations/driver-tasks - Found {len(tasks)} tasks")
        return tasks
    
    def test_create_driver_task_with_vehicle(self):
        """Test POST /api/operations/driver-tasks - Create task with vehicle from fleet"""
        # First get available vehicles
        vehicles_response = requests.get(f"{BASE_URL}/api/operations/vehicles", headers=self.headers)
        vehicles = vehicles_response.json()
        
        # Use first available vehicle or manual entry
        vehicle_plate = "TEST-1234"
        vehicle_type = "truck"
        if vehicles:
            available = [v for v in vehicles if v.get('status') in ['available', 'operational', None]]
            if available:
                vehicle_plate = available[0].get('plate_number', 'TEST-1234')
                vehicle_type = available[0].get('vehicle_type', 'truck')
        
        task_data = {
            "driver_id": str(uuid.uuid4()),
            "driver_name": "TEST_سائق اختبار",
            "transport_type": "camel_milk",
            "transport_date": "2026-01-15",
            "transport_time": "08:00",
            "from_location": "حجيف",
            "to_destination": "شركة الصفوة",
            "quantity": 500,
            "vehicle_plate": vehicle_plate,
            "vehicle_type": vehicle_type,
            "notes": "مهمة اختبار للحذف"
        }
        
        response = requests.post(f"{BASE_URL}/api/operations/driver-tasks", 
                                json=task_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create task: {response.text}"
        result = response.json()
        assert "task" in result, "Response should contain task"
        task_id = result["task"]["id"]
        print(f"✓ POST /api/operations/driver-tasks - Created task {task_id}")
        return task_id
    
    def test_delete_driver_task(self):
        """Test DELETE /api/operations/driver-tasks/{task_id} - Delete task"""
        # First create a task to delete
        task_id = self.test_create_driver_task_with_vehicle()
        
        # Now delete it
        response = requests.delete(f"{BASE_URL}/api/operations/driver-tasks/{task_id}", 
                                  headers=self.headers)
        assert response.status_code == 200, f"Failed to delete task: {response.text}"
        result = response.json()
        assert "message" in result, "Response should contain message"
        print(f"✓ DELETE /api/operations/driver-tasks/{task_id} - Task deleted successfully")
        
        # Verify task is deleted
        tasks_response = requests.get(f"{BASE_URL}/api/operations/driver-tasks", headers=self.headers)
        tasks = tasks_response.json()
        task_ids = [t.get('id') for t in tasks]
        assert task_id not in task_ids, "Deleted task should not exist"
        print(f"✓ Verified task {task_id} no longer exists")
    
    def test_delete_nonexistent_task(self):
        """Test DELETE with non-existent task ID returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/operations/driver-tasks/{fake_id}", 
                                  headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ DELETE non-existent task returns 404 as expected")
    
    def test_driver_tasks_summary(self):
        """Test GET /api/operations/driver-tasks/summary - Summary by milk type"""
        response = requests.get(f"{BASE_URL}/api/operations/driver-tasks/summary", headers=self.headers)
        assert response.status_code == 200, f"Failed to get summary: {response.text}"
        summary = response.json()
        
        # Verify summary structure includes milk types
        assert "camel_milk_tasks" in summary, "Summary should include camel_milk_tasks"
        assert "cow_milk_tasks" in summary, "Summary should include cow_milk_tasks"
        assert "sheep_milk_tasks" in summary, "Summary should include sheep_milk_tasks"
        assert "total_milk_quantity" in summary, "Summary should include total_milk_quantity"
        print(f"✓ GET /api/operations/driver-tasks/summary - Summary structure correct")
        print(f"  - Camel milk tasks: {summary['camel_milk_tasks']}")
        print(f"  - Cow milk tasks: {summary['cow_milk_tasks']}")
        print(f"  - Sheep milk tasks: {summary['sheep_milk_tasks']}")
        print(f"  - Total milk: {summary['total_milk_quantity']} liters")


class TestVehicleFleetIntegration:
    """Test vehicle fleet integration with driver tasks"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin1111"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_vehicle(self):
        """Test POST /api/operations/vehicles - Create vehicle for fleet"""
        vehicle_data = {
            "vehicle_type": "tanker",
            "brand": "TEST_Toyota",
            "model": "Hilux",
            "plate_number": f"TEST-{uuid.uuid4().hex[:4].upper()}",
            "year": 2024,
            "status": "available"
        }
        
        response = requests.post(f"{BASE_URL}/api/operations/vehicles", 
                                json=vehicle_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create vehicle: {response.text}"
        vehicle = response.json()
        assert "id" in vehicle, "Vehicle should have ID"
        print(f"✓ POST /api/operations/vehicles - Created vehicle {vehicle.get('plate_number')}")
        return vehicle
    
    def test_vehicles_available_for_driver_tasks(self):
        """Test that vehicles are available for selection in driver tasks"""
        response = requests.get(f"{BASE_URL}/api/operations/vehicles", headers=self.headers)
        assert response.status_code == 200
        vehicles = response.json()
        
        # Check for available/operational vehicles
        available = [v for v in vehicles if v.get('status') in ['available', 'operational', None]]
        print(f"✓ Found {len(available)} available vehicles for driver task selection")
        
        for v in available[:5]:  # Show first 5
            print(f"  - {v.get('plate_number')} - {v.get('brand')} {v.get('model')} ({v.get('vehicle_type')})")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "yasir",
            "password": "admin1111"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_cleanup_test_tasks(self):
        """Cleanup TEST_ prefixed driver tasks"""
        response = requests.get(f"{BASE_URL}/api/operations/driver-tasks", headers=self.headers)
        if response.status_code == 200:
            tasks = response.json()
            test_tasks = [t for t in tasks if t.get('driver_name', '').startswith('TEST_')]
            for task in test_tasks:
                requests.delete(f"{BASE_URL}/api/operations/driver-tasks/{task['id']}", 
                              headers=self.headers)
            print(f"✓ Cleaned up {len(test_tasks)} test driver tasks")
