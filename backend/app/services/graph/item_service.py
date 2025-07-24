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
            # Normalize the search name for better matching
            normalized_search_name = self._normalize_text(name)

            # Word-based matching with stop word filtering
            fuzzy_query = """
            MATCH (i:Item) 
            OPTIONAL MATCH (i)-[:CREATED_BY]->(c:Creator)
            WITH i, collect(c.name) as creators, 
                 [word IN split(toLower(i.name), ' ') WHERE size(word) >= 3 AND NOT word IN ['the', 'and', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'a', 'an', 'as', 'is', 'it', 'that', 'this', 'was', 'will', 'be', 'have', 'had', 'has', 'do', 'does', 'did', 'or', 'but', 'not', 'so', 'if', 'then', 'else', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'only', 'own', 'same', 'than', 'too', 'very', 'can', 'may', 'must', 'shall', 'should', 'would', 'could']] as item_words
            WITH i, creators, item_words, split($normalized_search_name, ' ') as search_words
            WITH i, creators, item_words, 
                 [word IN search_words WHERE size(word) >= 3 AND NOT word IN ['the', 'and', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'a', 'an', 'as', 'is', 'it', 'that', 'this', 'was', 'will', 'be', 'have', 'had', 'has', 'do', 'does', 'did', 'or', 'but', 'not', 'so', 'if', 'then', 'else', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'only', 'own', 'same', 'than', 'too', 'very', 'can', 'may', 'must', 'shall', 'should', 'would', 'could']] as filtered_search_words
            WITH i, creators, item_words, filtered_search_words,
                 size([word IN filtered_search_words WHERE word IN item_words]) as matches,
                 size(filtered_search_words) as total_search_words
            WHERE (matches > 0 AND matches >= total_search_words * 0.6)
            OR (toLower(i.name) = toLower($normalized_search_name))
            OR (toLower(i.name) CONTAINS toLower($normalized_search_name) AND size($normalized_search_name) >= 4)
            OR (toLower($normalized_search_name) CONTAINS toLower(i.name) AND size(i.name) >= 4)
            OR ($creator_name IS NOT NULL AND $creator_name <> '' 
                AND any(creator IN creators WHERE toLower(creator) CONTAINS toLower($creator_name)))
            RETURN i, creators, item_words, filtered_search_words, matches, total_search_words
            ORDER BY matches DESC, total_search_words ASC
            LIMIT 5
            """

            results = session.run(
                fuzzy_query,
                {
                    "name": name,
                    "normalized_search_name": normalized_search_name,
                    "creator_name": creator_name or "",
                },
            )

            similar_items = []

            for record in results:
                node = record["i"]
                creators = record["creators"]
                item_words = record["item_words"]
                filtered_search_words = record["filtered_search_words"]
                matches = record["matches"]
                total_search_words = record["total_search_words"]

                # Calculate similarity score
                if total_search_words > 0:
                    word_overlap_score = (matches / total_search_words) * 100
                else:
                    word_overlap_score = 0

                # Calculate final score based on different matching criteria
                item_name_normalized = self._normalize_text(node["name"])
                search_name_normalized = normalized_search_name

                if item_name_normalized == search_name_normalized:
                    score = 100
                elif (
                    item_name_normalized in search_name_normalized
                    and len(search_name_normalized) >= 4
                ):
                    score = 90
                elif (
                    search_name_normalized in item_name_normalized
                    and len(item_name_normalized) >= 4
                ):
                    score = 85
                elif word_overlap_score >= 60:
                    score = min(80, word_overlap_score)
                else:
                    score = 0

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

    def update_item(self, item_id: str, update_data: dict) -> Optional[Item]:
        """Update an existing item with new data"""
        with neo4j_db.driver.session() as session:
            try:
                # Build dynamic SET clause for only provided fields
                set_clauses = []
                params = {"item_id": item_id}

                for field, value in update_data.items():
                    if value is not None:  # Only update non-None values
                        set_clauses.append(f"i.{field} = ${field}")
                        params[field] = value

                if not set_clauses:
                    # No fields to update, just return the item
                    return self.get_item_by_id(item_id)

                set_clause = ", ".join(set_clauses)

                result = session.run(
                    f"""
                    MATCH (i:Item {{id: $item_id}})
                    SET {set_clause}
                    RETURN i
                    """,
                    params,
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

            except Exception as e:
                raise Exception(f"Failed to update item: {str(e)}")

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

    def _normalize_text(self, text: str) -> str:
        """Normalize text for better matching by removing punctuation and normalizing spaces"""
        if not text:
            return ""

        # Convert to lowercase
        normalized = text.lower()

        # Replace common punctuation with spaces
        normalized = normalized.replace("'", " ")  # Handle apostrophes
        normalized = normalized.replace("&", " ")  # Handle ampersands
        normalized = normalized.replace("-", " ")  # Handle hyphens
        normalized = normalized.replace("_", " ")  # Handle underscores

        # Remove other punctuation
        import re

        normalized = re.sub(r"[^\w\s]", " ", normalized)

        # Normalize multiple spaces to single space
        normalized = re.sub(r"\s+", " ", normalized)

        # Strip leading/trailing spaces
        normalized = normalized.strip()

        return normalized
