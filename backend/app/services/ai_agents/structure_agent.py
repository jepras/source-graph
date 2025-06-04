import json
import re
from typing import Dict, Any
from app.services.ai_agents.base_agent import BaseAgent
from app.models.structured import StructuredOutput


class StructureAgent(BaseAgent):
    def __init__(self):
        super().__init__(temperature=0.1)

    async def structure_influences(
        self,
        influences_text: str,
        main_item: str,
        main_item_type: str,
        main_item_artist: str = None,
    ) -> StructuredOutput:
        """Convert free text influences into structured data"""

        # DEBUG: Print input
        print(f"\n=== STRUCTURE AGENT DEBUG ===")
        print(f"Input text length: {len(influences_text)}")
        print(f"Input text preview: {influences_text[:200]}...")
        print(f"Main item: {main_item} by {main_item_artist}")

        # FIXED: Escape all curly braces in the JSON structure so LangChain doesn't think they're variables
        system_message = """You are an expert at extracting structured influence data from text.

Convert influence descriptions into valid JSON format with this exact structure:

{{
  "main_item": "item name",
  "main_item_type": "song/movie/etc",
  "main_item_artist": "artist name or null",
  "main_item_year": year_number_or_null,
  "influences": [
    {{
      "name": "influence name",
      "type": "song/movie/book/technique/etc",
      "artist_creator": "creator name or null", 
      "year": year_number_or_null,
      "category": "Audio Samples & Music/Literary Techniques/etc",
      "influence_type": "audio_sample/literary_technique/personal_experience/cinematic_influence/musical_technique/cultural_context/technological/other",
      "confidence": 0.85,
      "explanation": "brief explanation",
      "source": "source info or null"
    }}
  ],
  "categories": ["Audio Samples & Music", "Literary Techniques"]
}}

IMPORTANT: 
- Return ONLY valid JSON, no other text
- Use confidence scores 0.3-0.9 (0.7-0.9 for well-documented, 0.5-0.7 for likely)
- Create appropriate categories like "Audio Samples & Music", "Literary Techniques", "Personal Experiences", etc.
- Extract at least 3-5 influences from the text if they exist
- Make sure each influence has all required fields"""

        human_message = f"""Extract structured influence data for "{main_item}" by {main_item_artist or "Unknown"}:

INFLUENCES TEXT:
{influences_text}

Return only valid JSON following the exact structure specified."""

        prompt = self.create_prompt(system_message, human_message)
        response = None  # Initialize response variable

        try:
            response = await self.invoke(prompt, {})

            # DEBUG: Print raw response
            print(f"Raw LLM response length: {len(response)}")
            print(f"Raw LLM response:\n{response}")
            print(f"=== END RAW RESPONSE ===")

            # Clean the response to extract JSON
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                print(f"Extracted JSON:\n{json_str}")

                data = json.loads(json_str)
                print(f"Parsed data: {data}")
                print(f"Number of influences found: {len(data.get('influences', []))}")

                result = StructuredOutput(**data)
                print(f"Final StructuredOutput influences: {len(result.influences)}")
                print(f"Final StructuredOutput categories: {result.categories}")
                print(f"=== END STRUCTURE DEBUG ===\n")
                return result
            else:
                print("ERROR: No valid JSON found in response")
                raise ValueError("No valid JSON in response")

        except Exception as e:
            print(f"Structure parsing error: {e}")
            if response:  # Only print response if it exists
                print(f"Response that failed to parse: {response}")
            else:
                print("No response received from LLM")
            # Return empty structure as fallback
            return StructuredOutput(
                main_item=main_item,
                main_item_type=main_item_type,
                main_item_artist=main_item_artist,
                main_item_year=None,
                influences=[],
                categories=[],
            )


# Global instance
structure_agent = StructureAgent()
