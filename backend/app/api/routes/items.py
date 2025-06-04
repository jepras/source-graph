from fastapi import APIRouter, HTTPException
from typing import List
from app.models.item import Item, GraphResponse
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
async def get_item_influences(item_id: str):
    """Get item with its influences"""
    try:
        graph_data = graph_service.get_influences(item_id)
        return graph_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
