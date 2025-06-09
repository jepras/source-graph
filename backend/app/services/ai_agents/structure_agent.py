import json
import re
from typing import Dict, Any, Optional, Union
from app.services.ai_agents.base_agent import BaseAgent
from app.models.structured import StructuredOutput


class StructureAgent(BaseAgent):
    def __init__(self):
        super().__init__(temperature=0.1)

    @staticmethod
    def convert_year_to_int(year_value) -> Optional[int]:
        """Convert year string or number to integer"""
        if year_value is None or year_value == "null":
            return None

        if isinstance(year_value, int):
            return year_value

        if isinstance(year_value, str):
            year_str = year_value.lower().strip()

            # Handle decade formats
            if year_str.endswith("s"):
                # "1950s" -> 1950, "1960s" -> 1960
                try:
                    decade = int(year_str[:-1])
                    return decade
                except ValueError:
                    pass

            # Handle early/mid/late formats
            if "early" in year_str:
                # Extract year from "early 1960s" -> 1960
                try:
                    year_match = year_str.replace("early", "").replace("s", "").strip()
                    return int(year_match)
                except ValueError:
                    pass

            if "mid" in year_str:
                # Extract year from "mid 1960s" -> 1965
                try:
                    decade = int(year_str.replace("mid", "").replace("s", "").strip())
                    return decade + 5
                except ValueError:
                    pass

            if "late" in year_str:
                # Extract year from "late 1960s" -> 1968
                try:
                    decade = int(year_str.replace("late", "").replace("s", "").strip())
                    return decade + 8
                except ValueError:
                    pass

            # Try direct conversion
            try:
                return int(year_str)
            except ValueError:
                pass

        return None

    async def structure_influences(
        self,
        influences_text: str,
        main_item: str,
        main_item_creator: str = None,
    ) -> StructuredOutput:
        """Convert free text influences into structured data"""

        # DEBUG: Print input
        print(f"\n=== STRUCTURE AGENT DEBUG ===")
        print(f"Input text length: {len(influences_text)}")
        print(f"Input text preview: {influences_text[:200]}...")
        print(f"Main item: {main_item} by {main_item_creator}")

        system_message = """You are an expert at extracting structured influence data from text.

Convert influence descriptions into valid JSON format with this exact structure:

{{
  "main_item": "item name",
  "main_item_type": "song/movie/book/technique/innovation/etc",
  "main_item_creator": "creator name or null",
  "main_item_creator_type": "person/organization/collective or null",
  "main_item_year": year_number,
  "influences": [
    {{
      "name": "influence name",
      "type": "song/movie/book/technique/person/event/etc",
      "creator_name": "creator name or null",
      "creator_type": "person/organization/collective or null",
      "year": year_number,
      "category": "Audio Samples & Music/Literary Techniques/etc",
      "influence_type": "audio_sample/literary_technique/personal_experience/cinematic_influence/musical_technique/cultural_context/technological",
      "confidence": 0.85,
      "explanation": "brief explanation of how this influenced the main item",
      "source": "source info or null"
    }}
  ],
  "categories": ["Audio Samples & Music", "Literary Techniques"]
}}

CRITICAL YEAR REQUIREMENTS (MOST IMPORTANT):
- Years must ALWAYS be integers (1999) or null, NEVER strings
- For "1950s" use: 1950
- For "early 1960s" use: 1960
- For "mid 1960s" use: 1965
- For "late 1960s" use: 1968
- For "1960s" use: 1960
- NEVER return strings like "1950s" or "1960s" - always convert to integers
- If you cannot determine a year, use null (not quoted)

EXAMPLES OF CORRECT YEARS:
✅ "year": 1950 (for "1950s")
✅ "year": 1960 (for "1960s" or "early 1960s")
✅ "year": null (if unknown)
❌ "year": "1950s" (WRONG - never use strings)
❌ "year": "1960s" (WRONG - never use strings)

OTHER RULES:
- Use null (not quoted) for missing values
- All string values must be quoted
- No trailing commas
- Return ONLY valid JSON, no other text
- AUTO-DETECT main_item_type
- Use creator_name and creator_type instead of artist
- Creator types: person, organization, collective
- Use confidence scores 0.3-0.9
- Extract 3-7 influences from the text
- Be specific in explanations - HOW did this influence the main item?
- Never use "other" in category

CATEGORY EXAMPLES:
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

Return only valid JSON following the exact structure specified. Auto-detect the type and creator information from the context. Remember: ALL YEARS MUST BE INTEGERS, NOT STRINGS."""

        prompt = self.create_prompt(system_message, human_message)
        response = None

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
                print(f"Validating parsed data...")

                # Convert main item year
                data["main_item_year"] = self.convert_year_to_int(
                    data.get("main_item_year")
                )

                # Clean up influences
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

                            # CONVERT YEAR TO INTEGER
                            converted_year = self.convert_year_to_int(inf.get("year"))
                            inf["year"] = converted_year

                            if converted_year is None:
                                print(
                                    f"Warning: Could not convert year for influence '{inf['name']}': {inf.get('year')}"
                                )

                            cleaned_influences.append(inf)
                        else:
                            print(f"Skipping influence {i + 1}: no name field")

                    data["influences"] = cleaned_influences
                    print(f"Cleaned influences: {len(cleaned_influences)}")

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
            if response:
                print(f"Response that failed to parse: {response}")
            else:
                print("No response received from LLM")

            # Return empty structure as fallback
            return StructuredOutput(
                main_item=main_item,
                main_item_type="unknown",
                main_item_creator=main_item_creator,
                main_item_creator_type=None,
                main_item_year=None,
                influences=[],
                categories=[],
            )


# Global instance
structure_agent = StructureAgent()
