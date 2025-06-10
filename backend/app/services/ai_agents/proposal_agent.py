import json
import re
from typing import List, Dict, Any
from app.services.ai_agents.base_agent import BaseAgent
from app.models.proposal import (
    InfluenceProposal,
    ProposalResponse,
    MoreProposalsRequest,
)


class ProposalAgent(BaseAgent):
    def __init__(self):
        super().__init__(temperature=0.4)  # Balanced creativity and consistency

    async def propose_influences(
        self,
        item_name: str,
        item_type: str = None,
        artist: str = None,
        context: str = None,
    ) -> ProposalResponse:
        """Propose influences across macro/micro/nano scope levels"""

        system_message = """You are an expert at discovering influences across multiple scope levels.

    Your job is to propose influences for a creative work at three different scope levels:

    **MACRO (2 influences)**: Major foundational influences
    - Genres, movements, major cultural phenomena
    - Key historical events or periods
    - Major technological or social changes
    - Foundational works that established traditions

    **MICRO (2 influences)**: Specific techniques and elements  
    - Particular artistic techniques or methods
    - Specific works that provided direct inspiration
    - Production methods or creative processes
    - Regional scenes or specialized communities

    **NANO (2 influences)**: Tiny details and specifics
    - Specific sounds, visual elements, or phrases
    - Particular instruments, tools, or materials
    - Individual costume pieces, props, or design elements
    - Specific personal experiences or moments

    CRITICAL REQUIREMENTS:
    - Each influence MUST have a specific year (integer only, never strings)
    - Provide influences across diverse categories (don't repeat categories)
    - Each influence needs: name, year, category, scope, explanation, confidence
    - Categories should be descriptive: "Audio Samples & Music", "Literary Techniques", etc.
    - Confidence scores: 0.6-0.9 (be realistic about certainty)
    - Explanations must be specific about HOW it influenced the main item

    Return ONLY valid JSON in this exact format:
    {{
    "main_item": "item name",
    "main_item_type": "auto-detected type",
    "main_item_year": year_integer,
    "main_item_creator": "creator name",
    "proposals": [
        {{
        "name": "influence name",
        "type": "influence type", 
        "creator_name": "creator or null",
        "creator_type": "person/organization/collective or null",
        "year": year_integer,
        "category": "descriptive category name",
        "scope": "macro/micro/nano",
        "influence_type": "how_it_influenced",
        "confidence": 0.85,
        "explanation": "specific explanation of influence",
        "source": "source info or null"
        }}
    ]
    }}

    EXAMPLE SCOPES:
    - MACRO: "Hip-Hop Genre" (1970) - foundational musical movement
    - MICRO: "Detroit Rap Scene" (1980) - regional specialization  
    - NANO: "Specific Rhyme Scheme" (1999) - tiny technical detail"""

        # Build the human prompt
        if artist:
            human_message = f"Propose 6 influences (2 macro, 2 micro, 2 nano) for '{item_name}' by {artist}"
        else:
            human_message = (
                f"Propose 6 influences (2 macro, 2 micro, 2 nano) for '{item_name}'"
            )

        if item_type:
            human_message += f" ({item_type})"

        if context:
            human_message += f"\n\nAdditional context: {context}"

        human_message += (
            "\n\nReturn only valid JSON with the exact structure specified."
        )

        prompt = self.create_prompt(system_message, human_message)

        try:
            # Don't pass any template variables since we're not using them
            response = await self.invoke(prompt, {})
            return await self._parse_proposal_response(
                response, item_name, item_type, artist
            )

        except Exception as e:
            return ProposalResponse(
                item_name=item_name,
                item_type=item_type,
                artist=artist,
                macro_influences=[],
                micro_influences=[],
                nano_influences=[],
                all_categories=[],
                total_proposals=0,
                success=False,
                error_message=f"Error generating proposals: {str(e)}",
            )

    async def get_more_proposals(
        self, request: MoreProposalsRequest
    ) -> List[InfluenceProposal]:
        """Get additional proposals in a specific category and scope"""

        existing_list = (
            ", ".join(request.existing_influences)
            if request.existing_influences
            else "none"
        )

        system_message = f"""You are an expert at finding additional influences in specific categories and scope levels.

    Generate {request.count} additional {request.scope} influences in the "{request.category}" category.

    SCOPE DEFINITION:
    - MACRO: Major foundational influences (genres, movements, major works)
    - MICRO: Specific techniques and elements (methods, regional scenes, specific works)  
    - NANO: Tiny details and specifics (sounds, tools, personal moments)

    REQUIREMENTS:
    - All influences must be {request.scope} level
    - All influences must fit in "{request.category}" category
    - Avoid these already suggested influences: {existing_list}
    - Each influence needs specific year (integer only)
    - Confidence scores 0.6-0.9
    - Specific explanations of influence

    Return ONLY valid JSON array:
    [
    {{{{
        "name": "influence name",
        "type": "influence type",
        "creator_name": "creator or null", 
        "creator_type": "person/organization/collective or null",
        "year": year_integer,
        "category": "{request.category}",
        "scope": "{request.scope}",
        "influence_type": "how_it_influenced",
        "confidence": 0.85,
        "explanation": "specific explanation",
        "source": "source or null"
    }}}}
    ]"""

        # Build human prompt
        if request.artist:
            human_message = f"Find {request.count} more {request.scope} influences in '{request.category}' category for '{request.item_name}' by {request.artist}"
        else:
            human_message = f"Find {request.count} more {request.scope} influences in '{request.category}' category for '{request.item_name}'"

        if request.item_type:
            human_message += f" ({request.item_type})"

        prompt = self.create_prompt(system_message, human_message)

        try:
            response = await self.invoke(prompt, {})
            return await self._parse_more_proposals(
                response, request.scope, request.category
            )

        except Exception as e:
            print(f"Error getting more proposals: {e}")
            return []

    async def _parse_proposal_response(
        self, response: str, item_name: str, item_type: str, artist: str
    ) -> ProposalResponse:
        """Parse AI response into organized proposals"""

        print(f"=== PROPOSAL AGENT DEBUG ===")
        print(f"Item: {item_name} by {artist}")
        print(f"Raw response length: {len(response)}")
        print(f"Raw response:\n{response}")
        print(f"=== END RAW RESPONSE ===")

        try:
            # Extract JSON from response
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if not json_match:
                print("ERROR: No JSON pattern found in response")
                raise ValueError("No JSON found in response")

            json_str = json_match.group()
            print(f"=== EXTRACTED JSON ===")
            print(json_str)
            print(f"=== END EXTRACTED JSON ===")

            # Try to clean common JSON issues before parsing
            original_json = json_str
            json_str = json_str.replace(",}", "}")  # Remove trailing commas before }
            json_str = json_str.replace(",]", "]")  # Remove trailing commas before ]

            if json_str != original_json:
                print(f"=== CLEANED JSON ===")
                print(json_str)
                print(f"=== END CLEANED JSON ===")

            data = json.loads(json_str)
            print(f"SUCCESS: JSON parsed successfully")

            # Organize proposals by scope
            macro_influences = []
            micro_influences = []
            nano_influences = []
            all_categories = set()

            for proposal_data in data.get("proposals", []):
                try:
                    proposal = InfluenceProposal(**proposal_data)
                    all_categories.add(proposal.category)

                    if proposal.scope == "macro":
                        macro_influences.append(proposal)
                    elif proposal.scope == "micro":
                        micro_influences.append(proposal)
                    elif proposal.scope == "nano":
                        nano_influences.append(proposal)

                except Exception as e:
                    print(f"Error parsing proposal: {e}")
                    continue

            total_proposals = (
                len(macro_influences) + len(micro_influences) + len(nano_influences)
            )

            print(
                f"Parsed {total_proposals} proposals: {len(macro_influences)} macro, {len(micro_influences)} micro, {len(nano_influences)} nano"
            )
            print(f"Categories found: {list(all_categories)}")

            return ProposalResponse(
                item_name=item_name,
                item_type=item_type or data.get("main_item_type"),
                artist=artist or data.get("main_item_creator"),
                macro_influences=macro_influences,
                micro_influences=micro_influences,
                nano_influences=nano_influences,
                all_categories=list(all_categories),
                total_proposals=total_proposals,
                success=True,
            )

        except json.JSONDecodeError as e:
            print(f"=== JSON PARSE ERROR ===")
            print(f"Error: {e}")
            print(f"Error position: line {e.lineno}, column {e.colno}")
            print(f"Error character position: {e.pos}")
            print(f"Problematic JSON length: {len(json_str)}")

            # Show the area around the error
            if hasattr(e, "pos") and e.pos:
                start = max(0, e.pos - 100)
                end = min(len(json_str), e.pos + 100)
                print(f"JSON around error position:")
                print(f"'{json_str[start:end]}'")

            print(f"=== END JSON PARSE ERROR ===")

            # Return empty response instead of crashing
            return ProposalResponse(
                item_name=item_name,
                item_type=item_type,
                artist=artist,
                macro_influences=[],
                micro_influences=[],
                nano_influences=[],
                all_categories=[],
                total_proposals=0,
                success=False,
                error_message="AI generated invalid JSON for this item. Try a different item or contact support.",
            )

        except Exception as e:
            print(f"Error parsing proposal response: {e}")
            return ProposalResponse(
                item_name=item_name,
                item_type=item_type,
                artist=artist,
                macro_influences=[],
                micro_influences=[],
                nano_influences=[],
                all_categories=[],
                total_proposals=0,
                success=False,
                error_message=f"Parse error: {str(e)}",
            )

    async def _parse_more_proposals(
        self, response: str, scope: str, category: str
    ) -> List[InfluenceProposal]:
        """Parse additional proposals response"""

        print(f"=== MORE PROPOSALS DEBUG ===")
        print(f"Raw response length: {len(response)}")
        print(f"Raw response: {response}")
        print(f"Looking for scope: {scope}, category: {category}")

        try:
            # Extract JSON array from response
            json_match = re.search(r"\[.*\]", response, re.DOTALL)
            if not json_match:
                print("ERROR: No JSON array found in response")
                return []

            json_str = json_match.group()
            print(f"Extracted JSON: {json_str}")

            proposal_data_list = json.loads(json_str)

            proposals = []
            for proposal_data in proposal_data_list:
                try:
                    proposal = InfluenceProposal(**proposal_data)
                    proposals.append(proposal)
                except Exception as e:
                    print(f"Error parsing additional proposal: {e}")
                    print(f"Problematic data: {proposal_data}")
                    continue

            print(
                f"Successfully parsed {len(proposals)} additional {scope} proposals in {category}"
            )
            return proposals

        except Exception as e:
            print(f"Error parsing more proposals: {e}")
            return []

    async def get_influence_specifics(
        self,
        influence_name: str,
        influence_explanation: str,
        main_item_name: str,
        main_item_artist: str = "",
    ) -> List[InfluenceProposal]:
        """Get specific nano-level influences for a given influence"""

        artist_context = f" by {main_item_artist}" if main_item_artist else ""

        system_message = """You are an expert at breaking down influences into specific nano-level details.

    Your job is to take a general influence and break it down into 3-5 SPECIFIC, NANO-LEVEL influences.

    Each nano influence should be:
    - Very specific and concrete (nano scope only)
    - A distinct aspect of the original influence
    - More detailed than the original explanation
    - Focus on the HOW and WHAT specifically

    CRITICAL REQUIREMENTS:
    - Each influence MUST have a specific year (integer only, never strings)
    - All influences must be "nano" scope
    - Each influence needs: name, year, category, scope, explanation, confidence
    - Confidence scores: 0.6-0.9 (be realistic about certainty)
    - Explanations must be very specific about the nano-level detail

    Return ONLY valid JSON array in this exact format:
    [
        {{{{
            "name": "specific technique/element name",
            "type": "song/album/technique/style/etc",
            "creator_name": "creator if applicable or null",
            "creator_type": "person/organization/collective or null",
            "year": year_integer,
            "category": "specific category",
            "scope": "nano",
            "influence_type": "specific_technique/direct_sample/style_adoption/etc",
            "confidence": 0.85,
            "explanation": "very specific explanation of this nano influence",
            "source": "source_if_available or null"
        }}}}
    ]"""

        human_message = f"""Break down this influence into specific nano-level influences:

    Original Influence: "{influence_name}"
    Original Explanation: "{influence_explanation}"
    Target Item: "{main_item_name}{artist_context}"

    Find 3-5 specific nano-level aspects of how "{influence_name}" influenced "{main_item_name}".

    Return only valid JSON array with the exact structure specified."""

        prompt = self.create_prompt(system_message, human_message)

        try:
            response = await self.invoke(prompt, {})
            return await self._parse_specifics_response(response, influence_name)

        except Exception as e:
            print(f"Error getting specifics for {influence_name}: {e}")
            return []

    async def _parse_specifics_response(
        self, response: str, influence_name: str
    ) -> List[InfluenceProposal]:
        """Parse specifics response into InfluenceProposal objects"""

        print(f"=== SPECIFICS DEBUG ===")
        print(f"Influence: {influence_name}")
        print(f"Raw response length: {len(response)}")
        print(f"Raw response: {response}")

        try:
            # Extract JSON array from response
            json_match = re.search(r"\[.*\]", response, re.DOTALL)
            if not json_match:
                print("ERROR: No JSON array found in response")
                return []

            json_str = json_match.group()
            print(f"Extracted JSON: {json_str}")

            # Clean common JSON issues
            original_json = json_str
            json_str = json_str.replace(",}", "}")  # Remove trailing commas before }
            json_str = json_str.replace(",]", "]")  # Remove trailing commas before ]

            if json_str != original_json:
                print(f"Cleaned JSON: {json_str}")

            proposal_data_list = json.loads(json_str)

            specifics = []
            for proposal_data in proposal_data_list:
                try:
                    proposal = InfluenceProposal(**proposal_data)
                    specifics.append(proposal)
                except Exception as e:
                    print(f"Error parsing specific proposal: {e}")
                    print(f"Problematic data: {proposal_data}")
                    continue

            print(
                f"Successfully parsed {len(specifics)} specific influences for {influence_name}"
            )
            return specifics

        except Exception as e:
            print(f"Error parsing specifics response: {e}")
            return []


# Global instance
proposal_agent = ProposalAgent()
