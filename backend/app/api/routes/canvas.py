from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import logging
import asyncio
from collections import deque
from app.models.canvas import (
    CanvasResearchRequest,
    CanvasResearchResponse,
    CanvasChatRequest,
    CanvasChatResponse,
)
from app.services.ai_agents.canvas_agent import canvas_agent
from app.services.ai_agents.two_agent_canvas_agent import TwoAgentCanvasAgent

# Set up logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

router = APIRouter(prefix="/canvas", tags=["canvas"])

# Create two-agent instance
two_agent_canvas_agent = TwoAgentCanvasAgent()


@router.post("/research", response_model=CanvasResearchResponse)
async def start_research(request: CanvasResearchRequest):
    """Generate initial Canvas research document"""
    logger.info("=== CANVAS RESEARCH ENDPOINT ===")
    logger.info(f"Request: {request}")

    try:
        # Check if two-agent system is requested
        use_two_agent = getattr(request, "use_two_agent", False)
        logger.info(f"Using two-agent system: {use_two_agent}")

        if use_two_agent:
            agent = two_agent_canvas_agent
            logger.info("Selected TwoAgentCanvasAgent")
        else:
            agent = canvas_agent
            logger.info("Selected CanvasAgent")

        logger.info(
            f"Calling agent.generate_research with item_name='{request.item_name}'"
        )
        response = await agent.generate_research(
            item_name=request.item_name,
            item_type=request.item_type,
            creator=request.creator,
            scope=request.scope,
            selected_model=getattr(request, "selected_model", None),
        )

        logger.info(f"Agent response success: {response.success}")
        if not response.success:
            logger.error(f"Agent response error: {response.error_message}")

        # Add active model info to response
        active_model_info = agent.get_active_model_info()
        response.active_model = active_model_info["model_key"]
        response.active_model_display = active_model_info["display_name"]

        logger.info("Research endpoint completed successfully")
        return response

    except Exception as e:
        logger.error(f"Exception in research endpoint: {e}")
        logger.error(f"Exception type: {type(e)}")
        import traceback

        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, detail=f"Failed to generate research: {str(e)}"
        )


@router.post("/chat", response_model=CanvasChatResponse)
async def process_chat(request: CanvasChatRequest):
    """Process chat message and update document"""
    try:
        response = await canvas_agent.process_chat_message(
            message=request.message,
            current_document=request.current_document,
            context=request.context,
            selected_model=getattr(request, "selected_model", None),
        )

        # Add active model info to response
        active_model_info = canvas_agent.get_active_model_info()
        response.active_model = active_model_info["model_key"]
        response.active_model_display = active_model_info["display_name"]

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process chat: {str(e)}")


@router.post("/refine")
async def refine_section(request: dict):
    """Refine a specific section - returns complete updated section"""
    print("=== CANVAS REFINE ENDPOINT ===")
    print(f"Refine request keys: {list(request.keys())}")
    print(f"Section ID: {request.get('section_id', 'NOT FOUND')}")
    print(f"Prompt: {request.get('prompt', 'NOT FOUND')}")
    print(f"Document ID: {request.get('document', {}).get('id', 'NOT FOUND')}")

    try:
        # Validate required fields
        if "section_id" not in request:
            print("ERROR: Missing section_id in request")
            raise HTTPException(status_code=400, detail="section_id is required")
        if "prompt" not in request:
            print("ERROR: Missing prompt in request")
            raise HTTPException(status_code=400, detail="prompt is required")
        if "document" not in request:
            print("ERROR: Missing document in request")
            raise HTTPException(status_code=400, detail="document is required")

        # Convert dict document back to CanvasDocument (same parsing as before)
        from app.models.canvas import CanvasDocument, DocumentSection
        from app.models.proposal import InfluenceProposal
        from datetime import datetime

        document_data = request["document"]
        print(f"Document data keys: {list(document_data.keys())}")
        print(f"Number of sections: {len(document_data.get('sections', []))}")

        # Convert sections manually since they might need special handling
        sections = []
        for i, section_data in enumerate(document_data.get("sections", [])):
            print(f"Processing section {i}: {section_data.get('id', 'NO ID')}")

            # Convert influence_data if present
            influence_data = None
            if section_data.get("influence_data"):
                try:
                    influence_data = InfluenceProposal(**section_data["influence_data"])
                    print(f"Successfully parsed influence_data for section {i}")
                except Exception as e:
                    print(f"ERROR: Failed to parse influence_data for section {i}: {e}")
                    influence_data = None

            # Parse created_at if it's a string
            created_at = section_data.get("metadata", {}).get("createdAt")
            if isinstance(created_at, str):
                try:
                    created_at = datetime.fromisoformat(
                        created_at.replace("Z", "+00:00")
                    )
                except:
                    created_at = datetime.now()
            elif not created_at:
                created_at = datetime.now()

            section = DocumentSection(
                id=section_data.get("id", ""),
                type=section_data.get("type", "influence-item"),
                title=section_data.get("title"),
                content=section_data.get("content", ""),
                influence_data=influence_data,
                selectedForGraph=section_data.get("selectedForGraph", True),
                isEditing=section_data.get("isEditing", False),
                metadata=section_data.get(
                    "metadata", {"createdAt": created_at, "aiGenerated": True}
                ),
            )
            sections.append(section)

        # Parse document created_at
        doc_created_at = document_data.get("created_at")
        if isinstance(doc_created_at, str):
            try:
                doc_created_at = datetime.fromisoformat(
                    doc_created_at.replace("Z", "+00:00")
                )
            except:
                doc_created_at = datetime.now()
        elif not doc_created_at:
            doc_created_at = datetime.now()

        # Create CanvasDocument
        canvas_document = CanvasDocument(
            id=document_data.get("id", ""),
            item_name=document_data.get("item_name", ""),
            item_type=document_data.get("item_type"),
            creator=document_data.get("creator"),
            sections=sections,
            created_at=doc_created_at,
        )
        print(f"Created CanvasDocument with {len(canvas_document.sections)} sections")

        # Get refined section data (complete section, not just content)
        print(
            f"Calling canvas_agent.refine_section for section_id: {request['section_id']}"
        )
        refined_section_data = await canvas_agent.refine_section(
            section_id=request["section_id"],
            refinement_prompt=request["prompt"],
            current_document=canvas_document,
            selected_model=request.get("selected_model"),
        )
        print("Successfully got refined section data")

        # Add active model info to response
        active_model_info = canvas_agent.get_active_model_info()
        print("Refine endpoint completed successfully")

        return {
            "success": True,
            "refined_section": refined_section_data,
            "active_model": active_model_info["model_key"],
            "active_model_display": active_model_info["display_name"],
        }

    except Exception as e:
        print(f"EXCEPTION in refine endpoint: {e}")
        print(f"Exception type: {type(e)}")
        import traceback

        print(f"Full traceback: {traceback.format_exc()}")
        print(f"Refine section error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to refine section: {str(e)}"
        )


