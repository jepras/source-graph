from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import ClassVar, Dict, Any
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # AI Services
    OPENAI_API_KEY: str
    ANTHROPIC_API_KEY: str | None = None  # Make Anthropic optional for now
    GOOGLE_API_KEY: str | None = None  # Add this line
    PERPLEXITY_API_KEY: str | None = None

    # Database
    NEO4J_URI: str
    NEO4J_USER: str
    NEO4J_PASSWORD: str
    # REDIS_URL: str  # Commented out - will add later

    # External APIs
    SPOTIFY_CLIENT_ID: str
    SPOTIFY_CLIENT_SECRET: str
    YOUTUBE_API_KEY: str | None = None  # Make Youtube optional for now

    # Backend specific settings
    BACKEND_PORT: int = 8000  # Default port

    # LLM settings
    DEFAULT_MODEL: str = "gemini-2.5-flash"  # Changed to Gemini 2.5 Flash as default
    MAX_TOKENS: int = 8000
    TEMPERATURE: float = 0.7

    # Model configuration constants
    AVAILABLE_MODELS: ClassVar[Dict[str, Dict[str, Any]]] = {
        "perplexity": {
            "provider": "perplexity",
            "model_name": "llama-3.1-sonar-large-128k-online",
            "display_name": "Perplexity Sonar Large",
            "description": "Real-time web search capability",
        },
        "perplexity-sonar-reasoning": {
            "provider": "perplexity",
            "model_name": "llama-3.1-sonar-large-128k-online",
            "display_name": "Perplexity Sonar Reasoning",
            "description": "Enhanced reasoning with web search",
        },
        "gemini-2.5-flash": {
            "provider": "google",
            "model_name": "gemini-2.5-flash",
            "display_name": "Gemini 2.5 Flash",
            "description": "Fast and efficient Gemini model",
        },
        "gemini-2.5-pro": {
            "provider": "google",
            "model_name": "gemini-2.5-pro",
            "display_name": "Gemini 2.5 Pro",
            "description": "Latest Gemini Pro model with enhanced capabilities",
        },
        "openai": {
            "provider": "openai",
            "model_name": "gpt-4o",
            "display_name": "GPT-4o",
            "description": "Reliable performance",
        },
    }

    # Fallback configuration
    FALLBACK_MODEL: str = "gemini-2.5-pro"  # Fallback to Gemini 2.5 Pro

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
