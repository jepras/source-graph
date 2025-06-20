from pydantic_settings import BaseSettings, SettingsConfigDict
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
    DEFAULT_MODEL: str = "gpt-4o-mini"
    MAX_TOKENS: int = 8000
    TEMPERATURE: float = 0.7

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
