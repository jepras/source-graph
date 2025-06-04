from neo4j import Session


def create_sample_data(session: Session):
    """Create sample influence data for testing"""

    # Create categories
    categories = [
        {
            "name": "Audio Samples",
            "description": "Musical samples and audio influences",
        },
        {
            "name": "Literary Techniques",
            "description": "Narrative and poetic influences",
        },
        {
            "name": "Personal Experiences",
            "description": "Real-life events and experiences",
        },
    ]

    for category in categories:
        session.run(
            "MERGE (c:Category {name: $name, description: $description})", category
        )

    # Create sample items
    items = [
        {
            "id": "stan-eminem-2000",
            "name": "Stan",
            "artist": "Eminem",
            "type": "song",
            "year": 2000,
            "description": "Eminem's storytelling masterpiece about an obsessed fan",
        },
        {
            "id": "thank-you-dido-1999",
            "name": "Thank You",
            "artist": "Dido",
            "type": "song",
            "year": 1999,
            "description": "British singer-songwriter's melancholic track",
        },
        {
            "id": "epistolary-literature",
            "name": "Epistolary Literature",
            "artist": None,
            "type": "literary_technique",
            "year": 1740,
            "description": "Narrative technique using letters and documents",
        },
    ]

    for item in items:
        session.run(
            """
            MERGE (i:Item {id: $id})
            SET i.name = $name,
                i.type = $type,
                i.year = $year,
                i.description = $description,
                i.artist = $artist
            """,
            item,
        )

    # Create influence relationships
    influences = [
        {
            "from_id": "thank-you-dido-1999",
            "to_id": "stan-eminem-2000",
            "confidence": 0.95,
            "influence_type": "primary_sample",
            "source": "Producer The 45 King sampled Thank You for Stan's hook",
        },
        {
            "from_id": "epistolary-literature",
            "to_id": "stan-eminem-2000",
            "confidence": 0.85,
            "influence_type": "narrative_structure",
            "source": "Stan uses letter format characteristic of epistolary literature",
        },
    ]

    for influence in influences:
        session.run(
            """
            MATCH (from:Item {id: $from_id})
            MATCH (to:Item {id: $to_id})
            MERGE (from)-[r:INFLUENCES]->(to)
            SET r.confidence = $confidence,
                r.influence_type = $influence_type,
                r.source = $source
            """,
            influence,
        )

    # Connect items to categories
    connections = [
        ("thank-you-dido-1999", "Audio Samples"),
        ("epistolary-literature", "Literary Techniques"),
    ]

    for item_id, category_name in connections:
        session.run(
            """
            MATCH (i:Item {id: $item_id})
            MATCH (c:Category {name: $category_name})
            MERGE (i)-[:BELONGS_TO]->(c)
            """,
            {"item_id": item_id, "category_name": category_name},
        )


def load_sample_data():
    """Load sample data into database"""
    from app.core.database.neo4j import neo4j_db

    neo4j_db.connect()
    with neo4j_db.driver.session() as session:
        create_sample_data(session)
    print("Sample data loaded successfully")
