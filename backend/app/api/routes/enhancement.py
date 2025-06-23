from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import logging
import json

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
        item = graph_service.get_item_by_id(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        # Set model if specified
        if request.model_name:
            agent.set_model(request.model_name)

        # Run enhancement
        result = await agent.enhance_item(item)
        logger.error(
            f"[Enhancement API] Enhancement agent returned result of type {type(result)}: {repr(result)}"
        )

        # Convert to response format
        enhanced_content = []
        for idx, content in enumerate(result.get("enhanced_content", [])):
            if not isinstance(content, dict):
                logger.error(
                    f"[Enhancement API] Skipping non-dict content at index {idx}: {repr(content)} (type: {type(content)})"
                )
                continue
            original_result = content.get("original_result", {})
            if (
                isinstance(original_result, dict)
                and "result" in original_result
                and "content" in original_result["result"]
            ):
                for item_content in original_result["result"]["content"]:
                    # Parse JSON string if item_content is a string
                    if isinstance(item_content, str):
                        try:
                            item_content = json.loads(item_content)
                        except json.JSONDecodeError as e:
                            logger.error(
                                f"[Enhancement API] Failed to parse JSON content: {e}"
                            )
                            continue

                    # Handle case where item_content is a list of search results
                    if isinstance(item_content, list):
                        for search_result in item_content:
                            if not isinstance(search_result, dict):
                                logger.error(
                                    f"[Enhancement API] Skipping non-dict search_result: {repr(search_result)} (type: {type(search_result)})"
                                )
                                continue

                            # Extract video data from snippet if available
                            snippet = search_result.get("snippet", {})
                            video_id = search_result.get("id", {}).get("videoId", "")

                            enhanced_content.append(
                                EnhancedContent(
                                    item_id=item_id,
                                    content_type=(
                                        "video"
                                        if content.get("tool") == "youtube"
                                        else "text"
                                    ),
                                    source=content.get("tool", "unknown"),
                                    title=snippet.get("title", "Untitled"),
                                    url=(
                                        f"https://www.youtube.com/watch?v={video_id}"
                                        if video_id
                                        else ""
                                    ),
                                    thumbnail=snippet.get("thumbnails", {})
                                    .get("medium", {})
                                    .get("url", None),
                                    relevance_score=content.get("score", 5.0),
                                    context_explanation=content.get(
                                        "explanation", "No explanation provided"
                                    ),
                                    embedded_data=search_result,
                                )
                            )
                    elif isinstance(item_content, dict):
                        # Extract video data from snippet if available
                        snippet = item_content.get("snippet", {})
                        video_id = item_content.get("id", {}).get("videoId", "")

                        enhanced_content.append(
                            EnhancedContent(
                                item_id=item_id,
                                content_type=(
                                    "video"
                                    if content.get("tool") == "youtube"
                                    else "text"
                                ),
                                source=content.get("tool", "unknown"),
                                title=snippet.get("title", "Untitled"),
                                url=(
                                    f"https://www.youtube.com/watch?v={video_id}"
                                    if video_id
                                    else ""
                                ),
                                thumbnail=snippet.get("thumbnails", {})
                                .get("medium", {})
                                .get("url", None),
                                relevance_score=content.get("score", 5.0),
                                context_explanation=content.get(
                                    "explanation", "No explanation provided"
                                ),
                                embedded_data=item_content,
                            )
                        )
                    else:
                        logger.error(
                            f"[Enhancement API] Skipping non-dict item_content: {repr(item_content)} (type: {type(item_content)})"
                        )
                        continue
            else:
                # Fallback: try to use top-level content fields if present
                try:
                    enhanced_content.append(
                        EnhancedContent(
                            item_id=item_id,
                            content_type=content.get("content_type", "unknown"),
                            source=content.get(
                                "tool", content.get("source", "unknown")
                            ),
                            title=content.get("title", "Untitled"),
                            url=content.get("url", ""),
                            thumbnail=content.get("thumbnail", None),
                            relevance_score=content.get("score", 5.0),
                            context_explanation=content.get(
                                "explanation", "No explanation provided"
                            ),
                            embedded_data=content,
                        )
                    )
                except Exception as e:
                    logger.error(
                        f"[Enhancement API] Failed to parse content at index {idx}: {repr(content)}. Error: {e}"
                    )
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
