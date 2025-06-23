#!/usr/bin/env python3

import asyncio
import logging
from app.services.ai_agents.enhancement_agent import EnhancementAgent
from app.services.graph.graph_service import graph_service

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_enhancement_with_real_item():
    """Test the enhancement agent with a real item from the database"""

    print("🔍 Searching for items in database...")

    # Search for some common items that might exist
    search_terms = [
        "Stan",
        "Eminem",
        "Dido",
        "Thank You",
        "Beatles",
        "Queen",
        "Pink Floyd",
    ]

    found_items = []
    for term in search_terms:
        try:
            items = graph_service.search_items(term)
            if items:
                found_items.extend(items)
                print(f"✅ Found {len(items)} items for '{term}':")
                for item in items:
                    print(f"   - {item.name} ({item.auto_detected_type}, {item.year})")
        except Exception as e:
            print(f"❌ Error searching for '{term}': {e}")

    if not found_items:
        print("❌ No items found in database. Creating a test item...")

        # Create a test item
        test_item = graph_service.create_item(
            name="Stan",
            description="Song by Eminem featuring Dido",
            year=2000,
            auto_detected_type="song",
            confidence_score=0.9,
        )
        print(f"✅ Created test item: {test_item.name} (ID: {test_item.id})")
        found_items = [test_item]

    # Use the first found item
    item_to_enhance = found_items[0]
    print(f"\n🎵 Testing enhancement for: {item_to_enhance.name}")
    print(f"   Type: {item_to_enhance.auto_detected_type}")
    print(f"   Year: {item_to_enhance.year}")
    print(f"   Description: {item_to_enhance.description}")
    print(f"   ID: {item_to_enhance.id}")

    # Initialize enhancement agent
    agent = EnhancementAgent()

    try:
        print("\n🚀 Starting enhancement pipeline...")

        # Test the enhancement pipeline
        result = await agent.enhance_item(item_to_enhance)

        print(f"\n✅ Enhancement completed!")
        print(f"📊 Analysis: {result.get('analysis', {}).get('item_type', 'unknown')}")
        print(f"🔧 Tools used: {result.get('tools_used', [])}")
        print(f"📝 Summary: {result.get('enhancement_summary', 'No summary')}")

        # Display enhanced content
        enhanced_content = result.get("enhanced_content", [])
        print(f"\n📺 Found {len(enhanced_content)} enhanced content pieces:")

        for i, content in enumerate(enhanced_content, 1):
            print(
                f"\n{i}. {content.get('content_type', 'unknown')} from {content.get('original_result', {}).get('tool', 'unknown')}"
            )
            print(f"   Title: {content.get('title', 'Untitled')}")
            print(f"   Creator: {content.get('creator', 'Unknown Creator')}")
            print(f"   URL: {content.get('url', 'No URL')}")
            print(f"   Score: {content.get('score', 0)}/10")
            print(f"   Explanation: {content.get('explanation', 'No explanation')}")

        if result.get("error"):
            print(f"\n❌ Error: {result['error']}")

        # Test the API endpoint as well
        print(f"\n🌐 Testing API endpoint...")
        from app.api.routes.enhancement import enhance_item
        from app.models.enhancement import EnhancementRequest

        # This would test the actual API endpoint
        # Note: This requires the FastAPI app to be running
        print("   API endpoint test would require running server")
        print("   You can test it manually with:")
        print(
            f"   curl -X POST 'http://localhost:8000/api/enhancement/items/{item_to_enhance.id}/enhance' \\"
        )
        print("        -H 'Content-Type: application/json' \\")
        print('        -d \'{"item_id": "' + item_to_enhance.id + "\"}'")

    except Exception as e:
        print(f"\n❌ Enhancement failed: {e}")
        logger.exception("Enhancement test failed")


if __name__ == "__main__":
    asyncio.run(test_enhancement_with_real_item())
