#!/usr/bin/env python3
"""
Test script to verify enhancement fixes
"""

import asyncio
import json
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from app.services.ai_agents.enhancement_agent import EnhancementAgent
from app.models.item import Item


async def test_enhancement_fixes():
    """Test that the enhancement fixes work correctly"""

    print("Testing enhancement fixes...")
    print("=" * 60)

    # Create a test item
    test_item = Item(
        id="test-123",
        name="My Way by Frank Sinatra",
        description="A classic song by Frank Sinatra",
        clusters=["music", "jazz", "vocal"],
        created_at="2024-01-01T00:00:00Z",
    )

    # Create enhancement agent
    agent = EnhancementAgent()

    # Test with different max_content_pieces values
    test_cases = [2, 4, 6]

    for max_pieces in test_cases:
        print(f"\nTesting with max_content_pieces = {max_pieces}")
        print("-" * 40)

        # Test the scoring method directly
        sample_results = [
            {
                "tool": "youtube",
                "query": "My Way Frank Sinatra",
                "result": {"content": ["test1", "test2"]},
                "video_data": {
                    "title": "&quot;My Way&quot; by Frank Sinatra | Tutorial",
                    "description": "Learn &quot;My Way&quot; on piano",
                    "channel_title": "Piano Tutorials &amp; More",
                    "url": "https://youtube.com/watch?v=test1",
                    "thumbnail_url": "https://example.com/thumb1.jpg",
                },
            },
            {
                "tool": "youtube",
                "query": "My Way analysis",
                "result": {"content": ["test3", "test4"]},
                "video_data": {
                    "title": "Frank Sinatra &quot;My Way&quot; Analysis",
                    "description": "Deep dive into &quot;My Way&quot;",
                    "channel_title": "Music Analysis &amp; Reviews",
                    "url": "https://youtube.com/watch?v=test2",
                    "thumbnail_url": "https://example.com/thumb2.jpg",
                },
            },
            {
                "tool": "spotify",
                "query": "My Way Frank Sinatra",
                "result": {"content": ["test5"]},
                "video_data": None,
            },
        ]

        # Test scoring with the new parameter
        scored_content = await agent.score_and_filter_content(
            sample_results,
            test_item,
            {"item_type": "song", "primary_clusters": ["music"]},
            max_pieces,
        )

        print(f"Scored content count: {len(scored_content)}")
        assert (
            len(scored_content) <= max_pieces
        ), f"Expected <= {max_pieces}, got {len(scored_content)}"

        # Test that sources are properly set
        for content in scored_content:
            original_result = content.get("original_result", {})
            source = original_result.get("tool", "unknown")
            print(f"  Source: {source}")
            assert source != "unknown", "Source should not be unknown"

    print("\n" + "=" * 60)
    print("✅ All enhancement fixes are working correctly!")
    return True


if __name__ == "__main__":
    success = asyncio.run(test_enhancement_fixes())
    if not success:
        sys.exit(1)
