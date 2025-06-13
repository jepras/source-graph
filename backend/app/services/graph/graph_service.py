from neo4j import Session
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from app.core.database.neo4j import neo4j_db
from app.models.item import Item, Creator, InfluenceRelation, GraphResponse
from app.models.structured import StructuredOutput, StructuredInfluence


class GraphService:
    """
    Core service for managing influence graph data in Neo4j database.

    This service handles all database operations for:
    - Items (songs, movies, books, etc.)
    - Creators (artists, directors, authors, etc.)
    - Influence relationships between items
    - Graph queries and expansions
    - Conflict resolution and merging
    """

    def __init__(self):
        """Initialize the graph service and connect to Neo4j database"""
        neo4j_db.connect()

    # ============================================================================
    # SECTION 1: UTILITY FUNCTIONS
    # ============================================================================

    def generate_id(self, name: str, item_type: str = None) -> str:
        """Generate consistent ID for items and creators"""
        # Clean name for ID
        clean_name = name.lower().replace(" ", "-").replace("'", "").replace('"', "")
        clean_name = "".join(c for c in clean_name if c.isalnum() or c == "-")

        if item_type:
            return f"{clean_name}-{item_type}-{uuid.uuid4().hex[:8]}"
        else:
            return f"{clean_name}-{uuid.uuid4().hex[:8]}"

    # ============================================================================
    # SECTION 2: CORE ITEM OPERATIONS
    # ============================================================================

    def create_item(
        self,
        name: str,
        description: str = None,
        year: int = None,
        auto_detected_type: str = None,
        confidence_score: float = None,
    ) -> Item:
        """Create a new item in the database"""
        item_id = self.generate_id(name, auto_detected_type)

        with neo4j_db.driver.session() as session:
            result = session.run(
                """
                CREATE (i:Item {
                    id: $id,
                    name: $name,
                    description: $description,
                    year: $year,
                    auto_detected_type: $auto_detected_type,
                    confidence_score: $confidence_score,
                    verification_status: $verification_status,
                    created_at: datetime()
                })
                RETURN i
                """,
                {
                    "id": item_id,
                    "name": name,
                    "description": description,
                    "year": year,
                    "auto_detected_type": auto_detected_type,
                    "confidence_score": confidence_score,
                    "verification_status": "ai_generated",
                },
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
                    verification_status=node.get("verification_status", "ai_generated"),
                )

        raise Exception("Failed to create item")

    def get_item_by_id(self, item_id: str) -> Optional[Item]:
        """Get single item by ID"""
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
                    verification_status=node.get("verification_status", "ai_generated"),
                )
        return None

    def search_items(self, query: str) -> List[Item]:
        """Search items by name"""
        with neo4j_db.driver.session() as session:
            result = session.run(
                """
                MATCH (i:Item)
                WHERE toLower(i.name) CONTAINS toLower($query)
                OPTIONAL MATCH (i)-[:CREATED_BY]->(c:Creator)
                WHERE toLower(c.name) CONTAINS toLower($query)
                RETURN DISTINCT i
                ORDER BY i.name
                LIMIT 10
                """,
                {"query": query},
            )

            items = []
            for record in result:
                node = record["i"]
                item = Item(
                    id=node["id"],
                    name=node["name"],
                    description=node.get("description"),
                    year=node.get("year"),
                    auto_detected_type=node.get("auto_detected_type"),
                    confidence_score=node.get("confidence_score"),
                    verification_status=node.get("verification_status", "ai_generated"),
                )
                items.append(item)

            return items

    # ============================================================================
    # SECTION 3: CREATOR OPERATIONS
    # ============================================================================

    def create_creator(self, name: str, creator_type: str = "person") -> Creator:
        """Create or get existing creator"""
        creator_id = self.generate_id(name, creator_type)

        with neo4j_db.driver.session() as session:
            # Try to find existing creator first
            result = session.run(
                "MATCH (c:Creator {name: $name}) RETURN c", {"name": name}
            )

            record = result.single()
            if record:
                node = record["c"]
                return Creator(id=node["id"], name=node["name"], type=node["type"])

            # Create new creator
            result = session.run(
                """
                CREATE (c:Creator {
                    id: $id,
                    name: $name,
                    type: $type
                })
                RETURN c
                """,
                {"id": creator_id, "name": name, "type": creator_type},
            )

            record = result.single()
            if record:
                node = record["c"]
                return Creator(id=node["id"], name=node["name"], type=node["type"])

        raise Exception("Failed to create creator")

    def link_creator_to_item(
        self, item_id: str, creator_id: str, role: str = "creator"
    ):
        """Link creator to item"""
        with neo4j_db.driver.session() as session:
            session.run(
                """
                MATCH (i:Item {id: $item_id})
                MATCH (c:Creator {id: $creator_id})
                MERGE (i)-[:CREATED_BY {role: $role}]->(c)
                """,
                {"item_id": item_id, "creator_id": creator_id, "role": role},
            )

    # ============================================================================
    # SECTION 4: INFLUENCE RELATIONSHIP OPERATIONS
    # ============================================================================

    def create_influence_relationship(
        self,
        from_item_id: str,
        to_item_id: str,
        confidence: float,
        influence_type: str,
        explanation: str,
        category: str,
        scope: str = "macro",
        source: str = None,
        year_of_influence: int = None,
        clusters: List[str] = None,
    ):
        """Create influence relationship between items with scope support"""
        try:
            with neo4j_db.driver.session() as session:
                result = session.run(
                    """
                    MATCH (from:Item {id: $from_id})
                    MATCH (to:Item {id: $to_id})
                    MERGE (from)-[r:INFLUENCES]->(to)
                    SET r.confidence = $confidence,
                        r.influence_type = $influence_type,
                        r.explanation = $explanation,
                        r.category = $category,
                        r.scope = $scope,
                        r.source = $source,
                        r.year_of_influence = $year_of_influence,
                        r.clusters = $clusters,
                        r.created_at = datetime()
                    RETURN r.clusters as saved_clusters
                    """,
                    {
                        "from_id": from_item_id,
                        "to_id": to_item_id,
                        "confidence": confidence,
                        "influence_type": influence_type,
                        "explanation": explanation,
                        "category": category,
                        "scope": scope,
                        "source": source,
                        "year_of_influence": year_of_influence,
                        "clusters": clusters,
                    },
                )

        except Exception as e:
            raise  # Re-raise the exception

    def ensure_category_exists(self, category_name: str):
        """Create category if it doesn't exist"""
        with neo4j_db.driver.session() as session:
            session.run(
                """
                MERGE (cat:Category {name: $name})
                ON CREATE SET cat.usage_count = 1, cat.created_at = datetime()
                ON MATCH SET cat.usage_count = cat.usage_count + 1
                """,
                {"name": category_name},
            )

    # ============================================================================
    # SECTION 5: GRAPH QUERY OPERATIONS
    # ============================================================================

    def get_influences(self, item_id: str, scopes: List[str] = None) -> GraphResponse:
        """Get item and its influences with optional scope filtering"""
        with neo4j_db.driver.session() as session:
            # Get main item
            main_item = self.get_item_by_id(item_id)
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

            main_item = self.get_item_by_id(item_id)
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

    # ============================================================================
    # SECTION 6: CONFLICT RESOLUTION & MERGING
    # ============================================================================

    def find_similar_items(self, name: str, creator_name: str = None) -> List[Dict]:
        """Find existing items that might be the same as what user wants to create"""
        with neo4j_db.driver.session() as session:
            # Loose matching using CONTAINS and fuzzy logic
            fuzzy_query = """
            MATCH (i:Item) 
            OPTIONAL MATCH (i)-[:CREATED_BY]->(c:Creator)
            WITH i, collect(c.name) as creators,
                // Calculate similarity score
                CASE 
                    WHEN toLower(i.name) = toLower($name) THEN 100
                    WHEN toLower(i.name) CONTAINS toLower($name) THEN 80
                    WHEN toLower($name) CONTAINS toLower(i.name) THEN 70
                    ELSE 50
                END as name_score
            WHERE name_score >= 50
            OR any(creator IN creators WHERE toLower(creator) CONTAINS toLower($creator_name))
            RETURN i, creators, name_score
            ORDER BY name_score DESC
            LIMIT 5
            """

            results = session.run(
                fuzzy_query, {"name": name, "creator_name": creator_name or ""}
            )

            similar_items = []

            for record in results:
                node = record["i"]
                creators = record["creators"]
                score = record["name_score"]

                # Get existing influences count
                influence_count = session.run(
                    "MATCH (:Item)-[:INFLUENCES]->(i:Item {id: $id}) RETURN count(*) as count",
                    {"id": node["id"]},
                ).single()["count"]

                item_data = {
                    "id": node["id"],
                    "name": node["name"],
                    "auto_detected_type": node.get("auto_detected_type"),
                    "year": node.get("year"),
                    "description": node.get("description"),
                    "confidence_score": node.get("confidence_score"),
                    "verification_status": node.get("verification_status"),
                    "creators": [c for c in creators if c],
                    "existing_influences_count": influence_count,
                    "similarity_score": score,
                }
                similar_items.append(item_data)

            return similar_items

    def get_item_preview(self, item_id: str) -> Dict:
        """Get existing item data for merge preview"""
        try:
            graph_data = self.get_influences(item_id)

            return {
                "main_item": {
                    "id": graph_data.main_item.id,
                    "name": graph_data.main_item.name,
                    "auto_detected_type": graph_data.main_item.auto_detected_type,
                    "year": graph_data.main_item.year,
                    "description": graph_data.main_item.description,
                    "verification_status": graph_data.main_item.verification_status,
                },
                "creators": [
                    {"name": creator.name, "type": creator.type}
                    for creator in graph_data.creators
                ],
                "existing_influences": [
                    {
                        "name": inf.from_item.name,
                        "category": inf.category,
                        "confidence": inf.confidence,
                        "explanation": inf.explanation,
                        "creator": getattr(inf.from_item, "creator", None),
                    }
                    for inf in graph_data.influences
                ],
                "categories": graph_data.categories,
            }
        except Exception as e:
            return {"error": str(e)}

    def add_influences_to_existing(
        self, existing_item_id: str, new_data: StructuredOutput
    ) -> str:
        """Add new influences to an existing item"""

        try:
            # Get existing item
            existing_item = self.get_item_by_id(existing_item_id)
            if not existing_item:
                raise ValueError(f"Existing item {existing_item_id} not found")

            # Update main item creator if new one provided and none exists
            if new_data.main_item_creator:
                with neo4j_db.driver.session() as session:
                    existing_creators = session.run(
                        "MATCH (i:Item {id: $id})-[:CREATED_BY]->(c:Creator) RETURN count(c) as count",
                        {"id": existing_item_id},
                    ).single()["count"]

                    if existing_creators == 0:
                        creator = self.create_creator(
                            name=new_data.main_item_creator,
                            creator_type=new_data.main_item_creator_type or "person",
                        )
                        self.link_creator_to_item(
                            existing_item_id, creator.id, "primary_creator"
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

                # FIXED: Check for duplicates using Python instead of Cypher
                with neo4j_db.driver.session() as session:
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
                        influence_item = self.create_item(
                            name=influence_name,
                            description=f"Influence on {existing_item.name} (merged)",
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
                                influence_creator = self.create_creator(
                                    name=creator_name,
                                    creator_type=influence.creator_type or "person",
                                )
                                self.link_creator_to_item(
                                    influence_item.id,
                                    influence_creator.id,
                                    "primary_creator",
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

                        self.create_influence_relationship(
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

    # ============================================================================
    # SECTION 7: BULK DATA OPERATIONS
    # ============================================================================

    def save_structured_influences(self, structured_data: StructuredOutput) -> str:
        """Save complete structured influence data to database with scope support"""

        # 1. Create or get main item
        main_item = self.create_item(
            name=structured_data.main_item,
            description=structured_data.main_item_description,  # ADD this line
            auto_detected_type=structured_data.main_item_type,
            year=structured_data.main_item_year,
        )

        # 2. Create main item creator if provided
        if structured_data.main_item_creator:
            creator = self.create_creator(
                name=structured_data.main_item_creator,
                creator_type=structured_data.main_item_creator_type or "person",
            )
            self.link_creator_to_item(main_item.id, creator.id, "primary_creator")

        # 3. Process each influence with scope
        for influence in structured_data.influences:
            # Create influence item
            influence_item = self.create_item(
                name=influence.name,
                auto_detected_type=influence.type,
                year=influence.year,
            )

            # Create influence creator if provided
            if influence.creator_name:
                influence_creator = self.create_creator(
                    name=influence.creator_name,
                    creator_type=influence.creator_type or "person",
                )
                self.link_creator_to_item(
                    influence_item.id, influence_creator.id, "primary_creator"
                )

            # Create influence relationship with scope
            self.create_influence_relationship(
                from_item_id=influence_item.id,
                to_item_id=main_item.id,
                confidence=influence.confidence,
                influence_type=influence.influence_type,
                explanation=influence.explanation,
                category=influence.category,
                scope=influence.scope,  # Now includes scope
                source=influence.source,
                year_of_influence=influence.year,
                clusters=influence.clusters,  # ADD THIS LINE
            )

            # Ensure category exists
            self.ensure_category_exists(influence.category)

        return main_item.id


# Global instance
graph_service = GraphService()
