#!/usr/bin/env python3

import asyncio
import json
import logging
from app.services.ai_agents.enhancement_agent import EnhancementAgent
from app.models.item import Item

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_enhancement_agent():
    """Test the enhancement agent with a sample item"""

    # Create a sample item for testing
    test_item = Item(
        id="test-123",
        name="Stan",
        description="Song by Eminem featuring Dido",
        year=2000,
        auto_detected_type="song",
    )

    print(f"🎵 Testing enhancement for: {test_item.name}")

    # Initialize enhancement agent
    agent = EnhancementAgent()

    try:
        # Test the enhancement pipeline
        result = await agent.enhance_item(test_item)

        print(f"\n✅ Enhancement completed!")
        print(f"📊 Analysis: {result.get('analysis', {}).get('item_type', 'unknown')}")
        print(f"🔧 Tools used: {result.get('tools_used', [])}")
        print(f"📝 Summary: {result.get('enhancement_summary', 'No summary')}")

        # Display enhanced content
        enhanced_content = result.get("enhanced_content", [])
        print(f"\n📺 Found {len(enhanced_content)} enhanced content pieces:")

        # Debug: Show the structure of the first content item
        if enhanced_content:
            print(f"\n🔍 DEBUG - First content item structure:")
            first_item = enhanced_content[0]
            for key, value in first_item.items():
                print(f"   {key}: {type(value)} = {value}")

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

    except Exception as e:
        print(f"\n❌ Enhancement failed: {e}")
        logger.exception("Enhancement test failed")


async def test_mcp_client():
    """Test MCP client initialization"""

    print("\n🔧 Testing MCP client initialization...")

    try:
        from app.mcps.mcp_client import create_mcp_client

        # Test YouTube client
        youtube_client = create_mcp_client("youtube")
        if youtube_client:
            print("✅ YouTube MCP client created successfully")

            # Test initialization
            initialized = await youtube_client.initialize()
            if initialized:
                print(
                    f"✅ YouTube MCP client initialized with {len(youtube_client.available_tools)} tools"
                )

                # List available tools
                tools = youtube_client.list_available_tools()
                print("📋 Available tools:")
                for tool in tools:
                    print(f"   - {tool['name']}: {tool['description']}")
            else:
                print("❌ Failed to initialize YouTube MCP client")
        else:
            print("❌ Failed to create YouTube MCP client")

    except Exception as e:
        print(f"❌ MCP client test failed: {e}")
        logger.exception("MCP client test failed")


async def main():
    """Run all tests"""
    print("🚀 Starting Enhancement System Integration Tests")
    print("=" * 50)

    # Test MCP client first
    await test_mcp_client()

    print("\n" + "=" * 50)

    # Test enhancement agent
    await test_enhancement_agent()

    print("\n" + "=" * 50)
    print("🏁 Tests completed!")


if __name__ == "__main__":
    asyncio.run(main())
