#!/usr/bin/env python3
"""
Test script to understand what happens to descriptions in different merge scenarios:
1. When a main item also becomes an influence
2. When items are merged together
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models.structured import StructuredOutput, StructuredInfluence
from app.services.graph.graph_service import graph_service


def test_main_item_as_influence():
    """Test what happens when a main item also becomes an influence"""
    print("\n🔍 Test 1: Main Item as Influence")

    try:
        # Create a main item with a good description
        main_item = graph_service.create_item(
            name="Original Song",
            auto_detected_type="song",
            year=2020,
            description="A groundbreaking song that revolutionized the genre",
        )
        print(f"✅ Created main item: {main_item.name}")
        print(f"📝 Main item description: {main_item.description}")

        # Now create another item that is influenced by the first item
        test_data = StructuredOutput(
            main_item="New Song",
            main_item_type="song",
            main_item_creator="New Artist",
            main_item_year=2021,
            main_item_description="A song influenced by the original",
            influences=[
                StructuredInfluence(
                    name="Original Song",  # This is the same as our main item
                    type="song",
                    creator_name="Original Artist",
                    year=2020,
                    category="Musical Style",
                    scope="macro",
                    influence_type="genre influence",
                    confidence=0.8,
                    explanation="This song established the foundational genre elements that influenced the new song",
                    source="test",
                    clusters=["hip-hop", "east-coast"],
                )
            ],
            categories=["Musical Style"],
        )

        # Save this - it should create a new influence relationship
        new_item_id = graph_service.save_structured_influences(test_data)
        print(f"✅ Created new item: {test_data.main_item}")

        # Check what description the influence has now
        graph_response = graph_service.get_influences(new_item_id)
        print(f"🔗 Found {len(graph_response.influences)} influences")

        for i, influence in enumerate(graph_response.influences):
            print(
                f"📝 Influence {i+1} ({influence.from_item.name}) description: {influence.from_item.description}"
            )
            print(f"   Explanation: {influence.explanation}")

        # Cleanup
        graph_service.delete_item_completely(main_item.id)
        graph_service.delete_item_completely(new_item_id)
        for inf in graph_response.influences:
            graph_service.delete_item_completely(inf.from_item.id)

        print("✅ Test 1 completed")

    except Exception as e:
        print(f"❌ Test 1 failed: {str(e)}")
        import traceback

        traceback.print_exc()


def test_item_merge():
    """Test what happens when items are merged together"""
    print("\n🔍 Test 2: Item Merge")

    try:
        # Create two items with different descriptions
        item1 = graph_service.create_item(
            name="Original Item",
            auto_detected_type="album",
            year=2020,
            description="The original groundbreaking album",
        )

        item2 = graph_service.create_item(
            name="Duplicate Item",
            auto_detected_type="album",
            year=2020,
            description="A duplicate of the original album",
        )

        print(f"✅ Created item1: {item1.name} - {item1.description}")
        print(f"✅ Created item2: {item2.name} - {item2.description}")

        # Create an influence pointing to item1
        influence_item = graph_service.create_item(
            name="Some Influence",
            auto_detected_type="album",
            year=2010,
            description="An influence on the original item",
        )

        graph_service.create_influence_relationship(
            from_item_id=influence_item.id,
            to_item_id=item1.id,
            confidence=0.8,
            influence_type="test",
            explanation="test influence",
            category="test category",
            scope="macro",
        )

        print(
            f"✅ Created influence: {influence_item.name} - {influence_item.description}"
        )

        # Verify influence exists for item1
        graph_response = graph_service.get_influences(item1.id)
        print(f"🔗 Item1 has {len(graph_response.influences)} influences")

        # Merge item1 into item2 (item1 will be deleted, relationships transferred to item2)
        result_id = graph_service.merge_items(item1.id, item2.id)
        print(f"✅ Merged item1 into item2, result_id: {result_id}")

        # Verify item1 no longer exists
        deleted_item = graph_service.get_item_by_id(item1.id)
        print(f"❌ Item1 still exists: {deleted_item is not None}")

        # Check what description item2 has now
        merged_item = graph_service.get_item_by_id(item2.id)
        print(f"📝 Merged item description: {merged_item.description}")

        # Verify item2 now has the influence
        merged_response = graph_service.get_influences(item2.id)
        print(f"🔗 Merged item has {len(merged_response.influences)} influences")

        for i, influence in enumerate(merged_response.influences):
            print(
                f"📝 Influence {i+1} ({influence.from_item.name}) description: {influence.from_item.description}"
            )
            print(f"   Explanation: {influence.explanation}")

        # Cleanup
        graph_service.delete_item_completely(item2.id)
        for inf in merged_response.influences:
            graph_service.delete_item_completely(inf.from_item.id)

        print("✅ Test 2 completed")

    except Exception as e:
        print(f"❌ Test 2 failed: {str(e)}")
        import traceback

        traceback.print_exc()


def test_conflict_merge():
    """Test what happens when items are merged through conflict resolution"""
    print("\n🔍 Test 3: Conflict Resolution Merge")

    try:
        # Create an existing item
        existing_item = graph_service.create_item(
            name="Existing Song",
            auto_detected_type="song",
            year=2020,
            description="An existing song in the database",
        )
        print(
            f"✅ Created existing item: {existing_item.name} - {existing_item.description}"
        )

        # Create test data that conflicts with the existing item
        test_data = StructuredOutput(
            main_item="Existing Song",  # Same name as existing item
            main_item_type="song",
            main_item_creator="Same Artist",
            main_item_year=2020,
            main_item_description="A new description for the same song",
            influences=[
                StructuredInfluence(
                    name="New Influence",
                    type="album",
                    creator_name="Influence Artist",
                    year=2019,
                    category="Musical Style",
                    scope="macro",
                    influence_type="genre influence",
                    confidence=0.8,
                    explanation="This album influenced the song's style",
                    source="test",
                    clusters=["style", "genre"],
                )
            ],
            categories=["Musical Style"],
        )

        # This should trigger conflict resolution
        from app.services.graph.conflict_service import ConflictService

        conflict_service = ConflictService()
        conflicts = conflict_service.find_comprehensive_conflicts(test_data)

        print(f"🔍 Found {conflicts['total_conflicts']} conflicts")
        print(f"   Main item conflicts: {len(conflicts['main_item_conflicts'])}")
        print(f"   Influence conflicts: {len(conflicts['influence_conflicts'])}")

        if conflicts["total_conflicts"] > 0:
            # Simulate merging by adding influences to existing item
            result_id = conflict_service.add_influences_to_existing(
                existing_item.id, test_data
            )
            print(f"✅ Added influences to existing item, result_id: {result_id}")

            # Check what the existing item looks like now
            updated_item = graph_service.get_item_by_id(existing_item.id)
            print(f"📝 Updated item description: {updated_item.description}")

            # Check the influences
            graph_response = graph_service.get_influences(existing_item.id)
            print(f"🔗 Updated item has {len(graph_response.influences)} influences")

            for i, influence in enumerate(graph_response.influences):
                print(
                    f"📝 Influence {i+1} ({influence.from_item.name}) description: {influence.from_item.description}"
                )
                print(f"   Explanation: {influence.explanation}")

            # Cleanup
            graph_service.delete_item_completely(existing_item.id)
            for inf in graph_response.influences:
                graph_service.delete_item_completely(inf.from_item.id)
        else:
            print("⚠️ No conflicts detected - this might be due to loose matching")

            # Let's try to manually test the add_influences_to_existing method
            print("🧪 Manually testing add_influences_to_existing...")
            result_id = conflict_service.add_influences_to_existing(
                existing_item.id, test_data
            )
            print(f"✅ Added influences to existing item, result_id: {result_id}")

            # Check what the existing item looks like now
            updated_item = graph_service.get_item_by_id(existing_item.id)
            print(f"📝 Updated item description: {updated_item.description}")

            # Check the influences
            graph_response = graph_service.get_influences(existing_item.id)
            print(f"🔗 Updated item has {len(graph_response.influences)} influences")

            for i, influence in enumerate(graph_response.influences):
                print(
                    f"📝 Influence {i+1} ({influence.from_item.name}) description: {influence.from_item.description}"
                )
                print(f"   Explanation: {influence.explanation}")

            # Cleanup
            graph_service.delete_item_completely(existing_item.id)
            for inf in graph_response.influences:
                graph_service.delete_item_completely(inf.from_item.id)

        print("✅ Test 3 completed")

    except Exception as e:
        print(f"❌ Test 3 failed: {str(e)}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    print("🧪 Testing Description Handling in Merge Scenarios")
    print("=" * 60)

    test_main_item_as_influence()
    test_item_merge()
    test_conflict_merge()

    print("\n" + "=" * 60)
    print("✅ All tests completed!")
