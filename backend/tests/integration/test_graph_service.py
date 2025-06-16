import pytest
from typing import List
from app.services.graph.graph_service import GraphService
from app.models.structured import StructuredOutput, StructuredInfluence
from app.models.item import Item, Creator, InfluenceRelation


class TestGraphServiceIntegration:
    """Integration tests for GraphService with real database operations"""

    @pytest.fixture(autouse=True)
    def setup_method(self, graph_service):
        """Setup for each test method"""
        self.graph_service = graph_service

    def test_create_and_retrieve_item(self):
        """Test basic item creation and retrieval"""
        # Create an item
        item = self.graph_service.create_item(
            name="Test Integration Item",
            description="A test item for integration testing",
            year=2023,
            auto_detected_type="song",
            confidence_score=0.9,
        )

        # Verify item was created correctly
        assert item.id is not None
        assert item.name == "Test Integration Item"
        assert item.year == 2023
        assert item.auto_detected_type == "song"
        assert item.verification_status == "ai_generated"

        # Retrieve the same item
        retrieved_item = self.graph_service.get_item_by_id(item.id)
        assert retrieved_item is not None
        assert retrieved_item.id == item.id
        assert retrieved_item.name == item.name

        # Cleanup
        self.graph_service.delete_item_completely(item.id)

    def test_save_structured_influences_complete_flow(self, sample_structured_output):
        """Test the complete flow of saving structured influences"""
        # This tests the main save pathway that combines everything
        main_item_id = self.graph_service.save_structured_influences(
            sample_structured_output
        )

        # Verify main item was created
        main_item = self.graph_service.get_item_by_id(main_item_id)
        assert main_item is not None
        assert main_item.name == sample_structured_output.main_item
        assert main_item.year == sample_structured_output.main_item_year

        # Verify influences were created and linked
        graph_response = self.graph_service.get_influences(main_item_id)
        assert len(graph_response.influences) == 2

        # Check influence details
        influence_names = [inf.from_item.name for inf in graph_response.influences]
        assert "Influence 1" in influence_names
        assert "Influence 2" in influence_names

        # Check categories were captured
        assert "Musical Style" in graph_response.categories
        assert "Production Technique" in graph_response.categories

        # Check scopes are preserved
        scopes = [inf.scope for inf in graph_response.influences]
        assert "macro" in scopes
        assert "micro" in scopes

        # Check clusters are preserved
        for influence in graph_response.influences:
            if influence.from_item.name == "Influence 1":
                assert influence.clusters == ["hip-hop", "east-coast"]
            elif influence.from_item.name == "Influence 2":
                assert influence.clusters == ["production", "mixing"]

        # Cleanup
        self.graph_service.delete_item_completely(main_item_id)
        for inf in graph_response.influences:
            self.graph_service.delete_item_completely(inf.from_item.id)

    def test_find_similar_items_conflict_detection(self):
        """Test conflict detection for similar items"""
        # Create a test item first
        test_item = self.graph_service.create_item(
            name="Unique Test Song", auto_detected_type="song", year=2020
        )

        # Create a creator and link it
        creator = self.graph_service.create_creator("Test Artist", "person")
        self.graph_service.link_creator_to_item(test_item.id, creator.id)

        # Test exact name match
        similar_items = self.graph_service.find_similar_items(
            name="Unique Test Song", creator_name="Test Artist"
        )

        assert len(similar_items) >= 1
        found_item = similar_items[0]
        assert found_item["name"] == "Unique Test Song"
        assert found_item["similarity_score"] == 100  # Exact match

        # Test partial name match
        similar_items = self.graph_service.find_similar_items(
            name="Unique Test", creator_name="Test Artist"
        )

        assert len(similar_items) >= 1
        assert any(item["name"] == "Unique Test Song" for item in similar_items)

        # Test no match case
        similar_items = self.graph_service.find_similar_items(
            name="Completely Different Song Name", creator_name="Different Artist"
        )

        # Should not find the test item
        matching_items = [
            item for item in similar_items if item["name"] == "Unique Test Song"
        ]
        assert len(matching_items) == 0

        # Cleanup
        self.graph_service.delete_item_completely(test_item.id)

    def test_influence_relationship_creation_with_all_properties(self):
        """Test creating influence relationships with all scope and cluster properties"""
        # Create two test items
        influence_item = self.graph_service.create_item(
            name="Influence Item", auto_detected_type="album", year=2010
        )

        main_item = self.graph_service.create_item(
            name="Main Item", auto_detected_type="song", year=2020
        )

        # Create influence relationship with all properties
        self.graph_service.create_influence_relationship(
            from_item_id=influence_item.id,
            to_item_id=main_item.id,
            confidence=0.85,
            influence_type="genre influence",
            explanation="This album defined the genre",
            category="Musical Genre",
            scope="macro",
            source="test source",
            year_of_influence=2010,
            clusters=["hip-hop", "west-coast", "classic"],
        )

        # Retrieve and verify the relationship
        graph_response = self.graph_service.get_influences(main_item.id)
        assert len(graph_response.influences) == 1

        influence = graph_response.influences[0]
        assert influence.confidence == 0.85
        assert influence.influence_type == "genre influence"
        assert influence.explanation == "This album defined the genre"
        assert influence.category == "Musical Genre"
        assert influence.scope == "macro"
        assert influence.source == "test source"
        assert influence.clusters == ["hip-hop", "west-coast", "classic"]

        # Cleanup
        self.graph_service.delete_item_completely(influence_item.id)
        self.graph_service.delete_item_completely(main_item.id)

    def test_scope_filtering(self):
        """Test that scope filtering works correctly"""
        # Create main item
        main_item = self.graph_service.create_item(
            name="Main Item for Scope Test", auto_detected_type="song", year=2020
        )

        # Create influences with different scopes
        scopes_to_test = ["macro", "micro", "nano"]
        influence_items = []

        for i, scope in enumerate(scopes_to_test):
            influence_item = self.graph_service.create_item(
                name=f"Influence {scope.title()}",
                auto_detected_type="song",
                year=2010 + i,
            )
            influence_items.append(influence_item)

            self.graph_service.create_influence_relationship(
                from_item_id=influence_item.id,
                to_item_id=main_item.id,
                confidence=0.8,
                influence_type="test influence",
                explanation=f"This is a {scope} influence",
                category=f"{scope.title()} Category",
                scope=scope,
                source="test",
            )

        # Test filtering by specific scope
        for scope in scopes_to_test:
            filtered_response = self.graph_service.get_influences(
                main_item.id, scopes=[scope]
            )

            assert len(filtered_response.influences) == 1
            assert filtered_response.influences[0].scope == scope
            assert scope in filtered_response.scopes

        # Test filtering by multiple scopes
        multi_scope_response = self.graph_service.get_influences(
            main_item.id, scopes=["macro", "micro"]
        )

        assert len(multi_scope_response.influences) == 2
        returned_scopes = [inf.scope for inf in multi_scope_response.influences]
        assert "macro" in returned_scopes
        assert "micro" in returned_scopes
        assert "nano" not in returned_scopes

        # Test no scope filter (should get all)
        all_response = self.graph_service.get_influences(main_item.id)
        assert len(all_response.influences) == 3
        assert set(all_response.scopes) == {"macro", "micro", "nano"}

        # Cleanup
        self.graph_service.delete_item_completely(main_item.id)
        for item in influence_items:
            self.graph_service.delete_item_completely(item.id)

    def test_merge_operations(self):
        """Test item merging functionality"""
        # Create two similar items
        item1 = self.graph_service.create_item(
            name="Original Item", auto_detected_type="song", year=2020
        )

        item2 = self.graph_service.create_item(
            name="Duplicate Item", auto_detected_type="song", year=2020
        )

        # Create an influence pointing to item1
        influence_item = self.graph_service.create_item(
            name="Some Influence", auto_detected_type="album", year=2010
        )

        self.graph_service.create_influence_relationship(
            from_item_id=influence_item.id,
            to_item_id=item1.id,
            confidence=0.8,
            influence_type="test",
            explanation="test influence",
            category="test category",
            scope="macro",
        )

        # Verify influence exists for item1
        graph_response = self.graph_service.get_influences(item1.id)
        assert len(graph_response.influences) == 1

        # Merge item1 into item2 (item1 will be deleted, relationships transferred to item2)
        result_id = self.graph_service.merge_items(item1.id, item2.id)
        assert result_id == item2.id

        # Verify item1 no longer exists
        deleted_item = self.graph_service.get_item_by_id(item1.id)
        assert deleted_item is None

        # Verify item2 now has the influence
        merged_response = self.graph_service.get_influences(item2.id)
        assert len(merged_response.influences) == 1
        assert merged_response.influences[0].from_item.name == "Some Influence"

        # Cleanup
        self.graph_service.delete_item_completely(item2.id)
        self.graph_service.delete_item_completely(influence_item.id)

    def test_year_validation_logic(self):
        """Test that chronological validation works"""
        # Create main item
        main_item = self.graph_service.create_item(
            name="Modern Song", auto_detected_type="song", year=2020
        )

        # Create valid influence (earlier year)
        valid_influence = self.graph_service.create_item(
            name="Earlier Song", auto_detected_type="song", year=2010
        )

        # This should work fine
        self.graph_service.create_influence_relationship(
            from_item_id=valid_influence.id,
            to_item_id=main_item.id,
            confidence=0.8,
            influence_type="chronological test",
            explanation="This song came first",
            category="Chronological Test",
            scope="macro",
            year_of_influence=2010,
        )

        # Verify the relationship was created
        graph_response = self.graph_service.get_influences(main_item.id)
        assert len(graph_response.influences) == 1

        # The database allows this, but your AI agent should prevent it
        # This tests that your database layer accepts the data structure correctly

        # Cleanup
        self.graph_service.delete_item_completely(main_item.id)
        self.graph_service.delete_item_completely(valid_influence.id)

    def test_search_functionality(self):
        """Test item search functionality"""
        # Create test items with known names
        test_items = []
        for i in range(3):
            item = self.graph_service.create_item(
                name=f"Searchable Test Item {i}",
                auto_detected_type="song",
                year=2020 + i,
            )
            test_items.append(item)

        # Test search finds the items
        search_results = self.graph_service.search_items("Searchable Test")

        # Should find all three items
        assert len(search_results) >= 3

        found_names = [item.name for item in search_results]
        for test_item in test_items:
            assert test_item.name in found_names

        # Test more specific search
        specific_results = self.graph_service.search_items("Searchable Test Item 1")
        specific_names = [item.name for item in specific_results]
        assert "Searchable Test Item 1" in specific_names

        # Cleanup
        for item in test_items:
            self.graph_service.delete_item_completely(item.id)
