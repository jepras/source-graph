import pytest
import asyncio
import sys
from pathlib import Path

# Add the backend directory to Python path so imports work
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database.neo4j import neo4j_db
from app.services.graph.graph_service import GraphService


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def setup_test_database():
    """Set up test database connection"""
    # Connect to your existing database for now
    neo4j_db.connect()
    yield
    # Cleanup can be added here later if needed


@pytest.fixture
def graph_service(setup_test_database):
    """Provide a GraphService instance for testing"""
    return GraphService()


@pytest.fixture
def sample_test_items():
    """Provide sample test data"""
    return {
        "songs": [
            {"name": "Lose Yourself", "creator": "Eminem", "type": "song"},
            {"name": "Bohemian Rhapsody", "creator": "Queen", "type": "song"},
        ],
        "movies": [
            {"name": "The Matrix", "creator": "The Wachowskis", "type": "movie"},
        ],
        "books": [
            {"name": "1984", "creator": "George Orwell", "type": "book"},
        ],
    }


@pytest.fixture
def sample_structured_output():
    """Provide sample StructuredOutput for testing"""
    from app.models.structured import StructuredOutput, StructuredInfluence

    return StructuredOutput(
        main_item="Test Song",
        main_item_type="song",
        main_item_creator="Test Artist",
        main_item_creator_type="person",
        main_item_year=2020,
        main_item_description="A test song for testing purposes",
        influences=[
            StructuredInfluence(
                name="Influence 1",
                type="song",
                creator_name="Influence Artist 1",
                creator_type="person",
                year=2010,
                category="Musical Style",
                scope="macro",
                influence_type="genre influence",
                confidence=0.8,
                explanation="This song established the genre that influenced the main item",
                source="test",
                clusters=["hip-hop", "east-coast"],
            ),
            StructuredInfluence(
                name="Influence 2",
                type="album",
                creator_name="Influence Artist 2",
                creator_type="person",
                year=2015,
                category="Production Technique",
                scope="micro",
                influence_type="production technique",
                confidence=0.9,
                explanation="The production style was directly copied",
                source="test",
                clusters=["production", "mixing"],
            ),
        ],
        categories=["Musical Style", "Production Technique"],
    )
