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
    CANVAS_FREE_FORM_PROMPT,
    CANVAS_STRUCTURED_EXTRACTION_PROMPT,
    CANVAS_CHAT_PROMPT,
    CANVAS_REFINE_PROMPT,
)
import logging

# Set up detailed logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class TwoAgentCanvasAgent(BaseAgent):
    def __init__(self):
        super().__init__(temperature=0.5)  # Slightly more creative for storytelling

    async def generate_research(
        self,
        item_name: str,
        item_type: str = None,
        creator: str = None,
        scope: str = "highlights",
        selected_model: str = None,
        progress_callback=None,
    ) -> CanvasResearchResponse:
        """Generate initial Canvas research document using two-agent system"""
        logger.info(f"Starting two-agent research with model: {selected_model}")
        logger.info(f"Question: {item_name}")

        # Set model if specified
        if selected_model and selected_model != "default":
            self.set_model(selected_model)

        # Build human message for Agent 1 (Cultural Forensics Analyst)
        if creator:
            human_message = (
                f"Find the influences for this item: '{item_name}' by {creator}"
            )
        else:
            human_message = f"Find the influences for this item: '{item_name}'"

        if item_type:
            human_message += f" ({item_type})"

        try:
            # Step 1: Agent 1 - Free-form analysis
            if progress_callback:
                progress_callback("analyzing")

            prompt1 = self.create_prompt(CANVAS_FREE_FORM_PROMPT, human_message)
            free_form_response = await self.invoke(prompt1, {})

            logger.info("Agent 1 (Free-form) Response:")
            logger.info(f"Length: {len(free_form_response)} characters")
            logger.info(f"First 500 chars: {free_form_response[:500]}")
            logger.info(f"Last 500 chars: {free_form_response[-500:]}")
            logger.info(f"Full response: {repr(free_form_response)}")

            # Step 2: Agent 2 - Structured extraction
            if progress_callback:
                progress_callback("structuring")

            extraction_message = f"""Original item: {item_name}
{item_type and f"Type: {item_type}" or ""}
{creator and f"Creator: {creator}" or ""}

Free-form analysis from Cultural Forensics Analyst:
{free_form_response}

Convert this into the exact JSON structure required."""

            prompt2 = self.create_prompt(
                CANVAS_STRUCTURED_EXTRACTION_PROMPT, extraction_message
            )
            structured_response = await self.invoke(prompt2, {})

            logger.info("Agent 2 (Structured) Response:")
            logger.info(f"Length: {len(structured_response)} characters")
            logger.info(f"First 500 chars: {structured_response[:500]}")
            logger.info(f"Last 500 chars: {structured_response[-500:]}")
            logger.info(f"Full response: {repr(structured_response)}")

            return await self._parse_research_response(structured_response, item_name)

        except Exception as e:
            return CanvasResearchResponse(
                success=False,
                document=None,
                error_message=f"Error in two-agent research generation: {str(e)}",
            )

    async def generate_research_streaming(
        self,
        item_name: str,
        item_type: str = None,
        creator: str = None,
        scope: str = "highlights",
        selected_model: str = None,
        stream_callback=None,
    ):
        """Generate research document using two-agent system with streaming output"""
        logger.info(
            f"Starting two-agent streaming research with model: {selected_model}"
        )
        logger.info(f"Question: {item_name}")

        # Set model if specified
        if selected_model and selected_model != "default":
            self.set_model(selected_model)

        # Build human message for Agent 1 (Cultural Forensics Analyst)
        if creator:
            human_message = (
                f"Find the influences for this item: '{item_name}' by {creator}"
            )
        else:
            human_message = f"Find the influences for this item: '{item_name}'"

        if item_type:
            human_message += f" ({item_type})"

        try:
            # Step 1: Agent 1 - Free-form analysis with streaming
            if stream_callback:
                stream_callback(
                    {
                        "type": "stage_start",
                        "stage": "analyzing",
                        "message": "Agent 1: Starting cultural forensics analysis...",
                        "progress": 10,
                    }
                )

            prompt1 = self.create_prompt(CANVAS_FREE_FORM_PROMPT, human_message)

            # Stream Agent 1's response with continuous text display
            free_form_response = ""
            accumulated_text = ""

            async for chunk in self.stream_invoke(prompt1, {}, stream_callback):
                free_form_response += chunk
                accumulated_text += chunk

                # Send continuous text update every few chunks
                if len(accumulated_text) >= 50 or chunk.endswith((".", "!", "?", "\n")):
                    if stream_callback:
                        stream_callback(
                            {
                                "type": "continuous_text",
                                "text": accumulated_text,
                                "stage": "analyzing",
                            }
                        )
                    accumulated_text = ""

            # Send final accumulated text
            if accumulated_text and stream_callback:
                stream_callback(
                    {
                        "type": "continuous_text",
                        "text": accumulated_text,
                        "stage": "analyzing",
                    }
                )

            if stream_callback:
                stream_callback(
                    {
                        "type": "stage_complete",
                        "stage": "analyzing",
                        "message": "Agent 1: Finalised research",
                        "progress": 50,
                    }
                )

            # Step 2: Agent 2 - Structured extraction with streaming
            if stream_callback:
                stream_callback(
                    {
                        "type": "stage_start",
                        "stage": "structuring",
                        "message": "Agent 2: Structuring the research...",
                        "progress": 60,
                    }
                )

            extraction_message = f"""Original item: {item_name}
{item_type and f"Type: {item_type}" or ""}
{creator and f"Creator: {creator}" or ""}

Free-form analysis from Cultural Forensics Analyst:
{free_form_response}

Convert this into the exact JSON structure required."""

            prompt2 = self.create_prompt(
                CANVAS_STRUCTURED_EXTRACTION_PROMPT, extraction_message
            )

            # Stream Agent 2's response (but don't show in UI - only collect for parsing)
            structured_response = ""
            async for chunk in self.stream_invoke(
                prompt2, {}, None
            ):  # No stream_callback for Agent 2
                structured_response += chunk

            logger.info("=== AGENT 2 RESPONSE ===")
            logger.info(f"Structured response length: {len(structured_response)}")
            logger.info(f"Structured response: {repr(structured_response)}")

            if stream_callback:
                stream_callback(
                    {
                        "type": "stage_complete",
                        "stage": "structuring",
                        "message": "Agent 2: Structuring done",
                        "progress": 90,
                    }
                )

            # Parse and return the final result
            result = await self._parse_research_response(structured_response, item_name)

            logger.info(f"=== STREAMING COMPLETION ===")
            logger.info(f"Result success: {result.success}")
            logger.info(f"Result document: {result.document}")
            logger.info(f"Result error: {result.error_message}")

            if stream_callback:
                # Create a JSON-serializable version of the document
                document_dict = None
                if result.document:
                    document_dict = result.document.dict()
                    # Convert datetime to ISO string
                    if document_dict.get("created_at"):
                        document_dict["created_at"] = document_dict[
                            "created_at"
                        ].isoformat()
                    # Convert datetime in metadata for each section
                    for section in document_dict.get("sections", []):
                        if section.get("metadata"):
                            metadata = section["metadata"]
                            if metadata.get("createdAt"):
                                if hasattr(metadata["createdAt"], "isoformat"):
                                    metadata["createdAt"] = metadata[
                                        "createdAt"
                                    ].isoformat()
                            if metadata.get("lastEdited"):
                                if hasattr(metadata["lastEdited"], "isoformat"):
                                    metadata["lastEdited"] = metadata[
                                        "lastEdited"
                                    ].isoformat()

                    logger.info(
                        f"Document dict created successfully with {len(document_dict.get('sections', []))} sections"
                    )
                else:
                    logger.error("No document in result - parsing failed")

                stream_callback(
                    {
                        "type": "complete",
                        "message": "Research complete! Document ready.",
                        "document": document_dict,
                        "progress": 100,
                    }
                )

            return result

        except Exception as e:
            if stream_callback:
                stream_callback(
                    {
                        "type": "error",
                        "message": f"Error in streaming research: {str(e)}",
                    }
                )

            return CanvasResearchResponse(
                success=False,
                document=None,
                error_message=f"Error in two-agent streaming research: {str(e)}",
            )

    async def process_chat_message(
        self,
        message: str,
        current_document: CanvasDocument,
        context: Dict[str, Any] = None,
        selected_model: str = None,
    ) -> CanvasChatResponse:
        """Process chat message and update document using two-agent system"""

        # Set model if specified
        if selected_model and selected_model != "default":
            self.set_model(selected_model)

        # Treat all chat messages as influence requests
        return await self._handle_more_influences_request(
            message, current_document, selected_model
        )

    async def _handle_more_influences_request(
        self, message: str, current_document: CanvasDocument, selected_model: str = None
    ) -> CanvasChatResponse:
        """Handle requests for more influences using two-agent system"""

        try:
            # Get current timestamp for unique IDs
            timestamp = int(time.time() * 1000)

            # Build human message with existing influences context
            existing_influences = []
            for s in current_document.sections:
                if s.influence_data and hasattr(s.influence_data, "name"):
                    existing_influences.append(s.influence_data.name)

            # Step 1: Agent 1 - Free-form analysis for new influences
            human_message = f"""Find NEW influences for: {current_document.item_name}
User request: {message}

Current document already has these influences: {', '.join(existing_influences) if existing_influences else 'none yet'}

Find NEW influences that specifically answer their question. Avoid duplicating existing influences."""

            prompt1 = self.create_prompt(CANVAS_FREE_FORM_PROMPT, human_message)
            free_form_response = await self.invoke(prompt1, {})

            # Step 2: Agent 2 - Convert to structured format
            extraction_message = f"""Original item: {current_document.item_name}
{current_document.item_type and f"Type: {current_document.item_type}" or ""}
{current_document.creator and f"Creator: {current_document.creator}" or ""}

User request: {message}

Free-form analysis for NEW influences:
{free_form_response}

Convert this into a JSON array of new influence-item sections. Use these exact IDs in order: "influence-{timestamp}-1", "influence-{timestamp}-2", "influence-{timestamp}-3", etc.

Return ONLY a JSON array of new influence-item sections with the exact structure shown in the prompt."""

            prompt2 = self.create_prompt(
                CANVAS_STRUCTURED_EXTRACTION_PROMPT, extraction_message
            )
            structured_response = await self.invoke(prompt2, {})

            # Parse the response to get new sections
            new_sections = await self._parse_new_sections(
                structured_response, timestamp
            )

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
                error_message=f"Error processing chat with two-agent system: {str(e)}",
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

            # Remove JSON comments (which are not valid in JSON)
            if "//" in json_str:
                json_str = re.sub(r"\s*//.*$", "", json_str, flags=re.MULTILINE)

            # Fix unquoted year values (like 1990s, 1970s-1980s)
            json_str = re.sub(
                r'"year":\s*([0-9]+[a-zA-Z\-]+[0-9]*[a-zA-Z]*)',
                r'"year": "\1"',
                json_str,
            )

            # Clean up any remaining problematic year values
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
        self,
        section_id: str,
        refinement_prompt: str,
        current_document: CanvasDocument,
        selected_model: str = None,
    ) -> Dict[str, Any]:
        """Refine a specific section based on user prompt - returns complete updated section"""

        # Set model if specified
        if selected_model and selected_model != "default":
            self.set_model(selected_model)

        section = next(
            (s for s in current_document.sections if s.id == section_id), None
        )
        if not section:
            raise ValueError(f"Section {section_id} not found")

        # For refinement, we can use the single-agent approach since we're working with existing structured data
        influence_data_text = "None"
        if section.influence_data:
            influence_data_text = f"Influence: {section.influence_data.name}, Year: {section.influence_data.year}, Category: {section.influence_data.category}, Scope: {section.influence_data.scope}"

        human_message = f"""Refine this section based on the user's request.

Section to refine:
ID: {section.id}
Type: {section.type}
Content: {section.content}
Influence data: {influence_data_text}

User's refinement request: {refinement_prompt}

Return the complete updated section in the exact JSON format."""

        prompt = self.create_prompt(CANVAS_REFINE_PROMPT, human_message)

        try:
            logger.info(f"=== REFINE SECTION DEBUG: {section_id} ===")
            logger.info(f"Refinement prompt: {refinement_prompt}")
            logger.info(f"Selected model: {selected_model}")

            response = await self.invoke(prompt, {})
            logger.info(f"Raw refine response: {repr(response)}")

            return await self._parse_refine_response(response, section_id)

        except Exception as e:
            logger.error(f"Exception in refine section: {e}")
            logger.error(f"Exception type: {type(e)}")
            import traceback

            logger.error(f"Full traceback: {traceback.format_exc()}")
            raise Exception(f"Error refining section: {str(e)}")

    async def _parse_refine_response(
        self, response: str, section_id: str
    ) -> Dict[str, Any]:
        """Parse refinement response into section data"""

        logger.info("=== PARSING REFINE RESPONSE ===")
        logger.info(f"Raw refine response length: {len(response)}")
        logger.info(f"Raw refine response: {repr(response)}")

        try:
            # Extract JSON object from response
            logger.info("=== SEARCHING FOR JSON IN REFINE RESPONSE ===")
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if not json_match:
                logger.error("No JSON match found in refine response")
                raise ValueError("No valid JSON found in response")

            json_str = json_match.group()
            logger.info(f"Extracted refine JSON string: {repr(json_str)}")

            # Clean JSON issues
            logger.info("=== CLEANING REFINE JSON ===")
            original_json = json_str
            json_str = json_str.replace(",}", "}")
            json_str = json_str.replace(",]", "]")

            # Remove JSON comments (which are not valid in JSON)
            if "//" in json_str:
                logger.warning("Found JSON comments in refine response - removing them")
                json_str = re.sub(r"\s*//.*$", "", json_str, flags=re.MULTILINE)
                logger.info("Removed JSON comments from refine response")

            json_str = re.sub(r'"year":\s*"[^"]*"', '"year": null', json_str)
            json_str = re.sub(r'"year":\s*[a-zA-Z][^,}\]]*', '"year": null', json_str)
            json_str = re.sub(r",(\s*[}\]])", r"\1", json_str)

            if json_str != original_json:
                logger.info("Refine JSON was modified during cleaning")
                logger.info(f"Cleaned refine JSON: {repr(json_str)}")

            logger.info("=== ATTEMPTING REFINE JSON PARSE ===")
            section_data = json.loads(json_str)
            logger.info("Refine JSON parsing successful!")
            logger.info(f"Parsed refine data: {section_data}")

            # Ensure the section ID matches
            section_data["id"] = section_id
            logger.info(f"Set section ID to: {section_id}")

            return section_data

        except json.JSONDecodeError as e:
            logger.error(f"Refine JSON parsing failed: {e}")
            logger.error(f"Error at line {e.lineno}, column {e.colno}, char {e.pos}")

            # Show context around the error
            if hasattr(e, "pos") and e.pos is not None:
                start = max(0, e.pos - 100)
                end = min(len(json_str), e.pos + 100)
                context = json_str[start:end]
                logger.error(f"Context around refine error position {e.pos}:")
                logger.error(f"'{context}'")

                # Show exactly what's at the error position
                if e.pos < len(json_str):
                    error_char = json_str[e.pos]
                    logger.error(
                        f"Character at refine error position: {repr(error_char)}"
                    )

            raise ValueError(f"Failed to parse refinement response as JSON: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error during refine parsing: {e}")
            logger.error(f"Refine error type: {type(e)}")
            import traceback

            logger.error(f"Refine traceback: {traceback.format_exc()}")
            raise ValueError(f"Failed to parse refinement response: {str(e)}")

    async def _parse_research_response(
        self, response: str, item_name: str
    ) -> CanvasResearchResponse:
        """Parse AI response into CanvasResearchResponse"""

        logger.info("=== PARSING RESEARCH RESPONSE ===")
        logger.info(f"Raw response length: {len(response)}")
        logger.info(f"Raw response: {repr(response)}")

        try:
            # Extract JSON object from response
            logger.info("=== SEARCHING FOR JSON ===")
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if not json_match:
                logger.error("No JSON match found in response")
                return CanvasResearchResponse(
                    success=False,
                    document=None,
                    error_message="No valid JSON found in response",
                )

            json_str = json_match.group()
            logger.info(f"Extracted JSON string length: {len(json_str)}")
            logger.info(f"Extracted JSON string: {repr(json_str)}")

            # Clean JSON issues
            logger.info("=== CLEANING JSON ===")
            original_json = json_str
            json_str = json_str.replace(",}", "}")
            json_str = json_str.replace(",]", "]")

            # Remove JSON comments (which are not valid in JSON)
            if "//" in json_str:
                logger.warning("Found JSON comments - removing them")
                json_str = re.sub(r"\s*//.*$", "", json_str, flags=re.MULTILINE)
                logger.info("Removed JSON comments")

            # Check for problematic year values and log them as errors
            year_problems = re.findall(r'"year":\s*([^,}\]]+)', json_str)
            for year_val in year_problems:
                year_val = year_val.strip()
                if not year_val.isdigit():
                    logger.error(f"Found non-integer year value: {year_val}")
                    logger.error("The AI should only output integer years, not strings")

            json_str = re.sub(r",(\s*[}\]])", r"\1", json_str)

            if json_str != original_json:
                logger.info("JSON was modified during cleaning")
                logger.info(f"Cleaned JSON: {repr(json_str)}")
            else:
                logger.info("JSON unchanged during cleaning")

            logger.info("=== ATTEMPTING JSON PARSE ===")
            data = json.loads(json_str)
            logger.info("JSON parsing successful!")
            logger.info(f"Parsed data keys: {list(data.keys())}")
            logger.info(f"Parsed data: {data}")

            # Create CanvasDocument
            logger.info("=== CREATING CANVAS DOCUMENT ===")
            document = CanvasDocument(
                id=f"canvas-{int(time.time() * 1000)}",
                item_name=data.get("item_name", item_name),
                item_type=data.get("item_type"),
                item_year=data.get("item_year"),
                creator=data.get("item_creator"),
                sections=self._parse_sections(data.get("sections", [])),
                created_at=datetime.now(),
            )
            logger.info(f"Created document with {len(document.sections)} sections")

            return CanvasResearchResponse(
                success=True,
                document=document,
                response_text=f"I've created a comprehensive research document about {document.item_name} using advanced cultural forensics analysis. You can now ask questions, refine sections, or select influences to add to the graph.",
            )

        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed: {e}")
            logger.error(f"Error at line {e.lineno}, column {e.colno}, char {e.pos}")

            # Show context around the error
            if hasattr(e, "pos") and e.pos is not None:
                start = max(0, e.pos - 100)
                end = min(len(json_str), e.pos + 100)
                context = json_str[start:end]
                logger.error(f"Context around error position {e.pos}:")
                logger.error(f"'{context}'")

                # Show exactly what's at the error position
                if e.pos < len(json_str):
                    error_char = json_str[e.pos]
                    logger.error(f"Character at error position: {repr(error_char)}")

            # Try to show line-by-line breakdown
            lines = json_str.split("\n")
            logger.error("JSON content line by line:")
            for i, line in enumerate(lines, 1):
                logger.error(f"Line {i}: {repr(line)}")

            return CanvasResearchResponse(
                success=False,
                document=None,
                error_message=f"Failed to parse research response as JSON: {str(e)}",
            )
        except Exception as e:
            logger.error(f"Unexpected error during parsing: {e}")
            logger.error(f"Error type: {type(e)}")
            import traceback

            logger.error(f"Traceback: {traceback.format_exc()}")
            return CanvasResearchResponse(
                success=False,
                document=None,
                error_message=f"Failed to parse research response: {str(e)}",
            )

    def _parse_sections(self, sections_data: List[Dict]) -> List[DocumentSection]:
        """Parse sections data into DocumentSection objects"""

        sections = []
        for section_data in sections_data:
            # Parse influence_data if present
            influence_data = None
            if section_data.get("influence_data"):
                try:
                    influence_data = InfluenceProposal(**section_data["influence_data"])
                except Exception as e:
                    print(f"Failed to parse influence_data: {e}")
                    influence_data = None

            section = DocumentSection(
                id=section_data.get("id", ""),
                type=section_data.get("type", "influence-item"),
                title=section_data.get("title"),
                content=section_data.get("content", ""),
                influence_data=influence_data,
                selectedForGraph=section_data.get("selectedForGraph", True),
                isEditing=section_data.get("isEditing", False),
                metadata=section_data.get(
                    "metadata", {"createdAt": datetime.now(), "aiGenerated": True}
                ),
            )
            sections.append(section)

        return sections
