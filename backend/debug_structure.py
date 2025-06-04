import asyncio
from app.services.ai_agents.research_agent import research_agent
from app.services.ai_agents.structure_agent import structure_agent


async def debug_full_flow():
    """Test the complete research -> structure flow"""

    print("=== TESTING FULL FLOW ===")

    # Step 1: Research
    print("1. Researching influences for Stan by Eminem...")
    influences_text = await research_agent.research_influences(
        item_name="Stan", item_type="song", artist="Eminem"
    )

    print(f"Research result length: {len(influences_text)}")
    print(f"Research result:\n{influences_text}\n")

    # Step 2: Structure
    print("2. Structuring the influences...")
    structured = await structure_agent.structure_influences(
        influences_text=influences_text,
        main_item="Stan",
        main_item_type="song",
        main_item_artist="Eminem",
    )

    print(f"3. Final result:")
    print(f"   Main item: {structured.main_item}")
    print(f"   Influences count: {len(structured.influences)}")
    print(f"   Categories: {structured.categories}")

    for i, inf in enumerate(structured.influences):
        print(f"   Influence {i + 1}: {inf.name} ({inf.confidence:.2f} confidence)")


if __name__ == "__main__":
    asyncio.run(debug_full_flow())
