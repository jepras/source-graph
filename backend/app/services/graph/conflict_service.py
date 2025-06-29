from typing import Dict, List
from app.models.structured import StructuredOutput
from .base_service import BaseGraphService


class ConflictService(BaseGraphService):
    """
    Service for conflict resolution and merging operations.

    Handles finding conflicts between new and existing data, and managing
    merge operations between similar items.
    """

    def __init__(self, item_service=None, creator_service=None, influence_service=None):
        """Initialize with optional service dependencies"""
        super().__init__()
        self.item_service = item_service
        self.creator_service = creator_service
        self.influence_service = influence_service

    def find_comprehensive_conflicts(self, new_data: StructuredOutput) -> Dict:
        """Find conflicts for main item AND all influences"""
        conflicts = {
            "main_item_conflicts": [],
            "influence_conflicts": {},
            "total_conflicts": 0,
        }

        # Check main item conflicts
        main_conflicts = self._find_similar_items(
            new_data.main_item, new_data.main_item_creator
        )
        conflicts["main_item_conflicts"] = main_conflicts
        conflicts["total_conflicts"] += len(main_conflicts)

        # Check each influence for conflicts
        for i, influence in enumerate(new_data.influences):
            influence_name = str(influence.name).strip()
            if not influence_name or influence_name.lower() in ["none", "null", ""]:
                continue

            influence_conflicts = self._find_similar_items(
                influence_name, influence.creator_name
            )

            if influence_conflicts:
                conflicts["influence_conflicts"][i] = {
                    "influence": influence,
                    "similar_items": influence_conflicts,
                    "influence_index": i,
                }
                conflicts["total_conflicts"] += len(influence_conflicts)

        return conflicts

    def get_item_preview(self, item_id: str) -> Dict:
        """Get existing item data for merge preview"""
        try:
            # This would need to be implemented with graph query service
            # For now, return a placeholder structure
            return {
                "main_item": {
                    "id": item_id,
                    "name": "Placeholder",
                    "auto_detected_type": None,
                    "year": None,
                    "description": None,
                    "verification_status": None,
                },
                "creators": [],
                "existing_influences": [],
                "categories": [],
            }
        except Exception as e:
            return {"error": str(e)}

    def get_comprehensive_preview(self, conflict_data: Dict) -> Dict:
        """Get preview data for main item and all conflicting influences"""
        preview = {
            "main_item_preview": None,
            "influence_previews": {},
            "merge_strategy": "selective",  # or "all_or_nothing"
        }

        # Get main item preview if there are conflicts
        if conflict_data.get("main_item_conflicts"):
            # Use existing logic for main item
            pass

        # Get previews for each conflicting influence
        for influence_idx, conflict_info in conflict_data.get(
            "influence_conflicts", {}
        ).items():
            influence = conflict_info["influence"]
            similar_items = conflict_info["similar_items"]

            # Get preview for first similar item (most similar)
            if similar_items:
                first_similar = similar_items[0]
                preview["influence_previews"][influence_idx] = {
                    "influence": influence,
                    "similar_item": first_similar,
                    "preview_data": self.get_item_preview(first_similar["id"]),
                }

        return preview

    def add_influences_to_existing(
        self, existing_item_id: str, new_data: StructuredOutput
    ) -> str:
        """Add new influences to an existing item"""

        try:
            # Get existing item
            existing_item = self._get_item_by_id(existing_item_id)
            if not existing_item:
                raise ValueError(f"Existing item {existing_item_id} not found")

            # Update main item creator if new one provided and none exists
            if new_data.main_item_creator:
                with self._get_session() as session:
                    existing_creators = session.run(
                        "MATCH (i:Item {id: $id})-[:CREATED_BY]->(c:Creator) RETURN count(c) as count",
                        {"id": existing_item_id},
                    ).single()["count"]

                    if existing_creators == 0:
                        creator = self._create_creator(
                            name=new_data.main_item_creator,
                            creator_type=new_data.main_item_creator_type or "person",
                        )
                        self._link_creator_to_item(
                            item_id=existing_item_id,
                            creator_id=creator.id,
                            role="primary_creator",
                        )

            # Add new influences (avoid duplicates)
            new_influences_added = 0

            for i, influence in enumerate(new_data.influences):
                # Safely convert influence name to string and validate
                influence_name = (
                    str(influence.name).strip()
                    if influence.name is not None
                    else f"Unknown Influence {i + 1}"
                )

                # Skip if name is empty or invalid
                if not influence_name or influence_name.lower() in ["none", "null", ""]:
                    continue

                # Check for duplicates using Python instead of Cypher
                with self._get_session() as session:
                    try:
                        # Get all influence names for this item (safely)
                        influences_result = session.run(
                            """
                            MATCH (inf:Item)-[r:INFLUENCES]->(main:Item {id: $main_id})
                            WHERE inf.name IS NOT NULL AND toString(inf.name) IS NOT NULL
                            RETURN toString(inf.name) as influence_name
                            """,
                            {"main_id": existing_item_id},
                        )

                        # Check for duplicates in Python
                        existing_names = []
                        for record in influences_result:
                            try:
                                name = record["influence_name"]
                                if name and isinstance(name, str):
                                    existing_names.append(name.lower())
                            except Exception as e:
                                continue

                        is_duplicate = influence_name.lower() in existing_names
                        existing_influence = 1 if is_duplicate else 0

                    except Exception as e:
                        existing_influence = (
                            0  # Default to not duplicate if query fails
                        )

                    if existing_influence == 0:
                        # Create new influence with cleaned data
                        influence_item = self._create_item(
                            name=influence_name,
                            description=(
                                influence.explanation
                                if influence.explanation
                                else f"Influence on {existing_item.name}"
                            ),
                            auto_detected_type=influence.type,
                            year=influence.year,
                            confidence_score=influence.confidence,
                        )

                        # Create influence creator if provided
                        if influence.creator_name:
                            creator_name = str(influence.creator_name).strip()
                            if creator_name and creator_name.lower() not in [
                                "none",
                                "null",
                                "",
                            ]:
                                influence_creator = self._create_creator(
                                    name=creator_name,
                                    creator_type=influence.creator_type or "person",
                                )
                                self._link_creator_to_item(
                                    item_id=influence_item.id,
                                    creator_id=influence_creator.id,
                                    role="primary_creator",
                                )

                        # Create influence relationship with cleaned explanation
                        explanation = (
                            str(influence.explanation).strip()
                            if influence.explanation
                            else "No explanation provided"
                        )
                        category = (
                            str(influence.category).strip()
                            if influence.category
                            else "Uncategorized"
                        )

                        self._create_influence_relationship(
                            from_item_id=influence_item.id,
                            to_item_id=existing_item_id,
                            confidence=influence.confidence,
                            influence_type=influence.influence_type,
                            explanation=explanation,
                            category=category,
                            source=influence.source,
                            year_of_influence=influence.year,
                            clusters=influence.clusters,
                        )

                        # Ensure category exists
                        self.ensure_category_exists(category)
                        new_influences_added += 1

            return existing_item_id

        except Exception as e:
            import traceback

            traceback.print_exc()
            raise

    def _find_similar_items(self, name: str, creator_name: str = None) -> List[Dict]:
        """Find existing items that might be the same as what user wants to create"""
        # This would delegate to item service if available
        if self.item_service:
            return self.item_service.find_similar_items(name, creator_name)
        else:
            # Fallback implementation would go here
            return []

    def _get_item_by_id(self, item_id: str):
        """Helper method to get item by ID"""
        if self.item_service:
            return self.item_service.get_item_by_id(item_id)
        else:
            # Fallback implementation would go here
            return None

    def _get_session(self):
        """Helper method to get database session"""
        from app.core.database.neo4j import neo4j_db

        return neo4j_db.driver.session()

    def _create_item(self, **kwargs):
        """Helper method to create item"""
        if self.item_service:
            return self.item_service.create_item(**kwargs)
        else:
            # Fallback implementation would go here
            return None

    def _create_creator(self, **kwargs):
        """Helper method to create creator"""
        if self.creator_service:
            return self.creator_service.create_creator(**kwargs)
        else:
            # Fallback implementation would go here
            return None

    def _link_creator_to_item(
        self, item_id: str, creator_id: str, role: str = "creator"
    ):
        """Helper method to link creator to item"""
        if self.creator_service:
            return self.creator_service.link_creator_to_item(item_id, creator_id, role)
        else:
            # Fallback implementation would go here
            pass

    def _create_influence_relationship(self, **kwargs):
        """Helper method to create influence relationship"""
        if self.influence_service:
            return self.influence_service.create_influence_relationship(**kwargs)
        else:
            # Fallback implementation would go here
            pass
