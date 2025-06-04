from neo4j import Session


def create_constraints(session: Session):
    """Create unique constraints and indexes"""
    constraints = [
        "CREATE CONSTRAINT item_id IF NOT EXISTS FOR (i:Item) REQUIRE i.id IS UNIQUE",
        "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
        "CREATE CONSTRAINT category_name IF NOT EXISTS FOR (c:Category) REQUIRE c.name IS UNIQUE",
    ]

    for constraint in constraints:
        session.run(constraint)


def create_indexes(session: Session):
    """Create performance indexes"""
    indexes = [
        "CREATE INDEX item_name IF NOT EXISTS FOR (i:Item) ON (i.name)",
        "CREATE INDEX item_year IF NOT EXISTS FOR (i:Item) ON (i.year)",
        "CREATE INDEX item_type IF NOT EXISTS FOR (i:Item) ON (i.type)",
    ]

    for index in indexes:
        session.run(index)


def setup_database():
    """Initialize database schema"""
    from app.core.database.neo4j import neo4j_db

    neo4j_db.connect()
    with neo4j_db.driver.session() as session:
        create_constraints(session)
        create_indexes(session)
    print("Database schema created successfully")
