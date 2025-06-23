import asyncio
import logging
from typing import Dict, List, Any, Optional
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from app.config import settings

logger = logging.getLogger(__name__)


class MCPClient:
    """Base MCP client wrapper for managing connections and tool calls"""

    def __init__(self, server_params: StdioServerParameters):
        self.server_params = server_params
        self.available_tools: List[Dict[str, Any]] = []
        self._initialized = False

    async def initialize(self) -> bool:
        """Initialize connection and discover available tools"""
        try:
            async with stdio_client(self.server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    tools_response = await session.list_tools()

                    self.available_tools = [
                        {
                            "name": tool.name,
                            "description": tool.description,
                            "input_schema": (
                                tool.inputSchema if hasattr(tool, "inputSchema") else {}
                            ),
                        }
                        for tool in tools_response.tools
                    ]

                    self._initialized = True
                    logger.info(
                        f"✅ MCP client initialized with {len(self.available_tools)} tools"
                    )
                    return True

        except Exception as e:
            logger.error(f"❌ Failed to initialize MCP client: {e}")
            return False

    async def call_tool(
        self, tool_name: str, arguments: Dict[str, Any], max_retries: int = None
    ) -> Optional[Dict[str, Any]]:
        """Call a specific MCP tool with retry logic"""
        if not self._initialized:
            logger.warning("MCP client not initialized, attempting to initialize...")
            if not await self.initialize():
                return None

        max_retries = max_retries or settings.MCP_MAX_RETRIES

        for attempt in range(max_retries):
            try:
                async with stdio_client(self.server_params) as (read, write):
                    async with ClientSession(read, write) as session:
                        await session.initialize()

                        # Call the tool
                        result = await session.call_tool(tool_name, arguments)
                        logger.info(f"✅ Tool {tool_name} executed successfully")
                        return result

            except Exception as e:
                logger.warning(f"❌ Tool {tool_name} attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1 * (attempt + 1))  # Exponential backoff
                else:
                    logger.error(
                        f"❌ Tool {tool_name} failed after {max_retries} attempts"
                    )
                    return None

    def get_tool_info(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific tool"""
        for tool in self.available_tools:
            if tool["name"] == tool_name:
                return tool
        return None

    def list_available_tools(self) -> List[Dict[str, Any]]:
        """Get list of all available tools"""
        return self.available_tools.copy()

    def is_initialized(self) -> bool:
        """Check if the client is initialized"""
        return self._initialized


class YouTubeMCPClient(MCPClient):
    """YouTube-specific MCP client"""

    def __init__(self):
        server_params = StdioServerParameters(
            command="node",
            args=[settings.YOUTUBE_MCP_SERVER_PATH],
            env=(
                {"YOUTUBE_API_KEY": settings.YOUTUBE_API_KEY}
                if settings.YOUTUBE_API_KEY
                else {}
            ),
        )
        super().__init__(server_params)

    async def search_videos(
        self, query: str, max_results: int = 5
    ) -> Optional[Dict[str, Any]]:
        """Search for YouTube videos"""
        return await self.call_tool(
            "videos_searchVideos", {"query": query, "maxResults": max_results}
        )

    async def get_video_info(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific video"""
        return await self.call_tool("videos_getVideo", {"videoId": video_id})

    async def get_transcript(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Get transcript for a video"""
        return await self.call_tool("transcripts_getTranscript", {"videoId": video_id})


# Factory function for creating MCP clients
def create_mcp_client(client_type: str) -> Optional[MCPClient]:
    """Create an MCP client of the specified type"""
    if client_type == "youtube":
        return YouTubeMCPClient()
    # Add other client types here as they're implemented
    else:
        logger.error(f"Unknown MCP client type: {client_type}")
        return None
