import json
import re
import time
from datetime import datetime
from typing import List, Dict, Any
from app.services.ai_agents.base_agent import BaseAgent
from app.models.proposal import InfluenceProposal
from app.models.canvas import (
    CanvasDocument,
    CanvasResearchRequest,
    CanvasResearchResponse,
    CanvasChatRequest,
    CanvasChatResponse,
    DocumentSection,
)
from app.services.ai_agents.prompts import (
    CANVAS_RESEARCH_PROMPT,
    CANVAS_CHAT_PROMPT,
    CANVAS_REFINE_PROMPT,
)


class CanvasAgent(BaseAgent):
    def __init__(self):
        super().__init__(temperature=0.5)  # Slightly more creative for storytelling

    async def generate_research(
        self,
        item_name: str,
        item_type: str = None,
        creator: str = None,
        scope: str = "highlights",
    ) -> CanvasResearchResponse:
        """Generate initial Canvas research document"""

        # Build human message
        if creator:
            human_message = (
                f"Create a research document about '{item_name}' by {creator}"
            )
        else:
            human_message = f"Create a research document about '{item_name}'"

        if item_type:
            human_message += f" ({item_type})"

        human_message += f"\n\nGenerate an engaging intro paragraph and {5 if scope == 'highlights' else 7} fascinating influences that will surprise users."
        human_message += (
            "\n\nReturn only valid JSON with the exact structure specified."
        )

        prompt = self.create_prompt(CANVAS_RESEARCH_PROMPT, human_message)

        try:
            response = await self.invoke(prompt, {})
            return await self._parse_research_response(response, item_name)

        except Exception as e:
            return CanvasResearchResponse(
                success=False,
                document=None,
                error_message=f"Error generating research: {str(e)}",
            )

    async def process_chat_message(
        self,
        message: str,
        current_document: CanvasDocument,
        context: Dict[str, Any] = None,
    ) -> CanvasChatResponse:
        """Process chat message and update document"""

        # Treat all chat messages as influence requests
        return await self._handle_more_influences_request(message, current_document)

    async def _handle_more_influences_request(
        self, message: str, current_document: CanvasDocument
    ) -> CanvasChatResponse:
        """Handle requests for more influences"""

        try:
            # Get current timestamp for unique IDs
            timestamp = int(time.time() * 1000)

            # Build human message with existing influences context
            existing_influences = []
            for s in current_document.sections:
                if s.influence_data and hasattr(s.influence_data, "name"):
                    existing_influences.append(s.influence_data.name)

            human_message = f"""Current document about: {current_document.item_name}
User request: {message}

Current document about "{current_document.item_name}" already has these influences: {', '.join(existing_influences) if existing_influences else 'none yet'}

Find NEW influences that specifically answer their question. Avoid duplicating existing influences.

Use these exact IDs in order: "influence-{timestamp}-1", "influence-{timestamp}-2", "influence-{timestamp}-3", etc.

Return only the JSON array of new sections. Maximum 6 influences."""

            prompt = self.create_prompt(CANVAS_CHAT_PROMPT, human_message)

            response = await self.invoke(prompt, {})

            # Parse the response to get new sections
            new_sections = await self._parse_new_sections(response, timestamp)

            if new_sections:
                return CanvasChatResponse(
                    success=True,
                    response_text=f"I found {len(new_sections)} additional influence{'' if len(new_sections) == 1 else 's'} that answer your question!",
                    new_sections=new_sections,
                    updated_sections=None,
                    insert_after=None,
                )
            else:
                return CanvasChatResponse(
                    success=True,
                    response_text="I couldn't find additional influences for that question. Try being more specific about what type of influences you're looking for.",
                    new_sections=None,
                    updated_sections=None,
                    insert_after=None,
                )

        except Exception as e:
            return CanvasChatResponse(
                success=False,
                response_text="",
                new_sections=None,
                updated_sections=None,
                insert_after=None,
                error_message=f"Error processing chat: {str(e)}",
            )

    async def _parse_new_sections(
        self, response: str, timestamp: int = None
    ) -> List[DocumentSection]:
        """Parse AI response into new DocumentSection objects"""

        try:
            # Extract JSON array from response
            json_match = re.search(r"\[.*\]", response, re.DOTALL)
            if not json_match:
                return []

            json_str = json_match.group()

            # Clean JSON issues (same as other parsing)
            json_str = json_str.replace(",}", "}")
            json_str = json_str.replace(",]", "]")
            json_str = re.sub(r'"year":\s*"[^"]*"', '"year": null', json_str)
            json_str = re.sub(r'"year":\s*[a-zA-Z][^,}\]]*', '"year": null', json_str)
            json_str = re.sub(r",(\s*[}\]])", r"\1", json_str)

            sections_data = json.loads(json_str)

            # Ensure unique IDs as fallback
            if timestamp is None:
                timestamp = int(time.time() * 1000)

            for i, section_data in enumerate(sections_data):
                if not section_data.get("id") or section_data["id"].startswith(
                    "influence-new-"
                ):
                    section_data["id"] = f"influence-{timestamp}-{i+1}"

            return self._parse_sections(sections_data)

        except Exception as e:
            print(f"Error parsing new sections: {e}")
            return []

    async def refine_section(
        self, section_id: str, refinement_prompt: str, current_document: CanvasDocument
    ) -> Dict[str, Any]:
        """Refine a specific section based on user prompt - returns complete updated section"""

        section = next(
            (s for s in current_document.sections if s.id == section_id), None
        )
        if not section:
            raise ValueError(f"Section {section_id} not found")

        # Build human message with DESCRIPTIVE TEXT instead of JSON to avoid template variables
        if section.type == "intro":
            human_message = f"""Refine this intro section:
Current content: "{section.content}"
Section ID: {section.id}
Section type: intro (no influence_data)

User refinement request: "{refinement_prompt}"

Document context: This section is about "{current_document.item_name}" from {current_document.item_year or 'unknown year'}.

Return the complete updated section JSON that addresses their request."""

        else:
            # For influence sections, describe the influence data in text
            influence_desc = "No influence data"
            if section.influence_data:
                influence_desc = f"""Influence: {section.influence_data.name}
Creator: {section.influence_data.creator_name or 'unknown'}
Year: {section.influence_data.year or 'unknown'}
Category: {section.influence_data.category}
Scope: {section.influence_data.scope}
Confidence: {section.influence_data.confidence}
Clusters: {', '.join(section.influence_data.clusters) if section.influence_data.clusters else 'none'}
Explanation: {section.influence_data.explanation}"""

            human_message = f"""Refine this influence section:
Current content: "{section.content}"
Section ID: {section.id}
Section type: {section.type}
Selected for graph: {section.selectedForGraph}

Current influence data:
{influence_desc}

User refinement request: "{refinement_prompt}"

Document context: This section is about "{current_document.item_name}" from {current_document.item_year or 'unknown year'}.

Return the complete updated section JSON that addresses their request."""

        prompt = self.create_prompt(CANVAS_REFINE_PROMPT, human_message)

        try:
            response = await self.invoke(prompt, {})

            # Parse the JSON response
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if not json_match:
                raise ValueError("No JSON found in refinement response")

            json_str = json_match.group()

            # Clean JSON issues (same as other parsing)
            json_str = json_str.replace(",}", "}")
            json_str = json_str.replace(",]", "]")
            json_str = re.sub(r'"year":\s*"[^"]*"', '"year": null', json_str)
            json_str = re.sub(r'"year":\s*[a-zA-Z][^,}\]]*', '"year": null', json_str)
            json_str = re.sub(r",(\s*[}\]])", r"\1", json_str)

            refined_data = json.loads(json_str)
            return refined_data

        except Exception as e:
            raise ValueError(f"Error refining section: {str(e)}")

    async def _parse_research_response(
        self, response: str, item_name: str
    ) -> CanvasResearchResponse:
        """Parse AI response into Canvas document with same error handling as proposal_agent"""

        try:
            # Extract JSON from response (same logic as proposal_agent)
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if not json_match:
                raise ValueError("No JSON found in response")

            json_str = json_match.group()

            # Clean common JSON issues (same as proposal_agent)
            json_str = json_str.replace(",}", "}")
            json_str = json_str.replace(",]", "]")

            # Fix year issues
            json_str = re.sub(r'"year":\s*"[^"]*"', '"year": null', json_str)
            json_str = re.sub(r'"year":\s*[a-zA-Z][^,}\]]*', '"year": null', json_str)

            # Fix trailing commas
            json_str = re.sub(r",(\s*[}\]])", r"\1", json_str)

            # Try to close incomplete JSON
            if not json_str.rstrip().endswith("}"):
                open_braces = json_str.count("{")
                close_braces = json_str.count("}")
                missing_braces = open_braces - close_braces
                for _ in range(missing_braces):
                    json_str += "}"

            data = json.loads(json_str)

            # Convert to CanvasDocument
            document = CanvasDocument(
                id=f"canvas-{item_name.lower().replace(' ', '-')}-{int(time.time())}",
                item_name=data.get("item_name", item_name),
                item_type=data.get("item_type"),
                item_year=data.get("item_year"),
                creator=data.get("item_creator"),
                sections=self._parse_sections(data.get("sections", [])),
                created_at=datetime.now(),
            )

            return CanvasResearchResponse(
                success=True,
                document=document,
                response_text=f"I've created a research document about {document.item_name}. You can now ask questions, refine sections, or select influences to add to the graph.",
            )

        except Exception as e:
            return CanvasResearchResponse(
                success=False, document=None, error_message=f"Parse error: {str(e)}"
            )

    def _parse_sections(self, sections_data: List[Dict]) -> List[DocumentSection]:
        """Convert JSON sections to DocumentSection objects"""
        sections = []

        for section_data in sections_data:
            try:
                # Convert influence_data if present
                influence_data = None
                if section_data.get("influence_data"):
                    influence_data = InfluenceProposal(**section_data["influence_data"])

                section = DocumentSection(
                    id=section_data.get("id", f"section-{len(sections)}"),
                    type=section_data.get("type", "influence-item"),
                    title=section_data.get("title"),
                    content=section_data.get("content", ""),
                    influence_data=influence_data,
                    selectedForGraph=section_data.get("selectedForGraph", False),
                    metadata={"createdAt": datetime.now(), "aiGenerated": True},
                )
                sections.append(section)

            except Exception as e:
                continue  # Skip invalid sections

        return sections


# Global instance
canvas_agent = CanvasAgent()
