from fastapi import APIRouter, HTTPException
from app.models.structured import StructuredOutput
from app.services.graph.graph_service import graph_service

router = APIRouter(prefix="/influences", tags=["influences"])


@router.post("/save")
async def save_structured_influences(structured_data: StructuredOutput):
    """Save structured influence data to the database"""
    try:
        # Use the graph service to save the structured data
        main_item_id = graph_service.save_structured_influences(structured_data)

        return {
            "success": True,
            "item_id": main_item_id,
            "message": f"Successfully saved influences for '{structured_data.main_item}'",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save influences: {str(e)}"
        )


@router.get("/test")
async def test_save():
    """Test endpoint to verify influences routes work"""
    return {"message": "Influences API working"}
