from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import logging
import json
import html

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
    """Enhance an item with relevant content from various sources"""

    try:
        # Get the item from the database
        item = graph_service.get_item_by_id(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        # Run enhancement with the specified max_content_pieces
        max_content_pieces = request.max_content_pieces or 4
        result = await agent.enhance_item(item, max_content_pieces)

        if result.get("error"):
            logger.error(f"Enhancement failed: {result['error']}")
            raise HTTPException(status_code=500, detail=result["error"])

        # Convert to response format using structured data from enhancement agent
        enhanced_content = []
        for content_item in result.get("enhanced_content", []):
            if not isinstance(content_item, dict):
                logger.error(
                    f"[Enhancement API] Skipping non-dict content: {repr(content_item)}"
                )
                continue

            # Use the structured data provided by the enhancement agent
            try:
                enhanced_content.append(
                    EnhancedContent(
                        item_id=item_id,
                        content_type=content_item.get("content_type", "unknown"),
                        source=content_item.get("source", "unknown"),
                        title=content_item.get("title", "Untitled"),
                        url=content_item.get("url", ""),
                        thumbnail=content_item.get("thumbnail", None),
                        relevance_score=content_item.get("score", 5.0),
                        context_explanation=content_item.get(
                            "explanation", "No explanation provided"
                        ),
                        embedded_data=content_item.get("original_result", {}),
                    )
                )
            except Exception as e:
                logger.error(f"[Enhancement API] Failed to create EnhancedContent: {e}")
                continue

        # Save enhanced content to database
        saved_content_ids = []
        for content in enhanced_content:
            try:
                content_id = graph_service.save_enhanced_content(content)
                saved_content_ids.append(content_id)
                logger.info(f"Saved enhanced content {content_id} for item {item_id}")
            except Exception as e:
                logger.error(f"Failed to save enhanced content: {e}")

        logger.info(
            f"Saved {len(saved_content_ids)} enhanced content pieces to database"
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
        import traceback

        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")


@router.get("/items/{item_id}/enhanced-content", response_model=List[EnhancedContent])
async def get_enhanced_content(
    item_id: str, graph_service: GraphService = Depends(get_graph_service)
):
    """Get enhanced content for an item"""

    try:
        # Get enhanced content from database
        enhanced_content = graph_service.get_enhanced_content(item_id)
        return enhanced_content

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
        # Delete enhanced content from database
        success = graph_service.delete_enhanced_content(content_id)

        if success:
            return {"message": "Enhanced content deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Enhanced content not found")

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
