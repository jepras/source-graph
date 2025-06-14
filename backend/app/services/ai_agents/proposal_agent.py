import json
import re
from typing import List, Dict, Any
from app.services.ai_agents.base_agent import BaseAgent
from app.models.proposal import (
    InfluenceProposal,
    ProposalResponse,
    MoreProposalsRequest,
)
from app.services.ai_agents.prompts import (
    PROPOSAL_GENERATION_PROMPT,
    SPECIFIC_INFLUENCES_PROMPT,
    DISCOVERY_QUESTION_PROMPT,
)


class ProposalAgent(BaseAgent):
    def __init__(self):
        super().__init__(temperature=0.4)  # Balanced creativity and consistency

    async def propose_influences(
        self,
        item_name: str,
        item_type: str = None,
        creator: str = None,
        context: str = None,
    ) -> ProposalResponse:
        """Propose influences across macro/micro/nano scope levels"""

        # Build the human prompt
        if creator:
            human_message = f"Propose 6 influences (2 macro, 2 micro, 2 nano) for '{item_name}' by {creator}"
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

        prompt = self.create_prompt(PROPOSAL_GENERATION_PROMPT, human_message)

        try:
            response = await self.invoke(prompt, {})
            return await self._parse_proposal_response(
                response, item_name, item_type, creator
            )

        except Exception as e:
            return ProposalResponse(
                item_name=item_name,
                item_type=item_type,
                creator=creator,
                item_description=None,
                item_year=None,
                macro_influences=[],
                micro_influences=[],
                nano_influences=[],
                all_categories=[],
                all_clusters=[],
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
        if request.creator:
            human_message = f"Find {request.count} more {request.scope} influences in '{request.category}' category for '{request.item_name}' by {request.creator}"
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
            return []

    async def _parse_proposal_response(
        self, response: str, item_name: str, item_type: str, creator: str
    ) -> ProposalResponse:
        """Parse AI response into organized proposals"""

        try:
            # Extract JSON from response
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if not json_match:
                raise ValueError("No JSON found in response")

            json_str = json_match.group()

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

            data = json.loads(json_str)

            # Organize proposals by scope
            macro_influences = []
            micro_influences = []
            nano_influences = []
            all_categories = set()
            all_clusters = set()

            for proposal_data in data.get("proposals", []):
                try:
                    proposal = InfluenceProposal(**proposal_data)
                    all_categories.add(proposal.category)

                    # Add clusters to the set
                    if hasattr(proposal, "clusters") and proposal.clusters:
                        for cluster in proposal.clusters:
                            all_clusters.add(cluster)

                    if proposal.scope == "macro":
                        macro_influences.append(proposal)
                    elif proposal.scope == "micro":
                        micro_influences.append(proposal)
                    elif proposal.scope == "nano":
                        nano_influences.append(proposal)

                except Exception as e:
                    continue

            total_proposals = (
                len(macro_influences) + len(micro_influences) + len(nano_influences)
            )

            return ProposalResponse(
                item_name=item_name,
                item_type=item_type or data.get("main_item_type"),
                creator=creator or data.get("main_item_creator"),
                item_description=data.get(
                    "main_item_description"
                ),  # NEW: Add this line
                item_year=data.get("main_item_year"),  # NEW: Add this line
                macro_influences=macro_influences,
                micro_influences=micro_influences,
                nano_influences=nano_influences,
                all_categories=list(all_categories),
                all_clusters=list(all_clusters),
                total_proposals=total_proposals,
                success=True,
            )

        except json.JSONDecodeError as e:
            # Return empty response instead of crashing
            return ProposalResponse(
                item_name=item_name,
                item_type=item_type,
                creator=creator,
                macro_influences=[],
                micro_influences=[],
                nano_influences=[],
                all_categories=[],
                all_clusters=[],
                total_proposals=0,
                success=False,
                error_message="AI generated invalid JSON for this item. Try a different item or contact support.",
            )

        except Exception as e:
            return ProposalResponse(
                item_name=item_name,
                item_type=item_type,
                creator=creator,
                item_description=None,  # NEW: Add this line
                item_year=None,  # NEW: Add this line
                macro_influences=[],
                micro_influences=[],
                nano_influences=[],
                all_categories=[],
                all_clusters=[],
                total_proposals=0,
                success=False,
                error_message=f"Parse error: {str(e)}",
            )

    async def _parse_more_proposals(
        self, response: str, scope: str, category: str
    ) -> List[InfluenceProposal]:
        """Parse additional proposals response"""

        try:
            # Extract JSON array from response
            json_match = re.search(r"\[.*\]", response, re.DOTALL)
            if not json_match:
                return []

            json_str = json_match.group()

            proposal_data_list = json.loads(json_str)

            proposals = []
            for proposal_data in proposal_data_list:
                try:
                    proposal = InfluenceProposal(**proposal_data)
                    proposals.append(proposal)
                except Exception as e:
                    continue

            return proposals

        except Exception as e:
            return []

    async def answer_question(
        self,
        item_name: str,
        question: str,
        item_type: str = None,
        creator: str = None,
        item_year: int = None,
        item_description: str = None,
        target_influence_name: str = None,
        target_influence_explanation: str = None,
    ) -> "UnifiedQuestionResponse":
        """Unified method to answer any question about items or influences"""

        # Determine question type
        is_drill_down = target_influence_name is not None
        question_type = "drill_down" if is_drill_down else "discovery"

        # Build context about the item
        item_context = f"Item: {item_name}"
        if creator:
            item_context += f" by {creator}"
        if item_year:
            item_context += f" ({item_year})"
        if item_type:
            item_context += f" - {item_type}"
        if item_description:
            item_context += f"\nDescription: {item_description}"

        if is_drill_down:
            # Use specific influences prompt
            system_message = SPECIFIC_INFLUENCES_PROMPT
            human_message = f"""Break down this influence into specific sources:

    {item_context}

    Target Influence: "{target_influence_name}"
    Influence Context: "{target_influence_explanation}"

    User Question: "{question}"

    Find 3-5 specific sources that answer this question. Look for actual songs, albums, products, or techniques that contributed to this influence.

    Return only valid JSON with the exact structure specified."""

        else:
            # Use discovery question prompt
            system_message = DISCOVERY_QUESTION_PROMPT
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

        try:
            # Extract JSON from response
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if not json_match:
                raise ValueError("No JSON found in response")

            json_str = json_match.group()

            # Clean common JSON issues
            original_json = json_str
            json_str = json_str.replace(",}", "}")
            json_str = json_str.replace(",]", "]")

            data = json.loads(json_str)

            # Parse new influences
            new_influences = []
            for influence_data in data.get("new_influences", []):
                try:
                    # Import here to avoid circular import
                    from app.models.proposal import InfluenceProposal

                    influence = InfluenceProposal(**influence_data)
                    new_influences.append(influence)
                except Exception as e:
                    continue

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

        try:
            # Extract JSON array from response
            json_match = re.search(r"\[.*\]", response, re.DOTALL)
            if not json_match:
                return []

            json_str = json_match.group()

            # Clean common JSON issues
            original_json = json_str
            json_str = json_str.replace(",}", "}")  # Remove trailing commas before }
            json_str = json_str.replace(",]", "]")  # Remove trailing commas before ]

            proposal_data_list = json.loads(json_str)

            specifics = []
            for proposal_data in proposal_data_list:
                try:
                    proposal = InfluenceProposal(**proposal_data)
                    specifics.append(proposal)
                except Exception as e:
                    continue

            return specifics

        except Exception as e:
            return []


# Global instance
proposal_agent = ProposalAgent()
