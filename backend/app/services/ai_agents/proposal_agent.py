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
    - It is important that you also research what year the main_item is from. It needs to be included in the JSON.
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
    "main_item_description": "brief one-line description of the main item",
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
                item_description=None,  # NEW: Add this line
                item_year=None,  # NEW: Add this line
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

            # Fix common year issues
            json_str = re.sub(
                r'"year":\s*"[^"]*"', '"year": null', json_str
            )  # String years to null
            json_str = re.sub(
                r'"year":\s*18th Century', '"year": 1750', json_str
            )  # Specific fix
            json_str = re.sub(
                r'"year":\s*8th Century', '"year": 800', json_str
            )  # Specific fix
            json_str = re.sub(
                r'"year":\s*[a-zA-Z][^,}\]]*', '"year": null', json_str
            )  # Any text years

            # Fix trailing commas
            json_str = re.sub(r",(\s*[}\]])", r"\1", json_str)

            # Fix incomplete JSON - try to close it
            if not json_str.rstrip().endswith("}"):
                # Count open vs closed braces
                open_braces = json_str.count("{")
                close_braces = json_str.count("}")
                open_brackets = json_str.count("[")
                close_brackets = json_str.count("]")

                # Add missing closing braces/brackets
                missing_brackets = open_brackets - close_brackets
                missing_braces = open_braces - close_braces

                for _ in range(missing_brackets):
                    json_str += "]"
                for _ in range(missing_braces):
                    json_str += "}"

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
                item_description=data.get(
                    "main_item_description"
                ),  # NEW: Add this line
                item_year=data.get("main_item_year"),  # NEW: Add this line
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
                item_description=None,  # NEW: Add this line
                item_year=None,  # NEW: Add this line
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

    async def answer_question(
        self,
        item_name: str,
        question: str,
        item_type: str = None,
        artist: str = None,
        item_year: int = None,
        item_description: str = None,
        target_influence_name: str = None,
        target_influence_explanation: str = None,
    ) -> "UnifiedQuestionResponse":
        """Unified method to answer any question about items or influences"""

        # Determine question type
        is_drill_down = target_influence_name is not None
        question_type = "drill_down" if is_drill_down else "discovery"

        print(f"=== UNIFIED QUESTION DEBUG ===")
        print(f"Item: {item_name}")
        print(f"Question: {question}")
        print(f"Question type: {question_type}")
        if is_drill_down:
            print(f"Target influence: {target_influence_name}")
        print(f"=== END DEBUG ===")

        # Build context about the item
        item_context = f"Item: {item_name}"
        if artist:
            item_context += f" by {artist}"
        if item_year:
            item_context += f" ({item_year})"
        if item_type:
            item_context += f" - {item_type}"
        if item_description:
            item_context += f"\nDescription: {item_description}"

        if is_drill_down:
            # Level 2: Drill-down question about specific influence
            system_message = """You are an expert at breaking down influences into specific, traceable sources.

    When a user asks a question about a specific influence, your job is to:
    1. Answer their question with concrete, specific examples
    2. Return 3-5 new influence proposals that trace to actual works/sources
    3. Focus on SPECIFIC songs, products, people, or works rather than techniques

    CRITICAL REQUIREMENTS:
    - Each influence MUST have a specific year (integer only)
    - Each influence needs: name, year, category, scope, explanation, confidence
    - Scope should be "nano" for these specific breakdowns
    - Categories should be very specific (not generic)
    - Explanations must detail the specific connection
    - Confidence scores: 0.6-0.9 (be realistic)

    Return ONLY valid JSON in this exact format:
    {{
    "answer_explanation": "explanation of how you found these specific sources",
    "new_influences": [
        {{
        "name": "specific work/source name",
        "type": "song/album/product/technique/style/etc",
        "creator_name": "creator if applicable or null",
        "creator_type": "person/organization/collective or null", 
        "year": year_integer,
        "category": "very specific category",
        "scope": "nano",
        "influence_type": "specific_technique/direct_sample/style_adoption/etc",
        "confidence": 0.85,
        "explanation": "very specific explanation of this nano influence",
        "source": "source_if_available or null"
        }}
    ]
    }}

    Focus on finding the actual sources - which specific songs, which particular artists, which exact techniques."""

            human_message = f"""Break down this influence into specific sources:

    {item_context}

    Target Influence: "{target_influence_name}"
    Influence Context: "{target_influence_explanation}"

    User Question: "{question}"

    Find 3-5 specific sources that answer this question. Look for actual songs, albums, artists, products, or techniques that contributed to this influence.

    Return only valid JSON with the exact structure specified."""

        else:
            # Level 1: Discovery question about main item
            system_message = """You are an expert at discovering specific influences based on user questions.

    When a user asks a question about a creative work, your job is to:
    1. Answer their question with specific, traceable influences
    2. Return 2-5 new influence proposals that directly address their question
    3. Focus on SPECIFIC works, people, or innovations rather than generic categories

    CRITICAL REQUIREMENTS:
    - Each influence MUST have a specific year (integer only)
    - Each influence needs: name, year, category, scope, explanation, confidence
    - Scope should be "micro" or "nano" for specific influences
    - Categories should be descriptive and specific
    - Explanations must detail HOW this specifically influenced the main item
    - Confidence scores: 0.6-0.9 (be realistic)

    Return ONLY valid JSON in this exact format:
    {{
    "answer_explanation": "explanation of how you found these influences",
    "new_influences": [
        {{
        "name": "specific influence name",
        "type": "influence type",
        "creator_name": "creator or null",
        "creator_type": "person/organization/collective or null",
        "year": year_integer,
        "category": "specific category",
        "scope": "micro",
        "influence_type": "how_it_influenced",
        "confidence": 0.85,
        "explanation": "specific explanation of influence",
        "source": "source_if_available or null"
        }}
    ]
    }}

    Examples of good specific influences:
    - "Typography class at Reed College (1971)" not "Typography"
    - "Braun T3 radio by Dieter Rams (1958)" not "Industrial design"
    - "Good Vibrations by Beach Boys (1966)" not "Vocal layering techniques"
    """

            human_message = f"""Question about {item_context}:

    User Question: "{question}"

    Find 2-5 specific influences that directly answer this question. Focus on particular works, people, places, or innovations that influenced this item.

    Return only valid JSON with the exact structure specified."""

        prompt = self.create_prompt(system_message, human_message)

        try:
            response = await self.invoke(prompt, {})
            return await self._parse_unified_question_response(
                response, item_name, question, question_type, target_influence_name
            )

        except Exception as e:
            # Import here to avoid circular import
            from app.models.proposal import UnifiedQuestionResponse

            return UnifiedQuestionResponse(
                item_name=item_name,
                question=question,
                question_type=question_type,
                target_influence_name=target_influence_name,
                new_influences=[],
                answer_explanation=f"Error processing question: {str(e)}",
                success=False,
                error_message=f"Error answering question: {str(e)}",
            )

    async def _parse_unified_question_response(
        self,
        response: str,
        item_name: str,
        question: str,
        question_type: str,
        target_influence_name: str = None,
    ) -> "UnifiedQuestionResponse":
        """Parse unified question response"""

        print(f"=== UNIFIED QUESTION RESPONSE DEBUG ===")
        print(f"Question type: {question_type}")
        print(f"Raw response length: {len(response)}")
        print(f"Raw response: {response}")

        try:
            # Extract JSON from response
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if not json_match:
                print("ERROR: No JSON pattern found in response")
                raise ValueError("No JSON found in response")

            json_str = json_match.group()
            print(f"Extracted JSON: {json_str}")

            # Clean common JSON issues
            original_json = json_str
            json_str = json_str.replace(",}", "}")
            json_str = json_str.replace(",]", "]")

            if json_str != original_json:
                print(f"Cleaned JSON: {json_str}")

            data = json.loads(json_str)
            print(f"SUCCESS: JSON parsed successfully")

            # Parse new influences
            new_influences = []
            for influence_data in data.get("new_influences", []):
                try:
                    # Import here to avoid circular import
                    from app.models.proposal import InfluenceProposal

                    influence = InfluenceProposal(**influence_data)
                    new_influences.append(influence)
                except Exception as e:
                    print(f"Error parsing influence: {e}")
                    continue

            print(f"Parsed {len(new_influences)} new influences")

            # Import here to avoid circular import
            from app.models.proposal import UnifiedQuestionResponse

            return UnifiedQuestionResponse(
                item_name=item_name,
                question=question,
                question_type=question_type,
                target_influence_name=target_influence_name,
                new_influences=new_influences,
                answer_explanation=data.get(
                    "answer_explanation", "AI found these influences"
                ),
                success=True,
            )

        except Exception as e:
            print(f"Error parsing unified question response: {e}")
            # Import here to avoid circular import
            from app.models.proposal import UnifiedQuestionResponse

            return UnifiedQuestionResponse(
                item_name=item_name,
                question=question,
                question_type=question_type,
                target_influence_name=target_influence_name,
                new_influences=[],
                answer_explanation="Failed to parse AI response",
                success=False,
                error_message=f"Parse error: {str(e)}",
            )

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
