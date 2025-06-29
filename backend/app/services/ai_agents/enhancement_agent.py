import json
import logging
import html
from typing import Dict, List, Any, Optional
from langchain.schema import HumanMessage, SystemMessage

from app.services.ai_agents.base_agent import BaseAgent
from app.mcps.mcp_client import create_mcp_client, MCPClient
from app.models.item import Item

logger = logging.getLogger(__name__)


class EnhancementAgent(BaseAgent):
    """AI agent for enhancing items with relevant content using MCP tools"""

    def __init__(self, model_name: str = None, temperature: float = None):
        super().__init__(model_name, temperature)
        self.mcp_clients: Dict[str, MCPClient] = {}
        self._initialize_mcp_clients()

    def _initialize_mcp_clients(self):
        """Initialize available MCP clients"""
        # Initialize YouTube MCP client
        youtube_client = create_mcp_client("youtube")
        if youtube_client:
            self.mcp_clients["youtube"] = youtube_client
            logger.info("✅ YouTube MCP client initialized")

    def _extract_mcp_result(self, mcp_result) -> Dict[str, Any]:
        """Extract data from MCP CallToolResult object"""
        try:
            # Handle different types of MCP results
            if hasattr(mcp_result, "content"):
                # If it has content attribute, extract it
                content = mcp_result.content
                if hasattr(content, "__iter__") and not isinstance(
                    content, (str, bytes)
                ):
                    # Handle list of content items
                    extracted_content = []
                    for item in content:
                        if hasattr(item, "text"):
                            extracted_content.append(item.text)
                        elif hasattr(item, "__dict__"):
                            extracted_content.append(item.__dict__)
                        else:
                            extracted_content.append(str(item))
                    return {"content": extracted_content}
                else:
                    return {"content": str(content)}
            elif hasattr(mcp_result, "__dict__"):
                # Convert object to dict, handling nested objects
                result_dict = {}
                for key, value in mcp_result.__dict__.items():
                    if hasattr(value, "__dict__"):
                        # Handle nested objects
                        result_dict[key] = str(value)
                    elif hasattr(value, "__iter__") and not isinstance(
                        value, (str, bytes, dict)
                    ):
                        # Handle lists/iterables
                        result_dict[key] = [str(item) for item in value]
                    else:
                        result_dict[key] = value
                return result_dict
            else:
                # Try to convert to string and parse as JSON
                return {"raw_result": str(mcp_result)}
        except Exception as e:
            logger.warning(f"Failed to extract MCP result: {e}")
            return {"raw_result": str(mcp_result)}

    async def analyze_item_context(self, item: Item) -> Dict[str, Any]:
        """Analyze item context to determine enhancement strategy"""

        system_prompt = """You are an AI assistant that analyzes items to determine the best enhancement strategy.

For each item, analyze:
1. Item type (song, movie, innovation, etc.)
2. Relevant clusters and themes
3. What kind of content would be most valuable
4. Which MCP tools would be most appropriate

Return ONLY valid JSON:
[{{"item_type": "song|movie|innovation|book|art|etc", "primary_clusters": ["cluster1", "cluster2"], "content_needs": ["video_analysis", "audio_samples", "background_info", "technical_explanation"], "recommended_tools": ["youtube", "spotify", "wikipedia"], "enhancement_strategy": "detailed explanation of approach"}}]"""

        human_prompt = f"""Analyze this item for enhancement:

Item Name: {item.name}
Description: {item.description or 'No description'}
Auto-detected Type: {item.auto_detected_type or 'Unknown'}
Year: {item.year or 'Unknown'}

What type of content would be most valuable for enhancing this item?"""

        try:
            prompt = self.create_prompt(system_prompt, human_prompt)
            response = await self.invoke(prompt, {})

            # Clean up the response and try to parse JSON
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            # Parse JSON response - handle both array and object formats
            if response_text.startswith("["):
                analysis = json.loads(response_text)[
                    0
                ]  # Extract first object from array
            else:
                analysis = json.loads(response_text)

            logger.info(f"Item context analysis: {analysis}")
            return analysis

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse context analysis: {e}")
            logger.error(f"Raw response: {response}")
            return {
                "item_type": item.auto_detected_type or "unknown",
                "primary_clusters": [],
                "content_needs": ["general_info"],
                "recommended_tools": ["youtube"],
                "enhancement_strategy": "Basic enhancement with available tools",
            }

    def select_relevant_tools(self, analysis: Dict[str, Any]) -> List[str]:
        """Select which MCP tools to use based on analysis"""
        recommended_tools = analysis.get("recommended_tools", [])
        available_tools = list(self.mcp_clients.keys())

        # Filter to only available tools
        selected_tools = [tool for tool in recommended_tools if tool in available_tools]

        # Fallback to YouTube if no tools selected
        if not selected_tools and "youtube" in available_tools:
            selected_tools = ["youtube"]

        logger.info(f"Selected tools: {selected_tools}")
        return selected_tools

    async def generate_enhancement_queries(
        self, item: Item, analysis: Dict[str, Any]
    ) -> Dict[str, List[str]]:
        """Generate queries for each selected tool"""

        system_prompt = """You are an AI assistant that generates search queries for content enhancement.

For each tool type, generate 2-3 specific, targeted queries that would find relevant content.

Return ONLY valid JSON:
[{{"youtube": ["query1", "query2", "query3"], "spotify": ["query1", "query2"], "wikipedia": ["query1", "query2"]}}]

Guidelines:
- YouTube: Focus on analysis, breakdowns, explanations, tutorials
- Spotify: Focus on the actual music, samples, remixes
- Wikipedia: Focus on background, history, context
- Be specific and include the item name
- Consider the item type and clusters when generating queries"""

        human_prompt = f"""Generate enhancement queries for this item:

Item: {item.name}
Type: {analysis.get('item_type', 'unknown')}
Clusters: {', '.join(analysis.get('primary_clusters', []))}
Content Needs: {', '.join(analysis.get('content_needs', []))}

Generate specific queries for each tool that would find valuable content."""

        try:
            prompt = self.create_prompt(system_prompt, human_prompt)
            response = await self.invoke(prompt, {})

            # Clean up the response and try to parse JSON
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            # Parse JSON response - handle both array and object formats
            if response_text.startswith("["):
                queries = json.loads(response_text)[
                    0
                ]  # Extract first object from array
            else:
                queries = json.loads(response_text)

            logger.info(f"Generated queries: {queries}")
            return queries

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse queries: {e}")
            logger.error(f"Raw response: {response}")
            # Fallback queries
            return {
                "youtube": [
                    f"{item.name} analysis",
                    f"{item.name} breakdown",
                    f"{item.name} sample",
                ],
                "spotify": [f"{item.name}"],
                "wikipedia": [f"{item.name}"],
            }

    def _extract_youtube_video_data(self, content_str: str) -> List[Dict[str, Any]]:
        """Extract structured video data from YouTube search results"""
        try:
            # Parse the JSON string from YouTube results
            videos_data = json.loads(content_str)
            extracted_videos = []

            for video in videos_data:
                if video.get("kind") == "youtube#searchResult":
                    snippet = video.get("snippet", {})
                    video_id = video.get("id", {}).get("videoId")

                    if video_id and snippet:
                        # Decode HTML entities in title and description
                        title = html.unescape(snippet.get("title", "Untitled"))
                        description = html.unescape(snippet.get("description", ""))
                        channel_title = html.unescape(
                            snippet.get("channelTitle", "Unknown Creator")
                        )

                        extracted_videos.append(
                            {
                                "video_id": video_id,
                                "title": title,
                                "description": description,
                                "channel_title": channel_title,
                                "published_at": snippet.get("publishedAt", ""),
                                "thumbnail_url": snippet.get("thumbnails", {})
                                .get("medium", {})
                                .get("url", ""),
                                "url": f"https://www.youtube.com/watch?v={video_id}",
                            }
                        )

            return extracted_videos
        except Exception as e:
            logger.error(f"Failed to extract YouTube video data: {e}")
            return []

    async def execute_tool_queries(
        self, tool_name: str, queries: List[str]
    ) -> List[Dict[str, Any]]:
        """Execute queries for a specific tool and return results"""
        if tool_name not in self.mcp_clients:
            logger.warning(f"Tool {tool_name} not available")
            return []

        client = self.mcp_clients[tool_name]
        results = []

        for query in queries[:3]:  # Limit to 3 queries per tool
            try:
                if tool_name == "youtube":
                    result = await client.search_videos(query, max_results=2)
                    if result:
                        # Extract the actual result data
                        extracted_result = self._extract_mcp_result(result)

                        # Extract structured video data
                        if (
                            "content" in extracted_result
                            and extracted_result["content"]
                        ):
                            video_data = self._extract_youtube_video_data(
                                extracted_result["content"][0]
                            )

                            for video in video_data:
                                results.append(
                                    {
                                        "tool": tool_name,
                                        "query": query,
                                        "result": extracted_result,
                                        "video_data": video,  # Add structured video data
                                    }
                                )
                        else:
                            # Fallback if no structured data
                            results.append(
                                {
                                    "tool": tool_name,
                                    "query": query,
                                    "result": extracted_result,
                                }
                            )
                # Add other tool types here as they're implemented

            except Exception as e:
                logger.error(f"Failed to execute {tool_name} query '{query}': {e}")

        return results

    async def score_and_filter_content(
        self,
        results: List[Dict[str, Any]],
        item: Item,
        analysis: Dict[str, Any],
        max_content_pieces: int = 4,
    ) -> List[Dict[str, Any]]:
        """Score and filter content based on relevance and quality"""

        if not results:
            logger.info("No results to score")
            return []

        system_prompt = f"""You are an AI assistant that scores content relevance for item enhancement.

For each piece of content, score it from 0-10 based on:
- Relevance to the item (0-4 points)
- Quality and usefulness (0-3 points)
- Uniqueness and value (0-3 points)

Return ONLY valid JSON:
[{{{{\"scored_content\": [{{{{\"original_result\": {{{{...}}}}, \"score\": 8, \"explanation\": \"Why this content is relevant/useful\", \"content_type\": \"video|audio|text|image\"}}}}]}}}}]

Only include content with scores >= 6. Limit to {max_content_pieces} pieces total."""

        # Create a simplified version of results to avoid template variable issues
        simplified_results = []
        for result in results:
            simplified_result = {
                "source": result.get("tool", "unknown"),
                "query": result.get("query", ""),
                "video_count": len(result.get("result", {}).get("content", [])),
            }
            simplified_results.append(simplified_result)

        human_prompt = f"""Score these content pieces for enhancing this item:

Item: {{item_name}}
Type: {{item_type}}
Clusters: {{clusters}}

Content to score:
{{content_data}}

Score each piece and explain why it's valuable for enhancing this item. Return exactly {max_content_pieces} pieces."""

        try:
            prompt = self.create_prompt(system_prompt, human_prompt)

            response = await self.invoke(
                prompt,
                {
                    "item_name": item.name,
                    "item_type": analysis.get("item_type", "unknown"),
                    "clusters": ", ".join(analysis.get("primary_clusters", [])),
                    "content_data": json.dumps(simplified_results, indent=2),
                },
            )

            # Clean up the response and try to parse JSON
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            # Parse JSON response - handle both array and object formats
            if response_text.startswith("["):
                scored = json.loads(response_text)[0]  # Extract first object from array
            else:
                scored = json.loads(response_text)

            filtered_content = scored.get("scored_content", [])

            # Sort by score and limit to max_content_pieces
            filtered_content.sort(key=lambda x: x.get("score", 0), reverse=True)
            filtered_content = filtered_content[:max_content_pieces]

            # Map the scored content back to the original results to preserve video_data
            final_filtered_content = []
            for scored_item in filtered_content:
                # Find the corresponding original result
                original_result = scored_item.get("original_result", {})
                source = original_result.get("source")
                query = original_result.get("query")

                # Find matching result from original results
                matching_result = None
                for result in results:
                    if result.get("tool") == source and result.get("query") == query:
                        matching_result = result
                        break

                if matching_result:
                    final_filtered_content.append(
                        {
                            "original_result": matching_result,  # Use full result with video_data
                            "score": scored_item.get("score", 0),
                            "explanation": scored_item.get("explanation", ""),
                            "content_type": scored_item.get("content_type", "unknown"),
                        }
                    )
                else:
                    # Fallback if no match found
                    final_filtered_content.append(scored_item)

            logger.info(f"Filtered to {len(final_filtered_content)} content pieces")
            return final_filtered_content

        except json.JSONDecodeError as e:
            logger.error(f"Failed to score content: {e}")
            logger.error(f"Raw response: {response}")
            # Fallback: return first max_content_pieces results with basic scoring
            fallback_content = []
            for i, result in enumerate(results[:max_content_pieces]):
                fallback_content.append(
                    {
                        "original_result": result,
                        "score": 7.0,
                        "explanation": f"Fallback content from {result.get('tool', 'unknown')}",
                        "content_type": (
                            "video" if result.get("tool") == "youtube" else "text"
                        ),
                    }
                )
            return fallback_content

    async def enhance_item(
        self, item: Item, max_content_pieces: int = 4
    ) -> Dict[str, Any]:
        """Main enhancement pipeline"""
        logger.info(
            f"Starting enhancement for item: {item.name} with max {max_content_pieces} content pieces"
        )

        try:
            # Step 1: Analyze item context
            analysis = await self.analyze_item_context(item)

            # Step 2: Select relevant tools
            selected_tools = self.select_relevant_tools(analysis)

            # Step 3: Generate queries
            queries = await self.generate_enhancement_queries(item, analysis)

            # Step 4: Execute queries
            all_results = []
            for tool_name in selected_tools:
                if tool_name in queries:
                    tool_results = await self.execute_tool_queries(
                        tool_name, queries[tool_name]
                    )
                    # Ensure every result has a 'tool' field
                    for r in tool_results:
                        if "tool" not in r or not r["tool"]:
                            logger.warning(f"Result missing 'tool' field: {r}")
                            r["tool"] = tool_name
                    all_results.extend(tool_results)

            # Step 5: Score and filter content
            enhanced_content = await self.score_and_filter_content(
                all_results, item, analysis, max_content_pieces
            )

            # Step 6: Add structured data to enhanced content
            final_enhanced_content = []
            for content_item in enhanced_content:
                original_result = content_item.get("original_result", {})
                video_data = original_result.get("video_data")
                # Always set source from original_result or fallback
                source = (
                    original_result.get("tool") or content_item.get("tool") or "unknown"
                )

                if video_data:
                    # Add structured video data
                    final_enhanced_content.append(
                        {
                            **content_item,
                            "title": video_data.get("title", "Untitled"),
                            "creator": video_data.get(
                                "channel_title", "Unknown Creator"
                            ),
                            "url": video_data.get("url", ""),
                            "thumbnail": video_data.get("thumbnail_url", ""),
                            "description": video_data.get("description", ""),
                            "source": source,
                        }
                    )
                else:
                    # Fallback for non-video content
                    final_enhanced_content.append(
                        {
                            **content_item,
                            "title": "Untitled",
                            "creator": "Unknown Creator",
                            "url": "",
                            "thumbnail": "",
                            "description": "",
                            "source": source,
                        }
                    )

            return {
                "item_id": item.id,
                "analysis": analysis,
                "enhanced_content": final_enhanced_content,
                "enhancement_summary": f"Found {len(final_enhanced_content)} relevant content pieces using {len(selected_tools)} tools",
                "tools_used": selected_tools,  # Only show actually used tools
            }

        except Exception as e:
            logger.error(f"Enhancement failed for item {item.name}: {e}")
            return {"item_id": item.id, "error": str(e), "enhanced_content": []}
