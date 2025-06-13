from fastapi import APIRouter, HTTPException
from app.models.structured import StructuredOutput
from app.services.graph.graph_service import graph_service

router = APIRouter(prefix="/influences", tags=["influences"])


@router.post("/save")
async def save_structured_influences(structured_data: StructuredOutput):
    """Save structured influence data to the database"""
    try:
        # Always check for similar items (loose matching)
        similar_items = graph_service.find_similar_items(
            name=structured_data.main_item,
            creator_name=structured_data.main_item_creator,
        )

        if similar_items:
            return {
                "success": False,
                "requires_review": True,
                "similar_items": similar_items,
                "new_data": structured_data.dict(),
                "message": f"Found {len(similar_items)} potentially similar item(s). Please review before proceeding.",
            }

        # No conflicts, save normally
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


@router.get("/preview/{item_id}")
async def get_item_preview(item_id: str):
    """Get existing item data for merge preview"""
    try:
        preview_data = graph_service.get_item_preview(item_id)
        return preview_data
    except Exception as e:
        raise HTTPException(
            status_code=404, detail=f"Failed to get item preview: {str(e)}"
        )


@router.post("/force-save")
async def force_save_as_new(structured_data: StructuredOutput):
    """Force save as new item, ignoring conflicts"""
    try:
        main_item_id = graph_service.save_structured_influences(structured_data)
        return {
            "success": True,
            "item_id": main_item_id,
            "message": f"Successfully created new item '{structured_data.main_item}'",
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save influences: {str(e)}"
        )


@router.post("/merge")
async def merge_with_existing(merge_request: dict):
    """Merge new influences with existing item"""
    try:
        # Validate required fields
        if "existing_item_id" not in merge_request:
            raise HTTPException(status_code=400, detail="Missing existing_item_id")
        if "new_data" not in merge_request:
            raise HTTPException(status_code=400, detail="Missing new_data")

        existing_item_id = merge_request["existing_item_id"]

        # Parse new_data more safely
        try:
            new_data = StructuredOutput(**merge_request["new_data"])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid new_data format: {e}")

        # Add new influences to existing item
        result_id = graph_service.add_influences_to_existing(existing_item_id, new_data)

        return {
            "success": True,
            "item_id": result_id,
            "message": "Successfully merged influences with existing item",
        }

    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to merge influences: {str(e)}"
        )


@router.get("/test")
async def test_save():
    """Test endpoint to verify influences routes work"""
    return {"message": "Influences API working"}
