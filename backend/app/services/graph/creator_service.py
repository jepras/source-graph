from app.core.database.neo4j import neo4j_db
from app.models.item import Creator
from .base_service import BaseGraphService


class CreatorService(BaseGraphService):
    """
    Service for managing Creator entities in the graph database.

    Handles creation and linking of creators to items.
    """

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
