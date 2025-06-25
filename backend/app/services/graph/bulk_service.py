from app.models.structured import StructuredOutput
from .base_service import BaseGraphService


class BulkService(BaseGraphService):
    """
    Service for bulk data operations in the graph database.

    Handles saving complete structured influence data and other bulk operations.
    """

    def __init__(self, item_service=None, creator_service=None, influence_service=None):
        """Initialize with optional service dependencies"""
        super().__init__()
        self.item_service = item_service
        self.creator_service = creator_service
        self.influence_service = influence_service

    def save_structured_influences(self, structured_data: StructuredOutput) -> str:
        """Save complete structured influence data to database with scope support"""

        # 1. Create or get main item
        main_item = self._create_item(
            name=structured_data.main_item,
            description=structured_data.main_item_description,
            auto_detected_type=structured_data.main_item_type,
            year=structured_data.main_item_year,
        )

        # 2. Create main item creator if provided
        if structured_data.main_item_creator:
            creator = self._create_creator(
                name=structured_data.main_item_creator,
                creator_type=structured_data.main_item_creator_type or "person",
            )
            self._link_creator_to_item(main_item.id, creator.id, "primary_creator")

        # 3. Process each influence with scope
        for influence in structured_data.influences:
            # Create influence item
            influence_item = self._create_item(
                name=influence.name,
                auto_detected_type=influence.type,
                year=influence.year,
            )

            # Create influence creator if provided
            if influence.creator_name:
                influence_creator = self._create_creator(
                    name=influence.creator_name,
                    creator_type=influence.creator_type or "person",
                )
                self._link_creator_to_item(
                    influence_item.id, influence_creator.id, "primary_creator"
                )

            # Create influence relationship with scope
            self._create_influence_relationship(
                from_item_id=influence_item.id,
                to_item_id=main_item.id,
                confidence=influence.confidence,
                influence_type=influence.influence_type,
                explanation=influence.explanation,
                category=influence.category,
                scope=influence.scope,  # Now includes scope
                source=influence.source,
                year_of_influence=influence.year,
                clusters=influence.clusters,
            )

            # Ensure category exists
            self.ensure_category_exists(influence.category)

        return main_item.id

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
