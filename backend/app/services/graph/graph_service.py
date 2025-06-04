from neo4j import Session
from typing import List, Optional
from app.core.database.neo4j import neo4j_db
from app.models.item import Item, InfluenceRelation, GraphResponse


class GraphService:
    def __init__(self):
        neo4j_db.connect()

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
                    type=node["type"],
                    year=node.get("year"),
                    description=node.get("description"),
                    artist=node.get("artist"),
                )
        return None

    def get_influences(self, item_id: str) -> GraphResponse:
        """Get item and its influences"""
        with neo4j_db.driver.session() as session:
            # Get main item
            main_item = self.get_item_by_id(item_id)
            if not main_item:
                raise ValueError(f"Item {item_id} not found")

            # Get influences
            result = session.run(
                """
                MATCH (influence:Item)-[r:INFLUENCES]->(main:Item {id: $item_id})
                RETURN influence, r
                ORDER BY influence.year ASC
                """,
                {"item_id": item_id},
            )

            influences = []
            for record in result:
                influence_node = record["influence"]
                relation = record["r"]

                influence_item = Item(
                    id=influence_node["id"],
                    name=influence_node["name"],
                    type=influence_node["type"],
                    year=influence_node.get("year"),
                    description=influence_node.get("description"),
                    artist=influence_node.get("artist"),
                )

                influence_relation = InfluenceRelation(
                    from_item=influence_item,
                    to_item=main_item,
                    confidence=relation["confidence"],
                    influence_type=relation["influence_type"],
                    source=relation.get("source"),
                )
                influences.append(influence_relation)

            # Get categories
            result = session.run(
                """
                MATCH (influence:Item)-[:INFLUENCES]->(:Item {id: $item_id})
                MATCH (influence)-[:BELONGS_TO]->(c:Category)
                RETURN DISTINCT c.name as category
                """,
                {"item_id": item_id},
            )
            categories = [record["category"] for record in result]

            return GraphResponse(
                main_item=main_item, influences=influences, categories=categories
            )

    def search_items(self, query: str) -> List[Item]:
        """Search items by name"""
        with neo4j_db.driver.session() as session:
            result = session.run(
                """
                MATCH (i:Item)
                WHERE toLower(i.name) CONTAINS toLower($query)
                   OR toLower(i.artist) CONTAINS toLower($query)
                RETURN i
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
                    type=node["type"],
                    year=node.get("year"),
                    description=node.get("description"),
                    artist=node.get("artist"),
                )
                items.append(item)

            return items


# Global instance
graph_service = GraphService()