@router.get("/research/stream")
async def start_research_streaming(
    item_name: str = Query(..., description="Name of the item to research"),
    item_type: str = Query(None, description="Type of the item"),
    creator: str = Query(None, description="Creator of the item"),
    use_two_agent: bool = Query(True, description="Use two-agent system"),
    selected_model: str = Query(None, description="Selected AI model"),
):
    """Stream research process with real-time AI output"""
    logger.info(f"=== CANVAS STREAMING RESEARCH ENDPOINT ===")
    logger.info(f"Item: {item_name}, Type: {item_type}, Creator: {creator}")
    logger.info(f"Use two-agent: {use_two_agent}, Model: {selected_model}")

    async def generate_stream():
        """Generate streaming response using real AI agents"""
        try:
            # Step 1: Initial connection message
            yield 'data: {"type": "connected", "message": "Starting research stream..."}\n\n'
            await asyncio.sleep(0.1)

            # Step 2: Agent selection message
            agent_type = "Two-Agent System" if use_two_agent else "Single Agent"
            yield f'data: {{"type": "agent_selected", "message": "Using {agent_type}"}}\n\n'
            await asyncio.sleep(0.1)

            # Step 3: Use real two-agent streaming
            if use_two_agent:
                # Create two-agent instance
                agent = TwoAgentCanvasAgent()
                if selected_model and selected_model != "default":
                    agent.set_model(selected_model)

                # Create a queue for real-time streaming
                import json

                # Queue to hold streaming data
                stream_queue = deque()
                streaming_complete = asyncio.Event()

                def stream_callback(data):
                    """Callback to queue streaming data for immediate yield"""
                    try:
                        json_data = json.dumps(data)
                        stream_queue.append(json_data)
                    except Exception as e:
                        logger.error(f"Error in stream callback: {e}")

                # Start the research in background
                async def run_research():
                    try:
                        result = await agent.generate_research_streaming(
                            item_name=item_name,
                            item_type=item_type,
                            creator=creator,
                            scope="highlights",
                            selected_model=selected_model,
                            stream_callback=stream_callback,
                        )
                        streaming_complete.set()
                    except Exception as e:
                        logger.error(f"Research error: {e}")
                        streaming_complete.set()

                # Start research task
                research_task = asyncio.create_task(run_research())

                # Stream data as it becomes available
                while not streaming_complete.is_set() or stream_queue:
                    if stream_queue:
                        data = stream_queue.popleft()
                        yield f"data: {data}\n\n"
                    else:
                        await asyncio.sleep(0.1)  # Small delay to avoid busy waiting

                # Wait for research to complete
                await research_task

                # Send completion message
                yield 'data: {"type": "complete", "message": "Research complete! Document ready."}\n\n'

            else:
                # Fallback to simulated output for single agent
                yield 'data: {"type": "stage_start", "stage": "analyzing", "message": "Single Agent: Starting analysis..."}\n\n'
                await asyncio.sleep(2.0)
                yield 'data: {"type": "complete", "message": "Research complete! Document ready."}\n\n'

        except Exception as e:
            logger.error(f"Error in streaming: {e}")
            yield f'data: {{"type": "error", "message": "Streaming error: {str(e)}"}}\n\n'

    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        },
    )
