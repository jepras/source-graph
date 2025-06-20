#!/usr/bin/env python3
"""
Debug runner for the backend with comprehensive logging enabled.
Use this to debug issues with detailed log output.
"""

import logging
import sys
import uvicorn
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))


def setup_debug_logging():
    """Configure comprehensive debug logging"""

    # Configure root logger
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("debug.log", mode="w"),
        ],
    )

    # Set specific loggers to DEBUG
    loggers_to_debug = [
        "app.services.ai_agents.two_agent_canvas_agent",
        "app.api.routes.canvas",
        "app.services.ai_agents.base_agent",
        "app.services.ai_agents.canvas_agent",
    ]

    for logger_name in loggers_to_debug:
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.DEBUG)

    # Reduce noise from some verbose libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)

    print("Debug logging enabled. Logs will be written to debug.log and stdout.")
    print("Starting server with comprehensive debugging...")


if __name__ == "__main__":
    setup_debug_logging()

    # Start the server
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Disable reload for cleaner debugging
        log_level="debug",
    )
