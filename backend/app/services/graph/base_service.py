import uuid
from app.core.database.neo4j import neo4j_db


class BaseGraphService:
    """
    Base service with common utilities for all graph services.

    Provides shared functionality like ID generation and database connection management.
    """

    def __init__(self):
        """Initialize the base service and connect to Neo4j database"""
        neo4j_db.connect()

    def generate_id(self, name: str, item_type: str = None) -> str:
        """Generate consistent ID for items and creators"""
        # Clean name for ID
        clean_name = name.lower().replace(" ", "-").replace("'", "").replace('"', "")
        clean_name = "".join(c for c in clean_name if c.isalnum() or c == "-")

        # Clean item_type for ID (sanitize item_type as well)
        if item_type:
            clean_type = (
                item_type.lower().replace(" ", "-").replace("'", "").replace('"', "")
            )
            clean_type = "".join(c for c in clean_type if c.isalnum() or c == "-")
            return f"{clean_name}-{clean_type}-{uuid.uuid4().hex[:8]}"
        else:
            return f"{clean_name}-{uuid.uuid4().hex[:8]}"

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
