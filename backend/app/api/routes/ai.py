from fastapi import APIRouter, HTTPException
from app.models.ai import ResearchRequest, ResearchResponse
from app.models.structured import StructureRequest, StructuredOutput
from app.services.ai_agents.research_agent import research_agent
from app.services.ai_agents.structure_agent import structure_agent


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/research", response_model=ResearchResponse)
async def research_influences(request: ResearchRequest):
    """Research influences for an item using AI"""
    try:
        # Call the research agent
        influences_text = await research_agent.research_influences(
            item_name=request.item_name,
            item_type=request.item_type,
            artist=request.artist,
        )

        # Check if there was an error
        if influences_text.startswith("Error researching influences:"):
            return ResearchResponse(
                item_name=request.item_name,
                item_type=request.item_type,
                artist=request.artist,
                influences_text="",
                success=False,
                error_message=influences_text,
            )

        return ResearchResponse(
            item_name=request.item_name,
            item_type=request.item_type,
            artist=request.artist,
            influences_text=influences_text,
            success=True,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to research influences: {str(e)}"
        )


@router.post("/structure", response_model=StructuredOutput)
async def structure_influences(request: StructureRequest):
    """Convert free text influences into structured data"""
    try:
        structured_data = await structure_agent.structure_influences(
            influences_text=request.influences_text,
            main_item=request.main_item,
            main_item_creator=request.main_item_creator,
        )

        return structured_data

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to structure influences: {str(e)}"
        )


@router.get("/health")
async def ai_health_check():
    """Check if AI services are working"""
    try:
        # Simple test call
        test_response = await research_agent.research_influences(
            item_name="Test Song", item_type="song", artist="Test Artist"
        )

        return {
            "status": "healthy",
            "ai_service": "operational",
            "test_response_length": len(test_response),
        }
    except Exception as e:
        return {"status": "unhealthy", "ai_service": "error", "error": str(e)}
