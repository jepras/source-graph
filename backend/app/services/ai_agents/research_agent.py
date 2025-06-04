from typing import List, Dict, Any
from app.services.ai_agents.base_agent import BaseAgent


class ResearchAgent(BaseAgent):
    def __init__(self):
        super().__init__(temperature=0.3)  # Lower temperature for more focused research

    async def research_influences(
        self, item_name: str, item_type: str, artist: str = None
    ) -> str:
        """Research influences for a given item using LLM"""

        # Create a detailed system prompt for influence research
        system_message = """You are an expert researcher specializing in cultural influences and creative inspiration. 
        Your job is to identify the key influences that shaped a particular creative work.
        
        Focus on:
        - Direct musical samples or quotes
        - Literary techniques and narrative structures  
        - Personal experiences of the creator
        - Historical/cultural context
        - Other artistic works that inspired it
        - Production techniques or innovations
        
        Provide specific, factual influences with brief explanations of how they influenced the work.
        Be concise but informative."""

        # Create the human prompt with the specific item details
        if artist:
            human_message = f"Research the key influences that shaped '{item_name}' by {artist} ({item_type}). What directly influenced this {item_type}'s creation, style, content, or production?"
        else:
            human_message = f"Research the key influences that shaped '{item_name}' ({item_type}). What directly influenced this {item_type}'s creation, style, content, or production?"

        prompt = self.create_prompt(system_message, human_message)

        try:
            response = await self.invoke(
                prompt,
                {
                    "item_name": item_name,
                    "item_type": item_type,
                    "artist": artist or "Unknown",
                },
            )
            return response
        except Exception as e:
            return f"Error researching influences: {str(e)}"


# Global instance
research_agent = ResearchAgent()
