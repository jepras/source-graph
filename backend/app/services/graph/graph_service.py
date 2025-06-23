from typing import List, Optional, Dict, Any
from app.models.item import Item, Creator, InfluenceRelation, GraphResponse
from app.models.structured import StructuredOutput
from app.models.enhancement import EnhancedContent
from .base_service import BaseGraphService
from .item_service import ItemService
from .creator_service import CreatorService
from .influence_service import InfluenceService
from .graph_query_service import GraphQueryService
from .conflict_service import ConflictService
from .bulk_service import BulkService
import json


class GraphService(BaseGraphService):
    """
    Main orchestrator service for managing influence graph data in Neo4j database.

    This service coordinates all specialized services to provide a unified interface
    for graph operations while maintaining backward compatibility with the original API.

    The service delegates operations to specialized services:
    - ItemService: Item CRUD operations
    - CreatorService: Creator operations
    - InfluenceService: Influence relationship management
    - GraphQueryService: Graph queries and expansions
    - ConflictService: Conflict resolution and merging
    - BulkService: Bulk data operations
    """

    def __init__(self):
        """Initialize the graph service and all specialized services"""
        super().__init__()

        # Initialize specialized services
        self.item_service = ItemService()
        self.creator_service = CreatorService()
        self.influence_service = InfluenceService()
        self.graph_query_service = GraphQueryService(item_service=self.item_service)
        self.conflict_service = ConflictService(
            item_service=self.item_service,
            creator_service=self.creator_service,
            influence_service=self.influence_service,
        )
        self.bulk_service = BulkService(
            item_service=self.item_service,
            creator_service=self.creator_service,
            influence_service=self.influence_service,
        )

    # ============================================================================
    # SECTION 1: UTILITY FUNCTIONS (delegated to base)
    # ============================================================================

    # generate_id and ensure_category_exists are inherited from BaseGraphService

    # ============================================================================
    # SECTION 2: CORE ITEM OPERATIONS (delegated to ItemService)
    # ============================================================================

    def create_item(self, *args, **kwargs) -> Item:
        """Create a new item in the database"""
        return self.item_service.create_item(*args, **kwargs)

    def get_item_by_id(self, item_id: str) -> Optional[Item]:
        """Get single item by ID"""
        return self.item_service.get_item_by_id(item_id)

    def search_items(self, query: str) -> List[Item]:
        """Search items by name"""
        return self.item_service.search_items(query)

    def find_similar_items(self, name: str, creator_name: str = None) -> List[Dict]:
        """Find existing items that might be the same as what user wants to create"""
        return self.item_service.find_similar_items(name, creator_name)

    def delete_item_completely(self, item_id: str) -> bool:
        """Delete item and all its relationships"""
        return self.item_service.delete_item_completely(item_id)

    def merge_items(self, source_item_id: str, target_item_id: str) -> str:
        """Transfer all relationships from source to target, delete source"""
        return self.item_service.merge_items(source_item_id, target_item_id)

    # ============================================================================
    # SECTION 3: CREATOR OPERATIONS (delegated to CreatorService)
    # ============================================================================

    def create_creator(self, name: str, creator_type: str = "person") -> Creator:
        """Create or get existing creator"""
        return self.creator_service.create_creator(name, creator_type)

    def link_creator_to_item(
        self, item_id: str, creator_id: str, role: str = "creator"
    ):
        """Link creator to item"""
        return self.creator_service.link_creator_to_item(item_id, creator_id, role)

    # ============================================================================
    # SECTION 4: INFLUENCE RELATIONSHIP OPERATIONS (delegated to InfluenceService)
    # ============================================================================

    def create_influence_relationship(self, *args, **kwargs):
        """Create influence relationship between items with scope support"""
        return self.influence_service.create_influence_relationship(*args, **kwargs)

    # ============================================================================
    # SECTION 5: GRAPH QUERY OPERATIONS (delegated to GraphQueryService)
    # ============================================================================

    def get_influences(self, item_id: str, scopes: List[str] = None) -> GraphResponse:
        """Get item and its influences with optional scope filtering"""
        return self.graph_query_service.get_influences(item_id, scopes)

    def get_what_item_influences(self, item_id: str) -> List[InfluenceRelation]:
        """Get what this item influences (outgoing influences)"""
        return self.graph_query_service.get_what_item_influences(item_id)

    def get_expansion_counts(self, item_id: str) -> Dict[str, int]:
        """Get counts for potential expansions (incoming and outgoing influences)"""
        return self.graph_query_service.get_expansion_counts(item_id)

    def get_expanded_graph(self, *args, **kwargs) -> Dict:
        """Get expanded graph with multiple layers of influences"""
        return self.graph_query_service.get_expanded_graph(*args, **kwargs)

    # ============================================================================
    # SECTION 6: CONFLICT RESOLUTION & MERGING (delegated to ConflictService)
    # ============================================================================

    def get_item_preview(self, item_id: str) -> Dict:
        """Get existing item data for merge preview"""
        return self.conflict_service.get_item_preview(item_id)

    def add_influences_to_existing(
        self, existing_item_id: str, new_data: StructuredOutput
    ) -> str:
        """Add new influences to an existing item"""
        return self.conflict_service.add_influences_to_existing(
            existing_item_id, new_data
        )

    def find_comprehensive_conflicts(self, new_data: StructuredOutput) -> Dict:
        """Find conflicts for main item AND all influences"""
        return self.conflict_service.find_comprehensive_conflicts(new_data)

    def get_comprehensive_preview(self, conflict_data: Dict) -> Dict:
        """Get preview data for main item and all conflicting influences"""
        return self.conflict_service.get_comprehensive_preview(conflict_data)

    # ============================================================================
    # SECTION 7: BULK DATA OPERATIONS (delegated to BulkService)
    # ============================================================================

    def save_structured_influences(self, structured_data: StructuredOutput) -> str:
        """Save complete structured influence data to database with scope support"""
        return self.bulk_service.save_structured_influences(structured_data)

    # ============================================================================
    # SECTION 8: ENHANCED CONTENT OPERATIONS
    # ============================================================================

    def save_enhanced_content(self, enhanced_content: EnhancedContent) -> str:
        """Save enhanced content to database"""
        from app.core.database.neo4j import neo4j_db

        # Convert embedded_data to JSON string to avoid Neo4j nested object issues
        embedded_data_json = (
            json.dumps(enhanced_content.embedded_data)
            if enhanced_content.embedded_data
            else None
        )

        with neo4j_db.driver.session() as session:
            # Create EnhancedContent node
            session.run(
                """
                CREATE (ec:EnhancedContent {
                    id: $id,
                    item_id: $item_id,
                    content_type: $content_type,
                    source: $source,
                    title: $title,
                    url: $url,
                    thumbnail: $thumbnail,
                    relevance_score: $relevance_score,
                    context_explanation: $context_explanation,
                    embedded_data: $embedded_data,
                    created_at: datetime()
                })
                """,
                {
                    "id": enhanced_content.id,
                    "item_id": enhanced_content.item_id,
                    "content_type": enhanced_content.content_type,
                    "source": enhanced_content.source,
                    "title": enhanced_content.title,
                    "url": enhanced_content.url,
                    "thumbnail": enhanced_content.thumbnail,
                    "relevance_score": enhanced_content.relevance_score,
                    "context_explanation": enhanced_content.context_explanation,
                    "embedded_data": embedded_data_json,
                },
            )

            # Create relationship to item
            session.run(
                """
                MATCH (i:Item {id: $item_id})
                MATCH (ec:EnhancedContent {id: $content_id})
                CREATE (i)-[:HAS_ENHANCED_CONTENT]->(ec)
                """,
                {
                    "item_id": enhanced_content.item_id,
                    "content_id": enhanced_content.id,
                },
            )

        return enhanced_content.id

    def get_enhanced_content(self, item_id: str) -> List[EnhancedContent]:
        """Get all enhanced content for an item"""
        from app.core.database.neo4j import neo4j_db

        with neo4j_db.driver.session() as session:
            result = session.run(
                """
                MATCH (i:Item {id: $item_id})-[:HAS_ENHANCED_CONTENT]->(ec:EnhancedContent)
                RETURN ec
                ORDER BY ec.created_at DESC
                """,
                {"item_id": item_id},
            )

            enhanced_content = []
            for record in result:
                node = record["ec"]

                # Parse embedded_data back from JSON string
                embedded_data = {}
                if node.get("embedded_data"):
                    try:
                        embedded_data = json.loads(node["embedded_data"])
                    except (json.JSONDecodeError, TypeError):
                        # If parsing fails, use empty dict
                        embedded_data = {}

                # Convert Neo4j DateTime to Python datetime
                created_at = node["created_at"]
                if hasattr(created_at, "to_native"):
                    created_at = created_at.to_native()

                enhanced_content.append(
                    EnhancedContent(
                        id=node["id"],
                        item_id=node["item_id"],
                        content_type=node["content_type"],
                        source=node["source"],
                        title=node["title"],
                        url=node["url"],
                        thumbnail=node.get("thumbnail"),
                        relevance_score=node["relevance_score"],
                        context_explanation=node["context_explanation"],
                        embedded_data=embedded_data,
                        created_at=created_at,
                    )
                )

            return enhanced_content

    def delete_enhanced_content(self, content_id: str) -> bool:
        """Delete a specific piece of enhanced content"""
        from app.core.database.neo4j import neo4j_db

        with neo4j_db.driver.session() as session:
            result = session.run(
                """
                MATCH (ec:EnhancedContent {id: $content_id})
                DETACH DELETE ec
                RETURN count(ec) as deleted
                """,
                {"content_id": content_id},
            )

            deleted_count = result.single()["deleted"]
            return deleted_count > 0

    def delete_all_enhanced_content(self, item_id: str) -> int:
        """Delete all enhanced content for an item"""
        from app.core.database.neo4j import neo4j_db

        with neo4j_db.driver.session() as session:
            result = session.run(
                """
                MATCH (i:Item {id: $item_id})-[:HAS_ENHANCED_CONTENT]->(ec:EnhancedContent)
                DETACH DELETE ec
                RETURN count(ec) as deleted
                """,
                {"item_id": item_id},
            )

            deleted_count = result.single()["deleted"]
            return deleted_count


# Global instance (maintains backward compatibility)
graph_service = GraphService()
