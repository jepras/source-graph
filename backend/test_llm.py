import asyncio
from app.services.ai_agents.base_agent import BaseAgent


async def test_llm():
    try:
        agent = BaseAgent()
        prompt = agent.create_prompt(
            system_message="You are a helpful assistant.",
            human_message="Say 'Hello, LLM is working!' in exactly those words.",
        )

        response = await agent.invoke(prompt, {})
        print("LLM Response:", response)
        return True
    except Exception as e:
        print("LLM Error:", str(e))
        return False


if __name__ == "__main__":
    success = asyncio.run(test_llm())
    print("Test passed:", success)
