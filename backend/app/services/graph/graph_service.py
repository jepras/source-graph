from neo4j import Session
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from app.core.database.neo4j import neo4j_db
from app.models.item import Item, Creator, InfluenceRelation, GraphResponse
from app.models.structured import StructuredOutput, StructuredInfluence


class GraphService:
    def __init__(self):
        neo4j_db.connect()

    def generate_id(self, name: str, item_type: str = None) -> str:
        """Generate consistent ID for items"""
        # Clean name for ID
        clean_name = name.lower().replace(" ", "-").replace("'", "").replace('"', "")
        clean_name = "".join(c for c in clean_name if c.isalnum() or c == "-")

        if item_type:
            return f"{clean_name}-{item_type}-{uuid.uuid4().hex[:8]}"
        else:
            return f"{clean_name}-{uuid.uuid4().hex[:8]}"

    def create_item(
        self,
        name: str,
        description: str = None,
        year: int = None,
        auto_detected_type: str = None,
        confidence_score: float = None,
    ) -> Item:
        """Create a new item"""
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

    def create_influence_relationship(
        self,
        from_item_id: str,
        to_item_id: str,
        confidence: float,
        influence_type: str,
        explanation: str,
        category: str,
        source: str = None,
        year_of_influence: int = None,
    ):
        """Create influence relationship between items"""
        with neo4j_db.driver.session() as session:
            session.run(
                """
                MATCH (from:Item {id: $from_id})
                MATCH (to:Item {id: $to_id})
                MERGE (from)-[r:INFLUENCES]->(to)
                SET r.confidence = $confidence,
                    r.influence_type = $influence_type,
                    r.explanation = $explanation,
                    r.category = $category,
                    r.source = $source,
                    r.year_of_influence = $year_of_influence,
                    r.created_at = datetime()
                """,
                {
                    "from_id": from_item_id,
                    "to_id": to_item_id,
                    "confidence": confidence,
                    "influence_type": influence_type,
                    "explanation": explanation,
                    "category": category,
                    "source": source,
                    "year_of_influence": year_of_influence,
                },
            )

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

    def save_structured_influences(self, structured_data: StructuredOutput) -> str:
        """Save complete structured influence data to database"""

        # 1. Create or get main item
        main_item = self.create_item(
            name=structured_data.main_item,
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

        # 3. Process each influence
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

            # Create influence relationship
            self.create_influence_relationship(
                from_item_id=influence_item.id,
                to_item_id=main_item.id,
                confidence=influence.confidence,
                influence_type=influence.influence_type,
                explanation=influence.explanation,
                category=influence.category,
                source=influence.source,
                year_of_influence=influence.year,
            )

            # Ensure category exists
            self.ensure_category_exists(influence.category)

        return main_item.id

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

    def get_influences(self, item_id: str) -> GraphResponse:
        """Get item and its influences"""
        with neo4j_db.driver.session() as session:
            # Get main item
            main_item = self.get_item_by_id(item_id)
            if not main_item:
                raise ValueError(f"Item {item_id} not found")

            # Get influences with creators
            result = session.run(
                """
                MATCH (influence:Item)-[r:INFLUENCES]->(main:Item {id: $item_id})
                OPTIONAL MATCH (influence)-[:CREATED_BY]->(creator:Creator)
                RETURN influence, r, creator
                ORDER BY influence.year ASC
                """,
                {"item_id": item_id},
            )

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

                # Build influence relationship
                influence_relation = InfluenceRelation(
                    from_item=influence_item,
                    to_item=main_item,
                    confidence=relation["confidence"],
                    influence_type=relation["influence_type"],
                    explanation=relation["explanation"],
                    category=relation["category"],
                    source=relation.get("source"),
                )
                influences.append(influence_relation)

            # Get categories
            result = session.run(
                """
                MATCH (influence:Item)-[:INFLUENCES]->(:Item {id: $item_id})
                MATCH (influence)-[r:INFLUENCES]->(:Item {id: $item_id})
                RETURN DISTINCT r.category as category
                """,
                {"item_id": item_id},
            )
            categories = [record["category"] for record in result if record["category"]]

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
            )

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


# Global instance
graph_service = GraphService()
