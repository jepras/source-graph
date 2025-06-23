from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import logging

from app.models.enhancement import (
    EnhancementRequest,
    EnhancementResponse,
    EnhancedContent,
    EnhancementStatus,
)
from app.models.item import Item
from app.services.ai_agents.enhancement_agent import EnhancementAgent
from app.services.graph.graph_service import GraphService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/enhancement", tags=["enhancement"])


async def get_enhancement_agent() -> EnhancementAgent:
    """Dependency to get enhancement agent instance"""
    return EnhancementAgent()


async def get_graph_service() -> GraphService:
    """Dependency to get graph service instance"""
    return GraphService()


@router.post("/items/{item_id}/enhance", response_model=EnhancementResponse)
async def enhance_item(
    item_id: str,
    request: EnhancementRequest,
    agent: EnhancementAgent = Depends(get_enhancement_agent),
    graph_service: GraphService = Depends(get_graph_service),
):
    """Enhance an item with relevant content using MCP tools"""

    try:
        # Get the item from the database
        item = await graph_service.get_item(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        # Set model if specified
        if request.model_name:
            agent.set_model(request.model_name)

        # Run enhancement
        result = await agent.enhance_item(item)

        # Convert to response format
        enhanced_content = []
        for content in result.get("enhanced_content", []):
            # Extract content from the scored result
            original_result = content.get("original_result", {})
            if "result" in original_result and "content" in original_result["result"]:
                for item_content in original_result["result"]["content"]:
                    enhanced_content.append(
                        EnhancedContent(
                            item_id=item_id,
                            content_type=(
                                "video" if content.get("tool") == "youtube" else "text"
                            ),
                            source=content.get("tool", "unknown"),
                            title=item_content.get("title", "Untitled"),
                            url=item_content.get("url", ""),
                            thumbnail=item_content.get("thumbnail", None),
                            relevance_score=content.get("score", 5.0),
                            context_explanation=content.get(
                                "explanation", "No explanation provided"
                            ),
                            embedded_data=item_content,
                        )
                    )

        return EnhancementResponse(
            item_id=item_id,
            analysis=result.get("analysis", {}),
            enhanced_content=enhanced_content,
            enhancement_summary=result.get(
                "enhancement_summary", "Enhancement completed"
            ),
            error=result.get("error"),
        )

    except Exception as e:
        logger.error(f"Enhancement failed for item {item_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")


@router.get("/items/{item_id}/enhanced-content", response_model=List[EnhancedContent])
async def get_enhanced_content(
    item_id: str, graph_service: GraphService = Depends(get_graph_service)
):
    """Get enhanced content for an item"""

    try:
        # TODO: Implement database storage and retrieval
        # For now, return empty list
        return []

    except Exception as e:
        logger.error(f"Failed to get enhanced content for item {item_id}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve enhanced content: {str(e)}"
        )


@router.delete("/enhanced-content/{content_id}")
async def delete_enhanced_content(
    content_id: str, graph_service: GraphService = Depends(get_graph_service)
):
    """Delete a specific piece of enhanced content"""

    try:
        # TODO: Implement database deletion
        return {"message": "Enhanced content deleted successfully"}

    except Exception as e:
        logger.error(f"Failed to delete enhanced content {content_id}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to delete enhanced content: {str(e)}"
        )


@router.get("/status", response_model=EnhancementStatus)
async def get_enhancement_status():
    """Get overall enhancement system status"""

    try:
        # Check if MCP clients are available
        agent = EnhancementAgent()
        available_tools = list(agent.mcp_clients.keys())

        status = "healthy" if available_tools else "degraded"
        message = f"Enhancement system is {status}. Available tools: {', '.join(available_tools)}"

        return EnhancementStatus(status=status, progress=100.0, message=message)

    except Exception as e:
        logger.error(f"Failed to get enhancement status: {e}")
        return EnhancementStatus(
            status="failed", progress=0.0, message=f"Enhancement system error: {str(e)}"
        )
