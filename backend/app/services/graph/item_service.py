from typing import List, Optional
from app.core.database.neo4j import neo4j_db
from app.models.item import Item
from .base_service import BaseGraphService


class ItemService(BaseGraphService):
    """
    Service for managing Item entities in the graph database.

    Handles CRUD operations for items including creation, retrieval, search,
    and deletion.
    """

    def create_item(
        self,
        name: str,
        auto_detected_type: str = None,
        year: int = None,
        description: str = None,
        confidence_score: float = None,
        verification_status: str = "ai_generated",
    ) -> Item:
        """Create a new item in the database"""
        try:
            item_id = self.generate_id(name, auto_detected_type)

            with neo4j_db.driver.session() as session:
                result = session.run(
                    """
                    CREATE (i:Item {
                        id: $id,
                        name: $name,
                        auto_detected_type: $auto_detected_type,
                        year: $year,
                        description: $description,
                        confidence_score: $confidence_score,
                        verification_status: $verification_status,
                        created_at: datetime()
                    })
                    RETURN i
                    """,
                    {
                        "id": item_id,
                        "name": name,
                        "auto_detected_type": auto_detected_type,
                        "year": year,
                        "description": description,
                        "confidence_score": confidence_score,
                        "verification_status": verification_status,
                    },
                )

                item_data = result.single()["i"]
                return Item(
                    id=item_data["id"],
                    name=item_data["name"],
                    auto_detected_type=item_data.get("auto_detected_type"),
                    year=item_data.get("year"),
                    description=item_data.get("description"),
                    confidence_score=item_data.get("confidence_score"),
                    verification_status=item_data.get("verification_status"),
                )

        except Exception as e:
            raise Exception(f"Failed to create item: {str(e)}")

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

    def find_similar_items(self, name: str, creator_name: str = None) -> List[dict]:
        """Find existing items that might be the same as what user wants to create"""
        with neo4j_db.driver.session() as session:
            # Loose matching using CONTAINS and fuzzy logic
            fuzzy_query = """
            MATCH (i:Item) 
            OPTIONAL MATCH (i)-[:CREATED_BY]->(c:Creator)
            WITH i, collect(c.name) as creators,
                CASE 
                    WHEN toLower(i.name) = toLower($name) THEN 100
                    WHEN toLower(i.name) CONTAINS toLower($name) AND size($name) >= 4 THEN 80
                    WHEN toLower($name) CONTAINS toLower(i.name) AND size(i.name) >= 4 THEN 70
                    ELSE 0
                END as name_score
            WHERE name_score >= 70
            OR ($creator_name IS NOT NULL AND $creator_name <> '' 
                AND any(creator IN creators WHERE toLower(creator) CONTAINS toLower($creator_name)))
            RETURN i, creators, name_score
            ORDER BY name_score DESC
            LIMIT 3
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

    def delete_item_completely(self, item_id: str) -> bool:
        """Delete item and all its relationships"""
        with neo4j_db.driver.session() as session:
            try:
                # Delete all relationships first, then the item
                session.run(
                    """
                    MATCH (i:Item {id: $item_id})
                    DETACH DELETE i
                    """,
                    {"item_id": item_id},
                )
                return True
            except Exception as e:
                raise Exception(f"Failed to delete item: {str(e)}")

    def merge_items(self, source_item_id: str, target_item_id: str) -> str:
        """Transfer all relationships from source to target, delete source"""
        with neo4j_db.driver.session() as session:
            try:
                # Transfer incoming influences (what influenced source -> what influenced target)
                session.run(
                    """
                    MATCH (inf:Item)-[r:INFLUENCES]->(source:Item {id: $source_id})
                    MATCH (target:Item {id: $target_id})
                    WHERE NOT EXISTS((inf)-[:INFLUENCES]->(target))
                    CREATE (inf)-[new_r:INFLUENCES]->(target)
                    SET new_r = r
                    DELETE r
                    """,
                    {"source_id": source_item_id, "target_id": target_item_id},
                )

                # Transfer outgoing influences (source influenced -> target influenced)
                session.run(
                    """
                    MATCH (source:Item {id: $source_id})-[r:INFLUENCES]->(inf:Item)
                    MATCH (target:Item {id: $target_id})
                    WHERE NOT EXISTS((target)-[:INFLUENCES]->(inf))
                    CREATE (target)-[new_r:INFLUENCES]->(inf)
                    SET new_r = r
                    DELETE r
                    """,
                    {"source_id": source_item_id, "target_id": target_item_id},
                )

                # Delete the source item
                session.run(
                    "MATCH (source:Item {id: $source_id}) DETACH DELETE source",
                    {"source_id": source_item_id},
                )

                return target_item_id

            except Exception as e:
                raise Exception(f"Failed to merge items: {str(e)}")
