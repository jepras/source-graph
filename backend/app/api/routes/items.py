from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.models.item import Item, GraphResponse, UpdateItemRequest
from app.services.graph.graph_service import graph_service

router = APIRouter(prefix="/items", tags=["items"])


@router.get("/search", response_model=List[Item])
async def search_items(q: str):
    """Search for items"""
    try:
        items = graph_service.search_items(q)
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{item_id}", response_model=Item)
async def get_item(item_id: str):
    """Get single item by ID"""
    item = graph_service.get_item_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.get("/{item_id}/influences", response_model=GraphResponse)
async def get_item_influences(
    item_id: str,
    scopes: Optional[List[str]] = Query(
        None, description="Filter by scopes: macro, micro, nano"
    ),
):
    """Get item with its influences, optionally filtered by scope"""
    try:
        # Validate scopes if provided
        if scopes:
            valid_scopes = {"macro", "micro", "nano"}
            invalid_scopes = set(scopes) - valid_scopes
            if invalid_scopes:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid scopes: {list(invalid_scopes)}. Valid scopes: {list(valid_scopes)}",
                )

        graph_data = graph_service.get_influences(item_id, scopes=scopes)
        return graph_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{item_id}/expansion-counts")
async def get_expansion_counts(item_id: str):
    """Get counts for potential graph expansions"""
    try:
        counts = graph_service.get_expansion_counts(item_id)
        return counts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{item_id}/influences-outgoing")
async def get_outgoing_influences(item_id: str):
    """Get what this item influences (outgoing relationships)"""
    try:
        influences = graph_service.get_what_item_influences(item_id)
        return {
            "item_id": item_id,
            "outgoing_influences": [
                {
                    "from_item": inf.from_item.dict(),
                    "to_item": inf.to_item.dict(),
                    "confidence": inf.confidence,
                    "influence_type": inf.influence_type,
                    "explanation": inf.explanation,
                    "category": inf.category,
                    "clusters": inf.clusters,
                }
                for inf in influences
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{item_id}/expanded-graph")
async def get_expanded_graph(
    item_id: str,
    include_incoming: bool = True,
    include_outgoing: bool = True,
    max_depth: int = 2,
):
    """Get expanded graph with multiple layers"""
    try:
        graph_data = graph_service.get_expanded_graph(
            center_item_id=item_id,
            include_incoming=include_incoming,
            include_outgoing=include_outgoing,
            max_depth=max_depth,
        )
        return graph_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{item_id}/test-expansion")
async def test_expansion(item_id: str):
    """Simple test endpoint for expansion functionality"""
    try:
        # Just return basic info about the item
        item = graph_service.get_item_by_id(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        return {
            "item_id": item_id,
            "item_name": item.name,
            "status": "expansion_test_working",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")


@router.delete("/{item_id}")
async def delete_item(item_id: str):
    """Delete item and all its relationships"""
    try:
        success = graph_service.delete_item_completely(item_id)
        if success:
            return {"success": True, "message": "Item deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete item")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{item_id}/merge-candidates")
async def get_merge_candidates(item_id: str):
    """Get potential merge candidates for an item"""
    try:
        item = graph_service.get_item_by_id(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        # Get creators for better matching
        graph_data = graph_service.get_influences(item_id)
        creator_name = graph_data.creators[0].name if graph_data.creators else None

        candidates = graph_service.find_similar_items(item.name, creator_name)
        # Remove the current item from candidates
        candidates = [c for c in candidates if c["id"] != item_id]

        return {"candidates": candidates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{source_id}/merge-into/{target_id}")
async def merge_items(source_id: str, target_id: str):
    """Merge source item into target item"""
    try:
        result_id = graph_service.merge_items(source_id, target_id)
        return {
            "success": True,
            "target_item_id": result_id,
            "message": "Items merged successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{item_id}")
async def update_item(item_id: str, update_data: UpdateItemRequest):
    """Update an existing item"""
    try:
        # Convert Pydantic model to dict, excluding None values
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}

        if not update_dict:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        updated_item = graph_service.update_item(item_id, update_dict)

        if not updated_item:
            raise HTTPException(status_code=404, detail="Item not found")

        return {
            "success": True,
            "item": updated_item,
            "message": "Item updated successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
