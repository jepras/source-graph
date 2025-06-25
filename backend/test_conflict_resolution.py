#!/usr/bin/env python3
"""
Comprehensive Conflict Resolution Test Script

This script tests all conflict resolution scenarios to identify issues:
1. Item-to-Item merges
2. Influence-to-Influence merges
3. Item-to-Influence merges
4. Influence-to-Item merges
5. Mixed conflict scenarios
6. Button state validation
"""

import asyncio
import json
import logging
from typing import Dict, List, Any
from app.services.graph.graph_service import graph_service
from app.models.structured import StructuredOutput, StructuredInfluence
from app.services.graph.conflict_service import ConflictService

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ConflictResolutionTester:
    def __init__(self):
        self.graph_service = graph_service
        self.conflict_service = (
            self.graph_service.conflict_service
        )  # Use the properly configured instance
        self.test_results = []

    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")

        self.test_results.append(
            {"test": test_name, "success": success, "details": details}
        )

    def cleanup_test_data(self, item_ids: List[str]):
        """Clean up test data"""
        for item_id in item_ids:
            try:
                self.graph_service.delete_item_completely(item_id)
            except Exception as e:
                print(f"Warning: Could not delete {item_id}: {e}")

    def test_1_item_to_item_merge(self):
        """Test main item conflict resolution"""
        print("\n🔍 Test 1: Item-to-Item Merge")

        # Create existing item
        existing_item = self.graph_service.create_item(
            name="Beastie Boys - Licensed to Ill", auto_detected_type="album", year=1986
        )

        # Create test data that conflicts
        test_data = StructuredOutput(
            main_item="Beastie Boys - Licensed to Ill",
            main_item_type="album",
            main_item_creator="Beastie Boys",
            influences=[
                StructuredInfluence(
                    name="Run DMC - Raising Hell",
                    type="album",
                    creator_name="Run DMC",
                    year=1986,
                    category="Hip Hop",
                    influence_type="inspiration",
                    confidence=0.8,
                    explanation="Influenced the style and approach",
                )
            ],
            categories=["Hip Hop"],
        )

        try:
            # Test conflict detection
            conflicts = self.conflict_service.find_comprehensive_conflicts(test_data)

            # Validate conflict structure
            has_main_conflicts = len(conflicts["main_item_conflicts"]) > 0
            has_influence_conflicts = len(conflicts["influence_conflicts"]) > 0
            total_conflicts = conflicts["total_conflicts"]

            # Check if main item conflict is detected
            main_conflict_found = any(
                item["name"] == "Beastie Boys - Licensed to Ill"
                for item in conflicts["main_item_conflicts"]
            )

            self.log_test(
                "Main Item Conflict Detection",
                has_main_conflicts and main_conflict_found,
                f"Found {len(conflicts['main_item_conflicts'])} main conflicts, {len(conflicts['influence_conflicts'])} influence conflicts",
            )

            # Test resolution structure
            if has_main_conflicts:
                resolution_structure = {
                    "resolution": "merge",
                    "selectedItemId": existing_item.id,
                }

                # Simulate frontend resolution logic
                selected_main_item = resolution_structure["selectedItemId"]
                influence_resolutions = {}

                # Check if resolution would be valid
                all_resolved = (
                    len(conflicts["main_item_conflicts"]) > 0
                    and selected_main_item is not None
                ) and (
                    len(conflicts["influence_conflicts"]) == 0
                    or all(
                        key in influence_resolutions
                        for key in conflicts["influence_conflicts"].keys()
                    )
                )

                self.log_test(
                    "Resolution Structure Validation",
                    all_resolved,
                    f"Main item selected: {selected_main_item is not None}, All influences resolved: {len(conflicts['influence_conflicts']) == 0 or all(key in influence_resolutions for key in conflicts['influence_conflicts'].keys())}",
                )

        finally:
            self.cleanup_test_data([existing_item.id])

    def test_2_influence_to_influence_merge(self):
        """Test influence conflict resolution"""
        print("\n🔍 Test 2: Influence-to-Influence Merge")

        # Create existing influence item
        existing_influence = self.graph_service.create_item(
            name="Run DMC - Raising Hell", auto_detected_type="album", year=1986
        )

        # Create test data with conflicting influence
        test_data = StructuredOutput(
            main_item="Beastie Boys - Licensed to Ill",
            main_item_type="album",
            main_item_creator="Beastie Boys",
            influences=[
                StructuredInfluence(
                    name="Run DMC - Raising Hell",
                    type="album",
                    creator_name="Run DMC",
                    year=1986,
                    category="Hip Hop",
                    influence_type="inspiration",
                    confidence=0.8,
                    explanation="Influenced the style and approach",
                )
            ],
            categories=["Hip Hop"],
        )

        try:
            # Test conflict detection
            conflicts = self.conflict_service.find_comprehensive_conflicts(test_data)

            # Check influence conflicts
            has_influence_conflicts = len(conflicts["influence_conflicts"]) > 0

            if has_influence_conflicts:
                influence_key = list(conflicts["influence_conflicts"].keys())[0]
                influence_conflict = conflicts["influence_conflicts"][influence_key]

                # Check if correct influence is detected
                influence_found = (
                    influence_conflict["influence"].name == "Run DMC - Raising Hell"
                )
                similar_items_found = len(influence_conflict["similar_items"]) > 0

                self.log_test(
                    "Influence Conflict Detection",
                    influence_found and similar_items_found,
                    f"Influence '{influence_conflict['influence'].name}' found with {len(influence_conflict['similar_items'])} similar items",
                )

                # Test resolution structure
                influence_resolutions = {
                    influence_key: {
                        "resolution": "merge",
                        "selectedItemId": existing_influence.id,
                    }
                }

                # Check if all conflicts would be resolved
                all_influences_resolved = all(
                    key in influence_resolutions
                    for key in conflicts["influence_conflicts"].keys()
                )

                self.log_test(
                    "Influence Resolution Structure",
                    all_influences_resolved,
                    f"All {len(conflicts['influence_conflicts'])} influence conflicts resolved",
                )

        finally:
            self.cleanup_test_data([existing_influence.id])

    def test_3_mixed_conflicts(self):
        """Test scenario with both main item and influence conflicts"""
        print("\n🔍 Test 3: Mixed Conflicts (Main Item + Influences)")

        # Create existing items
        existing_main = self.graph_service.create_item(
            name="Beastie Boys - Licensed to Ill", auto_detected_type="album", year=1986
        )

        existing_influence1 = self.graph_service.create_item(
            name="Run DMC - Raising Hell", auto_detected_type="album", year=1986
        )

        existing_influence2 = self.graph_service.create_item(
            name="Public Enemy - It Takes a Nation",
            auto_detected_type="album",
            year=1988,
        )

        # Create test data with multiple conflicts
        test_data = StructuredOutput(
            main_item="Beastie Boys - Licensed to Ill",
            main_item_type="album",
            main_item_creator="Beastie Boys",
            influences=[
                StructuredInfluence(
                    name="Run DMC - Raising Hell",
                    type="album",
                    creator_name="Run DMC",
                    year=1986,
                    category="Hip Hop",
                    influence_type="inspiration",
                    confidence=0.8,
                    explanation="Influenced the style and approach",
                ),
                StructuredInfluence(
                    name="Public Enemy - It Takes a Nation",
                    type="album",
                    creator_name="Public Enemy",
                    year=1988,
                    category="Hip Hop",
                    influence_type="inspiration",
                    confidence=0.7,
                    explanation="Influenced the political content",
                ),
                StructuredInfluence(
                    name="New Influence - No Conflict",
                    type="album",
                    creator_name="New Artist",
                    year=1990,
                    category="Hip Hop",
                    influence_type="inspiration",
                    confidence=0.6,
                    explanation="This should not conflict",
                ),
            ],
            categories=["Hip Hop"],
        )

        try:
            # Test conflict detection
            conflicts = self.conflict_service.find_comprehensive_conflicts(test_data)

            # Validate conflict counts
            main_conflicts = len(conflicts["main_item_conflicts"])
            influence_conflicts = len(conflicts["influence_conflicts"])
            total_conflicts = conflicts["total_conflicts"]

            expected_main_conflicts = 1  # Beastie Boys
            expected_influence_conflicts = 2  # Run DMC + Public Enemy

            self.log_test(
                "Mixed Conflict Detection",
                main_conflicts == expected_main_conflicts
                and influence_conflicts == expected_influence_conflicts,
                f"Expected {expected_main_conflicts} main + {expected_influence_conflicts} influence conflicts, got {main_conflicts} + {influence_conflicts}",
            )

            # Test resolution structure
            if main_conflicts > 0 and influence_conflicts > 0:
                # Simulate complete resolution
                selected_main_item = existing_main.id
                influence_resolutions = {}

                for influence_key in conflicts["influence_conflicts"].keys():
                    influence_conflict = conflicts["influence_conflicts"][influence_key]
                    influence_name = influence_conflict["influence"].name

                    if influence_name == "Run DMC - Raising Hell":
                        influence_resolutions[influence_key] = {
                            "resolution": "merge",
                            "selectedItemId": existing_influence1.id,
                        }
                    elif influence_name == "Public Enemy - It Takes a Nation":
                        influence_resolutions[influence_key] = {
                            "resolution": "merge",
                            "selectedItemId": existing_influence2.id,
                        }

                # Check if all conflicts would be resolved
                main_resolved = selected_main_item is not None
                all_influences_resolved = all(
                    key in influence_resolutions
                    for key in conflicts["influence_conflicts"].keys()
                )

                self.log_test(
                    "Complete Resolution Structure",
                    main_resolved and all_influences_resolved,
                    f"Main resolved: {main_resolved}, All influences resolved: {all_influences_resolved}",
                )

                # Test the exact frontend logic
                are_all_conflicts_resolved = (
                    len(conflicts["main_item_conflicts"]) == 0
                    or selected_main_item is not None
                ) and (
                    len(conflicts["influence_conflicts"]) == 0
                    or all_influences_resolved
                )

                self.log_test(
                    "Frontend Resolution Logic",
                    are_all_conflicts_resolved,
                    f"Frontend would enable button: {are_all_conflicts_resolved}",
                )

        finally:
            self.cleanup_test_data(
                [existing_main.id, existing_influence1.id, existing_influence2.id]
            )

    def test_4_edge_cases(self):
        """Test edge cases that might cause button to be disabled"""
        print("\n🔍 Test 4: Edge Cases")

        # Test 4a: Empty influence names
        test_data_empty_names = StructuredOutput(
            main_item="Test Item",
            main_item_type="album",
            main_item_creator="Test Artist",
            influences=[
                StructuredInfluence(
                    name="",  # Empty name
                    type="album",
                    creator_name="Artist",
                    year=1990,
                    category="Test",
                    influence_type="inspiration",
                    confidence=0.8,
                    explanation="Test",
                ),
                StructuredInfluence(
                    name="None",  # "None" string
                    type="album",
                    creator_name="Artist",
                    year=1990,
                    category="Test",
                    influence_type="inspiration",
                    confidence=0.8,
                    explanation="Test",
                ),
            ],
            categories=["Test"],
        )

        conflicts = self.conflict_service.find_comprehensive_conflicts(
            test_data_empty_names
        )

        # Empty names should be filtered out
        empty_names_filtered = len(conflicts["influence_conflicts"]) == 0

        self.log_test(
            "Empty Influence Names Filtered",
            empty_names_filtered,
            f"Empty names should not create conflicts, got {len(conflicts['influence_conflicts'])} conflicts",
        )

        # Test 4b: Null/None values
        test_data_null_values = StructuredOutput(
            main_item="Test Item",
            main_item_type="album",
            main_item_creator=None,  # Null creator
            influences=[
                StructuredInfluence(
                    name="Valid Influence",
                    type="album",
                    creator_name=None,  # Null creator
                    year=None,  # Null year
                    category="Test",
                    influence_type="inspiration",
                    confidence=0.8,
                    explanation="Test",
                )
            ],
            categories=["Test"],
        )

        conflicts = self.conflict_service.find_comprehensive_conflicts(
            test_data_null_values
        )

        # Should handle null values gracefully
        null_values_handled = conflicts["total_conflicts"] >= 0

        self.log_test(
            "Null Values Handled",
            null_values_handled,
            f"Null values should not crash, got {conflicts['total_conflicts']} total conflicts",
        )

    def test_5_frontend_simulation(self):
        """Simulate the exact frontend logic to identify issues"""
        print("\n🔍 Test 5: Frontend Logic Simulation")

        # Create test scenario
        existing_item = self.graph_service.create_item(
            name="Existing Item", auto_detected_type="album", year=1990
        )

        test_data = StructuredOutput(
            main_item="Existing Item",  # Will conflict
            main_item_type="album",
            main_item_creator="Artist",
            influences=[
                StructuredInfluence(
                    name="New Influence",  # No conflict
                    type="album",
                    creator_name="New Artist",
                    year=1995,
                    category="Test",
                    influence_type="inspiration",
                    confidence=0.8,
                    explanation="Test",
                )
            ],
            categories=["Test"],
        )

        try:
            conflicts = self.conflict_service.find_comprehensive_conflicts(test_data)

            # Simulate frontend state
            selectedMainItem = None  # User hasn't selected yet
            influenceResolutions = {}

            # Frontend logic from ConflictResolution.tsx
            def areAllConflictsResolved():
                # Check main item conflicts
                if len(conflicts["main_item_conflicts"]) > 0 and not selectedMainItem:
                    return False

                # Check influence conflicts
                influenceConflictKeys = list(conflicts["influence_conflicts"].keys())
                if len(influenceConflictKeys) > 0:
                    return all(
                        key in influenceResolutions for key in influenceConflictKeys
                    )

                return True

            # Test initial state (should be disabled)
            initial_state = areAllConflictsResolved()

            self.log_test(
                "Initial Button State (No Selections)",
                not initial_state,  # Should be False (disabled)
                f"Button should be disabled initially, got: {initial_state}",
            )

            # Test with main item selected
            selectedMainItem = existing_item.id

            with_main_selected = areAllConflictsResolved()

            self.log_test(
                "Button State with Main Item Selected",
                with_main_selected,  # Should be True (enabled)
                f"Button should be enabled with main item selected, got: {with_main_selected}",
            )

            # Test with influence conflicts
            # Add a conflicting influence
            test_data.influences.append(
                StructuredInfluence(
                    name="Existing Item",  # Will conflict with main item
                    type="album",
                    creator_name="Artist",
                    year=1990,
                    category="Test",
                    influence_type="inspiration",
                    confidence=0.8,
                    explanation="Test",
                )
            )

            conflicts_with_influence = (
                self.conflict_service.find_comprehensive_conflicts(test_data)
            )

            # Simulate influence resolution
            influenceResolutions = {}
            for influence_key in conflicts_with_influence["influence_conflicts"].keys():
                influenceResolutions[influence_key] = {
                    "resolution": "create_new",
                    "selectedItemId": None,
                }

            with_influence_resolved = areAllConflictsResolved()

            self.log_test(
                "Button State with All Conflicts Resolved",
                with_influence_resolved,  # Should be True (enabled)
                f"Button should be enabled with all conflicts resolved, got: {with_influence_resolved}",
            )

        finally:
            self.cleanup_test_data([existing_item.id])

    def run_all_tests(self):
        """Run all conflict resolution tests"""
        print("🚀 Starting Comprehensive Conflict Resolution Tests")
        print("=" * 60)

        try:
            self.test_1_item_to_item_merge()
            self.test_2_influence_to_influence_merge()
            self.test_3_mixed_conflicts()
            self.test_4_edge_cases()
            self.test_5_frontend_simulation()

        except Exception as e:
            print(f"❌ Test execution failed: {e}")
            import traceback

            traceback.print_exc()

        # Print summary
        print("\n" + "=" * 60)
        print("📊 Test Summary")
        print("=" * 60)

        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)

        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")

        if total - passed > 0:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")

        print(f"\nSuccess Rate: {(passed/total)*100:.1f}%")

        return passed == total


def main():
    """Main test runner"""
    tester = ConflictResolutionTester()
    success = tester.run_all_tests()

    if success:
        print(
            "\n🎉 All tests passed! Conflict resolution system appears to be working correctly."
        )
    else:
        print("\n⚠️  Some tests failed. Check the details above for potential issues.")

    return success


if __name__ == "__main__":
    main()
