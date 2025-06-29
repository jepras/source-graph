import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.graph.item_service import ItemService

client = TestClient(app)


class TestItemUpdateAPI:
    """Integration tests for item update API endpoints"""

    @pytest.fixture
    def item_service(self):
        return ItemService()

    @pytest.fixture
    def sample_item(self, item_service):
        """Create a sample item for testing"""
        return item_service.create_item(
            name="API Test Item",
            description="Original API description",
            year=1990,
            auto_detected_type="song",
            confidence_score=0.7,
            verification_status="ai_generated",
        )

    def test_update_item_name_api(self, sample_item):
        """Test updating item name via API"""
        update_data = {"name": "Updated API Test Item"}

        response = client.put(f"/api/items/{sample_item.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["item"]["name"] == "Updated API Test Item"
        assert data["item"]["description"] == "Original API description"
        assert data["item"]["year"] == 1990

    def test_update_item_description_api(self, sample_item):
        """Test updating item description via API"""
        update_data = {"description": "Updated API description"}

        response = client.put(f"/api/items/{sample_item.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["item"]["name"] == "API Test Item"
        assert data["item"]["description"] == "Updated API description"

    def test_update_item_year_api(self, sample_item):
        """Test updating item year via API"""
        update_data = {"year": 2005}

        response = client.put(f"/api/items/{sample_item.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["item"]["year"] == 2005

    def test_update_multiple_fields_api(self, sample_item):
        """Test updating multiple fields via API"""
        update_data = {
            "name": "Multi Updated API Item",
            "description": "Multi updated API description",
            "year": 2015,
            "auto_detected_type": "movie",
        }

        response = client.put(f"/api/items/{sample_item.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["item"]["name"] == "Multi Updated API Item"
        assert data["item"]["description"] == "Multi updated API description"
        assert data["item"]["year"] == 2015
        assert data["item"]["auto_detected_type"] == "movie"

    def test_update_nonexistent_item_api(self):
        """Test updating a non-existent item via API"""
        update_data = {"name": "New Name"}

        response = client.put("/api/items/nonexistent-id", json=update_data)

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()

    def test_update_with_empty_data_api(self, sample_item):
        """Test updating with empty data via API"""
        update_data = {}

        response = client.put(f"/api/items/{sample_item.id}", json=update_data)

        assert response.status_code == 400
        data = response.json()
        assert "no valid fields" in data["detail"].lower()

    def test_update_with_invalid_data_api(self, sample_item):
        """Test updating with invalid data via API"""
        update_data = {"year": "invalid_year"}  # year should be integer

        response = client.put(f"/api/items/{sample_item.id}", json=update_data)

        assert response.status_code == 422  # Validation error

    def test_update_with_partial_data_api(self, sample_item):
        """Test updating with partial data via API"""
        update_data = {"name": "Partial Update"}

        response = client.put(f"/api/items/{sample_item.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["item"]["name"] == "Partial Update"
        # Other fields should remain unchanged
        assert data["item"]["description"] == "Original API description"
        assert data["item"]["year"] == 1990

    def test_update_verification_status_api(self, sample_item):
        """Test updating verification status via API"""
        update_data = {"verification_status": "user_verified"}

        response = client.put(f"/api/items/{sample_item.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["item"]["verification_status"] == "user_verified"

    def test_update_confidence_score_api(self, sample_item):
        """Test updating confidence score via API"""
        update_data = {"confidence_score": 0.95}

        response = client.put(f"/api/items/{sample_item.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["item"]["confidence_score"] == 0.95
