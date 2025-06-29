import pytest
from app.services.graph.item_service import ItemService
from app.models.item import Item, UpdateItemRequest


class TestItemUpdate:
    """Test cases for item update functionality"""

    @pytest.fixture
    def item_service(self):
        return ItemService()

    @pytest.fixture
    def sample_item(self, item_service):
        """Create a sample item for testing"""
        return item_service.create_item(
            name="Test Item",
            description="Original description",
            year=1995,
            auto_detected_type="song",
            confidence_score=0.8,
            verification_status="ai_generated",
        )

    def test_update_item_name(self, item_service, sample_item):
        """Test updating item name"""
        update_data = {"name": "Updated Test Item"}
        updated_item = item_service.update_item(sample_item.id, update_data)

        assert updated_item is not None
        assert updated_item.name == "Updated Test Item"
        assert updated_item.description == "Original description"
        assert updated_item.year == 1995

    def test_update_item_description(self, item_service, sample_item):
        """Test updating item description"""
        update_data = {"description": "Updated description"}
        updated_item = item_service.update_item(sample_item.id, update_data)

        assert updated_item is not None
        assert updated_item.name == "Test Item"
        assert updated_item.description == "Updated description"
        assert updated_item.year == 1995

    def test_update_item_year(self, item_service, sample_item):
        """Test updating item year"""
        update_data = {"year": 2000}
        updated_item = item_service.update_item(sample_item.id, update_data)

        assert updated_item is not None
        assert updated_item.name == "Test Item"
        assert updated_item.description == "Original description"
        assert updated_item.year == 2000

    def test_update_item_type(self, item_service, sample_item):
        """Test updating item type"""
        update_data = {"auto_detected_type": "movie"}
        updated_item = item_service.update_item(sample_item.id, update_data)

        assert updated_item is not None
        assert updated_item.name == "Test Item"
        assert updated_item.auto_detected_type == "movie"

    def test_update_multiple_fields(self, item_service, sample_item):
        """Test updating multiple fields at once"""
        update_data = {
            "name": "Multi Updated Item",
            "description": "Multi updated description",
            "year": 2010,
            "auto_detected_type": "innovation",
        }
        updated_item = item_service.update_item(sample_item.id, update_data)

        assert updated_item is not None
        assert updated_item.name == "Multi Updated Item"
        assert updated_item.description == "Multi updated description"
        assert updated_item.year == 2010
        assert updated_item.auto_detected_type == "innovation"

    def test_update_with_none_values(self, item_service, sample_item):
        """Test that None values are ignored in updates"""
        update_data = {"name": "Updated Name", "description": None, "year": None}
        updated_item = item_service.update_item(sample_item.id, update_data)

        assert updated_item is not None
        assert updated_item.name == "Updated Name"
        assert (
            updated_item.description == "Original description"
        )  # Should remain unchanged
        assert updated_item.year == 1995  # Should remain unchanged

    def test_update_nonexistent_item(self, item_service):
        """Test updating a non-existent item"""
        update_data = {"name": "New Name"}
        updated_item = item_service.update_item("nonexistent-id", update_data)

        assert updated_item is None

    def test_update_empty_data(self, item_service, sample_item):
        """Test updating with empty data (should return original item)"""
        update_data = {}
        updated_item = item_service.update_item(sample_item.id, update_data)

        assert updated_item is not None
        assert updated_item.name == "Test Item"
        assert updated_item.description == "Original description"

    def test_updateitemrequest_model(self):
        """Test the UpdateItemRequest Pydantic model"""
        # Test with all fields
        request = UpdateItemRequest(
            name="New Name",
            description="New Description",
            year=2020,
            auto_detected_type="movie",
            confidence_score=0.9,
            verification_status="user_verified",
        )

        assert request.name == "New Name"
        assert request.description == "New Description"
        assert request.year == 2020
        assert request.auto_detected_type == "movie"
        assert request.confidence_score == 0.9
        assert request.verification_status == "user_verified"

        # Test with partial fields
        partial_request = UpdateItemRequest(name="Partial Name")
        assert partial_request.name == "Partial Name"
        assert partial_request.description is None
        assert partial_request.year is None
