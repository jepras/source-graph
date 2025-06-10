#!/usr/bin/env python3
"""Test script for scope functionality"""

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

from app.models.structured import StructuredOutput, StructuredInfluence
from app.services.graph.graph_service import graph_service


def test_scope_creation():
    """Test creating influences with different scopes"""
    print("=== Testing Scope Creation ===")

    # Create test data with different scopes
    test_influences = [
        StructuredInfluence(
            name="Hip-Hop Genre",
            category="Musical Genres",
            scope="macro",
            influence_type="genre_foundation",
            confidence=0.9,
            explanation="Eminem emerged from and helped shape hip-hop culture",
            year=1970,
        ),
        StructuredInfluence(
            name="Detroit Rap Scene",
            category="Regional Music Scenes",
            scope="micro",
            influence_type="regional_influence",
            confidence=0.85,
            explanation="Local Detroit rap scene shaped Eminem's style and content",
            year=1980,
        ),
        StructuredInfluence(
            name="Particular Rhyme Scheme",
            category="Technical Elements",
            scope="nano",
            influence_type="technical_detail",
            confidence=0.7,
            explanation="Specific ABAB rhyme pattern used in verse 2",
            year=1999,
        ),
    ]

    structured_data = StructuredOutput(
        main_item="Eminem Test Track",
        main_item_type="song",
        main_item_creator="Eminem",
        main_item_year=2000,
        influences=test_influences,
        categories=["Musical Genres", "Regional Music Scenes", "Technical Elements"],
    )

    # Save to database
    try:
        item_id = graph_service.save_structured_influences(structured_data)
        print(f"✅ Created test item: {item_id}")
        return item_id
    except Exception as e:
        print(f"❌ Error creating test item: {e}")
        return None


def test_scope_filtering(item_id: str):
    """Test filtering influences by scope"""
    print("\n=== Testing Scope Filtering ===")

    try:
        # Test no filter (should get all)
        all_influences = graph_service.get_influences(item_id)
        print(f"✅ All influences: {len(all_influences.influences)} found")
        print(f"Available scopes: {all_influences.scopes}")

        # Test macro only
        macro_influences = graph_service.get_influences(item_id, scopes=["macro"])
        print(f"✅ Macro influences: {len(macro_influences.influences)} found")

        # Test micro only
        micro_influences = graph_service.get_influences(item_id, scopes=["micro"])
        print(f"✅ Micro influences: {len(micro_influences.influences)} found")

        # Test nano only
        nano_influences = graph_service.get_influences(item_id, scopes=["nano"])
        print(f"✅ Nano influences: {len(nano_influences.influences)} found")

        # Test multiple scopes
        macro_micro = graph_service.get_influences(item_id, scopes=["macro", "micro"])
        print(f"✅ Macro + Micro influences: {len(macro_micro.influences)} found")

        # Print details for verification
        print("\n--- Influence Details ---")
        for inf in all_influences.influences:
            print(f"- {inf.from_item.name} ({inf.scope}) -> {inf.category}")

    except Exception as e:
        print(f"❌ Error testing scope filtering: {e}")
        import traceback

        traceback.print_exc()


def test_backward_compatibility():
    """Test that existing influences without scope still work"""
    print("\n=== Testing Backward Compatibility ===")

    try:
        # This should work with existing data that has no scope
        # Find any existing item in database
        test_items = graph_service.search_items("stan")

        if test_items:
            existing_item = test_items[0]
            print(f"Testing with existing item: {existing_item.name}")

            influences = graph_service.get_influences(existing_item.id)
            print(f"✅ Existing item influences: {len(influences.influences)} found")

            # Show scope values (should be None for existing data)
            for inf in influences.influences:
                scope_display = inf.scope if inf.scope else "None (existing data)"
                print(f"- {inf.from_item.name}: scope = {scope_display}")

        else:
            print("No existing items found for backward compatibility test")

    except Exception as e:
        print(f"❌ Error testing backward compatibility: {e}")


if __name__ == "__main__":
    print("Testing Scope Functionality")
    print("=" * 40)

    # Test 1: Create new influences with scopes
    item_id = test_scope_creation()

    if item_id:
        # Test 2: Filter by scope
        test_scope_filtering(item_id)

    # Test 3: Backward compatibility
    test_backward_compatibility()

    print("\n=== Test Complete ===")
