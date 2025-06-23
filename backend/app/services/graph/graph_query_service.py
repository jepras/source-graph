from typing import List, Dict
from app.core.database.neo4j import neo4j_db
from app.models.item import Item, Creator, InfluenceRelation, GraphResponse
from .base_service import BaseGraphService


class GraphQueryService(BaseGraphService):
    """
    Service for graph query operations in the database.

    Handles complex graph queries including influence retrieval, expansions,
    and graph data aggregation.
    """

    def __init__(self, item_service=None):
        """Initialize with optional item service dependency"""
        super().__init__()
        self.item_service = item_service

    def get_influences(self, item_id: str, scopes: List[str] = None) -> GraphResponse:
        """Get item and its influences with optional scope filtering"""
        with neo4j_db.driver.session() as session:
            # Get main item
            main_item = self._get_item_by_id(item_id)
            if not main_item:
                raise ValueError(f"Item {item_id} not found")

            # Get influences with creators and optional scope filtering
            if scopes:
                # Build the IN clause manually since Neo4j driver has issues with list parameters
                scope_values = "', '".join(scopes)
                query = f"""
                MATCH (influence:Item)-[r:INFLUENCES]->(main:Item {{id: $item_id}})
                WHERE r.scope IN ['{scope_values}']
                OPTIONAL MATCH (influence)-[:CREATED_BY]->(creator:Creator)
                RETURN influence, r, r.clusters, creator
                ORDER BY influence.year ASC
                """

                # Category query with same filter
                category_query = f"""
                MATCH (influence:Item)-[r:INFLUENCES]->(:Item {{id: $item_id}})
                WHERE r.scope IN ['{scope_values}']
                RETURN DISTINCT r.category as category
                """
            else:
                query = """
                MATCH (influence:Item)-[r:INFLUENCES]->(main:Item {id: $item_id})
                OPTIONAL MATCH (influence)-[:CREATED_BY]->(creator:Creator)
                RETURN influence, r, r.clusters, creator
                ORDER BY influence.year ASC
                """

                # Category query without filter
                category_query = """
                MATCH (influence:Item)-[r:INFLUENCES]->(:Item {id: $item_id})
                RETURN DISTINCT r.category as category
                """

            params = {"item_id": item_id}

            result = session.run(query, params)

            influences = []
            for record in result:
                influence_node = record["influence"]
                relation = record["r"]
                creator_node = record.get("creator")

                # Build influence item
                influence_item = Item(
                    id=influence_node["id"],
                    name=influence_node["name"],
                    description=influence_node.get("description"),
                    year=influence_node.get("year"),
                    auto_detected_type=influence_node.get("auto_detected_type"),
                    confidence_score=influence_node.get("confidence_score"),
                    verification_status=influence_node.get(
                        "verification_status", "ai_generated"
                    ),
                )

                # Build influence relationship with scope
                influence_relation = InfluenceRelation(
                    from_item=influence_item,
                    to_item=main_item,
                    confidence=relation["confidence"],
                    influence_type=relation["influence_type"],
                    explanation=relation["explanation"],
                    category=relation["category"],
                    scope=relation.get("scope"),  # Will be None for existing data
                    source=relation.get("source"),
                    clusters=relation.get("clusters", []),
                )

                influences.append(influence_relation)

            # Get categories (with same scope filter)
            result = session.run(category_query, params)
            categories = [record["category"] for record in result if record["category"]]

            # Get available scopes (all scopes for this item, regardless of filter)
            scope_query = """
            MATCH (influence:Item)-[r:INFLUENCES]->(:Item {id: $item_id})
            WHERE r.scope IS NOT NULL
            RETURN DISTINCT r.scope as scope
            """

            result = session.run(scope_query, {"item_id": item_id})
            available_scopes = [record["scope"] for record in result if record["scope"]]

            # Get creators
            result = session.run(
                """
                MATCH (main:Item {id: $item_id})-[:CREATED_BY]->(creator:Creator)
                RETURN creator
                """,
                {"item_id": item_id},
            )
            creators = []
            for record in result:
                creator_node = record["creator"]
                creator = Creator(
                    id=creator_node["id"],
                    name=creator_node["name"],
                    type=creator_node["type"],
                )
                creators.append(creator)

            return GraphResponse(
                main_item=main_item,
                influences=influences,
                categories=categories,
                creators=creators,
                scopes=available_scopes,
            )

    def get_what_item_influences(self, item_id: str) -> List[InfluenceRelation]:
        """Get what this item influences (outgoing influences)"""
        with neo4j_db.driver.session() as session:
            result = session.run(
                """
                MATCH (main:Item {id: $item_id})-[r:INFLUENCES]->(influenced:Item)
                OPTIONAL MATCH (influenced)-[:CREATED_BY]->(creator:Creator)
                RETURN influenced, r, creator
                ORDER BY influenced.year DESC
                """,
                {"item_id": item_id},
            )

            main_item = self._get_item_by_id(item_id)
            influences = []

            for record in result:
                influenced_node = record["influenced"]
                relation = record["r"]
                creator_node = record.get("creator")

                influenced_item = Item(
                    id=influenced_node["id"],
                    name=influenced_node["name"],
                    auto_detected_type=influenced_node.get("auto_detected_type"),
                    year=influenced_node.get("year"),
                    description=influenced_node.get("description"),
                    confidence_score=influenced_node.get("confidence_score"),
                    verification_status=influenced_node.get(
                        "verification_status", "ai_generated"
                    ),
                )

                # Note: reversed relationship for "what this influences"
                influence_relation = InfluenceRelation(
                    from_item=main_item,
                    to_item=influenced_item,
                    confidence=relation["confidence"],
                    influence_type=relation["influence_type"],
                    explanation=relation["explanation"],
                    category=relation["category"],
                    source=relation.get("source"),
                    clusters=relation.get("clusters"),
                )
                influences.append(influence_relation)

            return influences

    def get_expansion_counts(self, item_id: str) -> Dict[str, int]:
        """Get counts for potential expansions (incoming and outgoing influences)"""
        with neo4j_db.driver.session() as session:
            # Count what influences this item (incoming)
            incoming_result = session.run(
                "MATCH (:Item)-[:INFLUENCES]->(i:Item {id: $item_id}) RETURN count(*) as count",
                {"item_id": item_id},
            )
            incoming_count = incoming_result.single()["count"]

            # Count what this item influences (outgoing)
            outgoing_result = session.run(
                "MATCH (i:Item {id: $item_id})-[:INFLUENCES]->(:Item) RETURN count(*) as count",
                {"item_id": item_id},
            )
            outgoing_count = outgoing_result.single()["count"]

            return {
                "incoming_influences": incoming_count,
                "outgoing_influences": outgoing_count,
            }

    def get_expanded_graph(
        self,
        center_item_id: str,
        include_incoming: bool = True,
        include_outgoing: bool = True,
        max_depth: int = 2,
    ) -> Dict:
        """Get expanded graph with multiple layers of influences"""

        try:
            with neo4j_db.driver.session() as session:
                # Step 1: Get center item
                center_result = session.run(
                    "MATCH (center:Item {id: $center_id}) RETURN center",
                    {"center_id": center_item_id},
                )
                center_record = center_result.single()

                if not center_record:
                    return {"nodes": [], "relationships": []}

                center_node = center_record["center"]

                # Step 2: Collect all nodes and relationships
                all_nodes = []
                all_relationships = []

                # Add center item
                center_item = Item(
                    id=center_node["id"],
                    name=center_node["name"],
                    auto_detected_type=center_node.get("auto_detected_type"),
                    year=center_node.get("year"),
                    description=center_node.get("description"),
                    confidence_score=center_node.get("confidence_score"),
                    verification_status=center_node.get(
                        "verification_status", "ai_generated"
                    ),
                )

                all_nodes.append(
                    {"item": center_item, "creators": [], "is_center": True}
                )

                # Step 3: Get outgoing influences if requested
                if include_outgoing:
                    outgoing_result = session.run(
                        """
                        MATCH (center:Item {id: $center_id})-[r:INFLUENCES]->(influenced:Item)
                        OPTIONAL MATCH (influenced)-[:CREATED_BY]->(creator:Creator)
                        RETURN influenced, r, collect(creator) as creators
                        """,
                        {"center_id": center_item_id},
                    )

                    outgoing_count = 0
                    for record in outgoing_result:
                        outgoing_count += 1
                        influenced_node = record["influenced"]
                        relationship = record["r"]
                        creators = record["creators"]

                        # Add influenced item to nodes
                        influenced_item = Item(
                            id=influenced_node["id"],
                            name=influenced_node["name"],
                            auto_detected_type=influenced_node.get(
                                "auto_detected_type"
                            ),
                            year=influenced_node.get("year"),
                            description=influenced_node.get("description"),
                            confidence_score=influenced_node.get("confidence_score"),
                            verification_status=influenced_node.get(
                                "verification_status", "ai_generated"
                            ),
                        )

                        influenced_creators = [
                            Creator(id=c["id"], name=c["name"], type=c["type"])
                            for c in creators
                            if c
                        ]

                        all_nodes.append(
                            {
                                "item": influenced_item,
                                "creators": influenced_creators,
                                "is_center": False,
                            }
                        )

                        # Add relationship
                        all_relationships.append(
                            {
                                "from_id": center_item_id,
                                "to_id": influenced_node["id"],
                                "confidence": relationship["confidence"],
                                "influence_type": relationship["influence_type"],
                                "explanation": relationship["explanation"],
                                "category": relationship["category"],
                                "source": relationship.get("source"),
                                "clusters": relationship.get("clusters"),
                            }
                        )

                # Step 4: Get incoming influences if requested
                if include_incoming:
                    incoming_result = session.run(
                        """
                        MATCH (influence:Item)-[r:INFLUENCES]->(center:Item {id: $center_id})
                        OPTIONAL MATCH (influence)-[:CREATED_BY]->(creator:Creator)
                        RETURN influence, r, collect(creator) as creators
                        """,
                        {"center_id": center_item_id},
                    )

                    incoming_count = 0
                    for record in incoming_result:
                        incoming_count += 1
                        influence_node = record["influence"]
                        relationship = record["r"]
                        creators = record["creators"]

                        # Check if this node is already added (avoid duplicates)
                        existing_node = next(
                            (
                                node
                                for node in all_nodes
                                if node["item"].id == influence_node["id"]
                            ),
                            None,
                        )

                        if not existing_node:
                            # Add influence item to nodes
                            influence_item = Item(
                                id=influence_node["id"],
                                name=influence_node["name"],
                                auto_detected_type=influence_node.get(
                                    "auto_detected_type"
                                ),
                                year=influence_node.get("year"),
                                description=influence_node.get("description"),
                                confidence_score=influence_node.get("confidence_score"),
                                verification_status=influence_node.get(
                                    "verification_status", "ai_generated"
                                ),
                            )

                            influence_creators = [
                                Creator(id=c["id"], name=c["name"], type=c["type"])
                                for c in creators
                                if c
                            ]

                            all_nodes.append(
                                {
                                    "item": influence_item,
                                    "creators": influence_creators,
                                    "is_center": False,
                                }
                            )

                        # Add relationship
                        all_relationships.append(
                            {
                                "from_id": influence_node["id"],
                                "to_id": center_item_id,
                                "confidence": relationship["confidence"],
                                "influence_type": relationship["influence_type"],
                                "explanation": relationship["explanation"],
                                "category": relationship["category"],
                                "source": relationship.get("source"),
                                "clusters": relationship.get("clusters"),
                            }
                        )

                # Step 5: Get center item creators
                creator_result = session.run(
                    """
                    MATCH (center:Item {id: $center_id})-[:CREATED_BY]->(creator:Creator)
                    RETURN creator
                    """,
                    {"center_id": center_item_id},
                )

                center_creators = []
                for creator_record in creator_result:
                    creator_node = creator_record["creator"]
                    center_creators.append(
                        Creator(
                            id=creator_node["id"],
                            name=creator_node["name"],
                            type=creator_node["type"],
                        )
                    )

                # Update center item with creators
                center_node_data = next(node for node in all_nodes if node["is_center"])
                center_node_data["creators"] = center_creators

                return {
                    "nodes": all_nodes,
                    "relationships": all_relationships,
                }

        except Exception as e:
            raise Exception(f"Failed to get expanded graph: {str(e)}")

    def _get_item_by_id(self, item_id: str):
        """Helper method to get item by ID, using item service if available"""
        if self.item_service:
            return self.item_service.get_item_by_id(item_id)
        else:
            # Fallback to direct database query
            with neo4j_db.driver.session() as session:
                result = session.run(
                    "MATCH (i:Item {id: $item_id}) RETURN i", {"item_id": item_id}
                )
                record = result.single()
                if record:
                    node = record["i"]
                    return Item(
                        id=node["id"],
                        name=node["name"],
                        description=node.get("description"),
                        year=node.get("year"),
                        auto_detected_type=node.get("auto_detected_type"),
                        confidence_score=node.get("confidence_score"),
                        verification_status=node.get(
                            "verification_status", "ai_generated"
                        ),
                    )
            return None
