from neo4j import Session
import uuid


def generate_id(name: str, item_type: str = None) -> str:
    """Generate consistent ID for items"""
    clean_name = name.lower().replace(" ", "-").replace("'", "").replace('"', "")
    clean_name = "".join(c for c in clean_name if c.isalnum() or c == "-")

    if item_type:
        return f"{clean_name}-{item_type}-{uuid.uuid4().hex[:8]}"
    else:
        return f"{clean_name}-{uuid.uuid4().hex[:8]}"


def create_sample_data(session: Session):
    """Create sample influence data for testing"""

    # Create diverse examples showcasing new structure
    items = [
        {
            "id": generate_id("Stan", "song"),
            "name": "Stan",
            "auto_detected_type": "song",
            "year": 2000,
            "description": "Eminem's storytelling masterpiece about an obsessed fan",
            "verification_status": "user_verified",
        },
        {
            "id": generate_id("Thank You", "song"),
            "name": "Thank You",
            "auto_detected_type": "song",
            "year": 1999,
            "description": "British singer-songwriter's melancholic track",
            "verification_status": "user_verified",
        },
        {
            "id": generate_id("Epistolary Literature", "technique"),
            "name": "Epistolary Literature",
            "auto_detected_type": "literary_technique",
            "year": None,  # This was causing the issue
            "description": "Narrative technique using letters and documents",
            "verification_status": "community_verified",
        },
        {
            "id": generate_id("Sliding Doors", "movie"),
            "name": "Sliding Doors",
            "auto_detected_type": "movie",
            "year": 1998,
            "description": "British romantic comedy-drama film",
            "verification_status": "ai_generated",
        },
    ]

    creators = [
        {"id": generate_id("Eminem", "person"), "name": "Eminem", "type": "person"},
        {"id": generate_id("Dido", "person"), "name": "Dido", "type": "person"},
        {
            "id": generate_id("Literary Tradition", "collective"),
            "name": "Literary Tradition",
            "type": "collective",
        },
        {
            "id": generate_id("Peter Howitt", "person"),
            "name": "Peter Howitt",
            "type": "person",
        },
    ]

    # Create items - FIXED: Handle None values properly
    for item in items:
        # Build the SET clause dynamically to handle None values
        set_clauses = [
            "i.name = $name",
            "i.auto_detected_type = $auto_detected_type",
            "i.description = $description",
            "i.verification_status = $verification_status",
            "i.confidence_score = 0.8",
            "i.created_at = datetime()",
        ]

        # Only set year if it's not None
        if item["year"] is not None:
            set_clauses.append("i.year = $year")

        query = f"""
        MERGE (i:Item {{id: $id}})
        SET {", ".join(set_clauses)}
        """

        session.run(query, item)

    # Create creators
    for creator in creators:
        session.run(
            """
            MERGE (c:Creator {id: $id})
            SET c.name = $name,
                c.type = $type
            """,
            creator,
        )

    # Create creator relationships
    creator_relationships = [
        {"item_name": "Stan", "creator_name": "Eminem", "role": "artist"},
        {"item_name": "Thank You", "creator_name": "Dido", "role": "artist"},
        {
            "item_name": "Epistolary Literature",
            "creator_name": "Literary Tradition",
            "role": "tradition",
        },
        {
            "item_name": "Sliding Doors",
            "creator_name": "Peter Howitt",
            "role": "director",
        },
    ]

    for rel in creator_relationships:
        session.run(
            """
            MATCH (i:Item {name: $item_name})
            MATCH (c:Creator {name: $creator_name})
            MERGE (i)-[:CREATED_BY {role: $role}]->(c)
            """,
            rel,
        )

    # Create influence relationships
    influences = [
        {
            "from_name": "Thank You",
            "to_name": "Stan",
            "confidence": 0.95,
            "influence_type": "audio_sample",
            "explanation": "Dido's vocals and piano melody sampled as the main hook throughout Stan",
            "category": "Audio Samples & Music",
            "year_of_influence": 1999,
        },
        {
            "from_name": "Epistolary Literature",
            "to_name": "Stan",
            "confidence": 0.85,
            "influence_type": "literary_technique",
            "explanation": "Letter-writing narrative structure used to tell the fan's story",
            "category": "Literary Techniques",
            "year_of_influence": None,
        },
        {
            "from_name": "Sliding Doors",
            "to_name": "Thank You",
            "confidence": 0.7,
            "influence_type": "cinematic_influence",
            "explanation": "Producer The 45 King first heard Dido's song while watching this film",
            "category": "Cinematic Influences",
            "year_of_influence": 1998,
        },
    ]

    # Create influence relationships - FIXED: Handle None values
    for influence in influences:
        # Build the SET clause dynamically
        set_clauses = [
            "r.confidence = $confidence",
            "r.influence_type = $influence_type",
            "r.explanation = $explanation",
            "r.category = $category",
            "r.created_at = datetime()",
        ]

        # Only set year_of_influence if it's not None
        if influence["year_of_influence"] is not None:
            set_clauses.append("r.year_of_influence = $year_of_influence")

        query = f"""
        MATCH (from:Item {{name: $from_name}})
        MATCH (to:Item {{name: $to_name}})
        MERGE (from)-[r:INFLUENCES]->(to)
        SET {", ".join(set_clauses)}
        """

        session.run(query, influence)

    # Create categories
    categories = [
        "Audio Samples & Music",
        "Literary Techniques",
        "Cinematic Influences",
    ]
    for category in categories:
        session.run(
            """
            MERGE (cat:Category {name: $name})
            ON CREATE SET cat.usage_count = 1, cat.created_at = datetime()
            ON MATCH SET cat.usage_count = cat.usage_count + 1
            """,
            {"name": category},
        )


def load_sample_data():
    """Load sample data into database"""
    from app.core.database.neo4j import neo4j_db

    neo4j_db.connect()
    with neo4j_db.driver.session() as session:
        create_sample_data(session)
    print("Sample data loaded successfully")
