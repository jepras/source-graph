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
        main_item_creator: str = None,
    ) -> StructuredOutput:  # ADDED: main_item_creator parameter
        """Convert free text influences into structured data"""

        # DEBUG: Print input
        print(f"\n=== STRUCTURE AGENT DEBUG ===")
        print(f"Input text length: {len(influences_text)}")
        print(f"Input text preview: {influences_text[:200]}...")
        print(f"Main item: {main_item} by {main_item_creator}")

        # FIXED: Escape all curly braces in the JSON structure so LangChain doesn't think they're variables
        system_message = """You are an expert at extracting structured influence data from text.

Convert influence descriptions into valid JSON format with this exact structure:

{{
  "main_item": "item name",
  "main_item_type": "song/movie/book/technique/innovation/etc",
  "main_item_creator": "creator name or null",
  "main_item_creator_type": "person/organization/collective or null",
  "main_item_year": year_number_or_null,
  "influences": [
    {{
      "name": "influence name",
      "type": "song/movie/book/technique/person/event/etc",
      "creator_name": "creator name or null",
      "creator_type": "person/organization/collective or null",
      "year": year_number_or_null,
      "category": "Audio Samples & Music/Literary Techniques/etc",
      "influence_type": "audio_sample/literary_technique/personal_experience/cinematic_influence/musical_technique/cultural_context/technological/other",
      "confidence": 0.85,
      "explanation": "brief explanation of how this influenced the main item",
      "source": "source info or null"
    }}
  ],
  "categories": ["Audio Samples & Music", "Literary Techniques"]
}}

IMPORTANT RULES:
- Use null (not quoted) for missing values
- Years must be numbers (1999) or null, never text like "1980s"
- All string values must be quoted
- No trailing commas
- Return ONLY valid JSON, no other text
- AUTO-DETECT main_item_type - don't ask user (song/movie/innovation/book/technique/etc)
- Use creator_name and creator_type instead of artist (more flexible)
- Creator types: person (individuals), organization (companies/studios), collective (movements/traditions)
- Create categories freely - we'll clean up duplicates later when we have 20+
- Use confidence scores 0.3-0.9 (0.7-0.9 for well-documented, 0.5-0.7 for likely, 0.3-0.5 for speculative)
- Extract 3-7 influences from the text if they exist
- Be specific in explanations - HOW did this influence the main item?
- If year is uncertain, use null rather than guessing

CATEGORY EXAMPLES (create new ones as needed):
- Audio Samples & Music
- Literary Techniques
- Personal Experiences  
- Cinematic Influences
- Musical Production Techniques
- Cultural Context
- Technological Innovation
- Historical Events
- Performance Techniques
- Visual Arts
- Philosophy & Ideas"""

        human_message = f"""Extract structured influence data for "{main_item}":

INFLUENCES TEXT:
{influences_text}

Return only valid JSON following the exact structure specified. Auto-detect the type and creator information from the context."""

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
                # Add validation:
                print(f"Validating parsed data...")

                # Clean up any invalid influence names
                if "influences" in data:
                    cleaned_influences = []
                    for i, inf in enumerate(data["influences"]):
                        if "name" in inf:
                            name = inf["name"]
                            # Check for invalid names
                            if isinstance(name, (int, float)) or name in [
                                None,
                                "null",
                                "Infinity",
                                "-Infinity",
                            ]:
                                print(f"Skipping invalid influence name: {name}")
                                continue
                            # Convert to string and validate
                            name_str = str(name).strip()
                            if not name_str or len(name_str) < 2:
                                print(f"Skipping too short influence name: {name_str}")
                                continue
                            inf["name"] = name_str
                            cleaned_influences.append(
                                inf
                            )  # MOVED: Only append if name is valid
                        else:
                            print(f"Skipping influence {i + 1}: no name field")

                    data["influences"] = cleaned_influences
                    print(
                        f"Cleaned influences: {len(cleaned_influences)} out of {len(data.get('influences', []))}"
                    )

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
