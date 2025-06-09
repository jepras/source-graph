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
        
        CRITICAL REQUIREMENT: Every single item and influence MUST have a specific year. Exact years only, not decades or anything. This is absolutely mandatory.
        It can be difficult to get an exact year for every thing, but do a best guess for things in any case. This also includes things that might last over a longer time period or are otherwise difficult to pinpoint a specific year to. 
        
        If there is something you cannot determine even an approximate year for an influence, include that in the end of the response under a headline called Ommitted Items. 
        
        Structure of output:
        - Short description of what the main item researched is. Use one line maximum. This description must include a best guess of the year of this item. 
        - A numbered list of influences, ranking from highest influence to lowest. 

        Look for ANY type of influence, including but not limited to:
        - Direct samples, quotes, or references
        - Techniques and methodologies from any field
        - Personal experiences and life events
        - Historical events and cultural movements
        - Other creative works across all mediums
        - Technological innovations and tools
        - Social, political, or economic contexts
        - Scientific discoveries or theories
        - Geographic or environmental factors
        
        For each influence, provide:
        1. A specific year (as an integer).
        2. Brief explanation of the influence. 
        
        Never list more than 10 influences. A good amount of influences to list is 5-6.
        
        Provide specific, factual influences with brief explanations of how they influenced the work.
        Be concise but informative.
        
        The goal is to discover ALL meaningful influences, regardless of category or field.
        Let the evidence guide you rather than predetermined categories.
        
        Example:
        'The Beatles' were a British rock band that revolutionized the music industry and left a lasting impact on popular culture worldwide.
        - Year used for indexing: 1960
        
        1. **Rock and Roll Music**
        Explanation: The Beatles were heavily influenced by American rock and roll artists such as Elvis Presley, Chuck Berry, and Little Richard. They incorporated elements of rock and roll into their music, helping to shape their energetic and dynamic sound.
        Year used for indexing: 1950 
        
        2. Etc.."""

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
