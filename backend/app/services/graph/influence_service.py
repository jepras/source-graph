from typing import List
from app.core.database.neo4j import neo4j_db
from .base_service import BaseGraphService


class InfluenceService(BaseGraphService):
    """
    Service for managing influence relationships in the graph database.

    Handles creation and management of influence relationships between items.
    """

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
