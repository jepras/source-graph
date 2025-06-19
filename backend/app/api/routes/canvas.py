from fastapi import APIRouter, HTTPException
from app.models.canvas import (
    CanvasResearchRequest,
    CanvasResearchResponse,
    CanvasChatRequest,
    CanvasChatResponse,
)
from app.services.ai_agents.canvas_agent import canvas_agent

router = APIRouter(prefix="/canvas", tags=["canvas"])


@router.post("/research", response_model=CanvasResearchResponse)
async def start_research(request: CanvasResearchRequest):
    """Generate initial Canvas research document"""
    try:
        response = await canvas_agent.generate_research(
            item_name=request.item_name,
            item_type=request.item_type,
            creator=request.creator,
            scope=request.scope,
        )
        return response

    except Exception as e:
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
        )
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process chat: {str(e)}")


@router.post("/refine")
async def refine_section(request: dict):
    """Refine a specific section - returns complete updated section"""
    try:
        # Validate required fields
        if "section_id" not in request:
            raise HTTPException(status_code=400, detail="section_id is required")
        if "prompt" not in request:
            raise HTTPException(status_code=400, detail="prompt is required")
        if "document" not in request:
            raise HTTPException(status_code=400, detail="document is required")

        # Convert dict document back to CanvasDocument (same parsing as before)
        from app.models.canvas import CanvasDocument, DocumentSection
        from app.models.proposal import InfluenceProposal
        from datetime import datetime

        document_data = request["document"]

        # Convert sections manually since they might need special handling
        sections = []
        for section_data in document_data.get("sections", []):
            # Convert influence_data if present
            influence_data = None
            if section_data.get("influence_data"):
                try:
                    influence_data = InfluenceProposal(**section_data["influence_data"])
                except Exception as e:
                    print(f"Failed to parse influence_data: {e}")
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
                selectedForGraph=section_data.get("selectedForGraph", False),
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

        # Get refined section data (complete section, not just content)
        refined_section_data = await canvas_agent.refine_section(
            section_id=request["section_id"],
            refinement_prompt=request["prompt"],
            current_document=canvas_document,
        )

        return {"success": True, "refined_section": refined_section_data}

    except Exception as e:
        print(f"Refine section error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to refine section: {str(e)}"
        )
