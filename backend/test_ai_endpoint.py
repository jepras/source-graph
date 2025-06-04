import asyncio
import json
from app.models.ai import ResearchRequest
from app.services.ai_agents.research_agent import research_agent


async def test_research_agent():
    """Test the research agent directly"""
    print("Testing research agent...")

    response = await research_agent.research_influences(
        item_name="Stan", item_type="song", artist="Eminem"
    )

    print("Research Response:")
    print(response)
    print("-" * 50)


async def test_api_models():
    """Test the API models"""
    print("Testing API models...")

    request = ResearchRequest(item_name="Stan", item_type="song", artist="Eminem")

    print("Request model:", request.model_dump())


if __name__ == "__main__":
    asyncio.run(test_research_agent())
    asyncio.run(test_api_models())
