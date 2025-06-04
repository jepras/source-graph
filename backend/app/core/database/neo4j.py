from neo4j import GraphDatabase
from app.config import settings


class Neo4jConnection:
    def __init__(self):
        self.driver = None

    def connect(self):
        self.driver = GraphDatabase.driver(
            settings.NEO4J_URI, auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )

    def close(self):
        if self.driver:
            self.driver.close()

    def test_connection(self):
        with self.driver.session() as session:
            result = session.run("RETURN 'Connection successful' as message")
            return result.single()["message"]


# Global instance
neo4j_db = Neo4jConnection()
