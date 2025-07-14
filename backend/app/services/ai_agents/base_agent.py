from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_perplexity import ChatPerplexity
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.callbacks import BaseCallbackHandler
from app.config import settings
import logging
import json

logger = logging.getLogger(__name__)


class StreamingCallbackHandler(BaseCallbackHandler):
    """Callback handler for streaming LLM responses"""

    def __init__(self, stream_callback=None):
        self.stream_callback = stream_callback
        self.current_chunk = ""

    def on_llm_start(self, serialized, prompts, **kwargs):
        """Called when LLM starts"""
        if self.stream_callback:
            self.stream_callback(
                {"type": "llm_start", "message": "AI agent starting analysis..."}
            )

    def on_llm_new_token(self, token, **kwargs):
        """Called for each new token"""
        if self.stream_callback:
            self.current_chunk += token
            # Send chunk every few tokens to avoid too many small updates
            if len(self.current_chunk) >= 10 or token.endswith((".", "!", "?", "\n")):
                self.stream_callback({"type": "llm_token", "chunk": self.current_chunk})
                self.current_chunk = ""

    def on_llm_end(self, response, **kwargs):
        """Called when LLM finishes"""
        # Send any remaining chunk
        if self.current_chunk and self.stream_callback:
            self.stream_callback(
                {"type": "llm_token", "chunk": self.current_chunk, "token": ""}
            )

        if self.stream_callback:
            self.stream_callback({"type": "llm_end", "message": "Analysis complete"})


class BaseAgent:
    def __init__(self, model_name: str = None, temperature: float = None):
        self.model_name = model_name or settings.DEFAULT_MODEL
        self.temperature = temperature or settings.TEMPERATURE
        self.llm = self._initialize_llm(self.model_name)
        self.active_model = self.model_name

    def _initialize_llm(self, model_key: str):
        """Initialize LLM based on model key with fallback logic"""
        try:
            model_config = settings.AVAILABLE_MODELS.get(model_key)
            if not model_config:
                logger.warning(
                    f"Unknown model key: {model_key}, falling back to default"
                )
                model_config = settings.AVAILABLE_MODELS.get(settings.DEFAULT_MODEL)

            provider = model_config["provider"]
            model_name = model_config["model_name"]

            if provider == "perplexity":
                if not settings.PERPLEXITY_API_KEY:
                    raise ValueError("Perplexity API key not configured")
                return ChatPerplexity(
                    api_key=settings.PERPLEXITY_API_KEY,
                    model=model_name,
                    temperature=self.temperature,
                    max_tokens=settings.MAX_TOKENS,
                )
            elif provider == "google":
                if not settings.GOOGLE_API_KEY:
                    raise ValueError("Google API key not configured")
                return ChatGoogleGenerativeAI(
                    google_api_key=settings.GOOGLE_API_KEY,
                    model=model_name,
                    temperature=self.temperature,
                    max_tokens=settings.MAX_TOKENS,
                )
            elif provider == "openai":
                if not settings.OPENAI_API_KEY:
                    raise ValueError("OpenAI API key not configured")
                return ChatOpenAI(
                    api_key=settings.OPENAI_API_KEY,
                    model=model_name,
                    temperature=self.temperature,
                    max_tokens=settings.MAX_TOKENS,
                )
            else:
                raise ValueError(f"Unknown provider: {provider}")

        except Exception as e:
            logger.error(f"Failed to initialize model {model_key}: {e}")
            # Try fallback model
            if model_key != settings.FALLBACK_MODEL:
                logger.info(f"Falling back to {settings.FALLBACK_MODEL}")
                return self._initialize_llm(settings.FALLBACK_MODEL)
            else:
                raise e

    def set_model(self, model_key: str):
        """Change the active model"""
        try:
            self.llm = self._initialize_llm(model_key)
            self.model_name = model_key
            self.active_model = model_key
            logger.info(f"Successfully switched to model: {model_key}")
        except Exception as e:
            logger.error(f"Failed to switch to model {model_key}: {e}")
            # Try fallback
            if model_key != settings.FALLBACK_MODEL:
                logger.info(f"Falling back to {settings.FALLBACK_MODEL}")
                self.set_model(settings.FALLBACK_MODEL)
            else:
                raise e

    def create_prompt(
        self, system_message: str, human_message: str
    ) -> ChatPromptTemplate:
        """Create a chat prompt template"""
        return ChatPromptTemplate.from_messages(
            [("system", system_message), ("human", human_message)]
        )

    async def invoke(self, prompt: ChatPromptTemplate, input_data: dict) -> str:
        """Invoke the LLM with the given prompt and data"""
        try:
            chain = prompt | self.llm
            response = await chain.ainvoke(input_data)
            return response.content
        except Exception as e:
            logger.error(f"Error invoking {self.active_model}: {e}")
            # Try fallback if not already using fallback
            if self.active_model != settings.FALLBACK_MODEL:
                logger.info(f"Falling back to {settings.FALLBACK_MODEL}")
                self.set_model(settings.FALLBACK_MODEL)
                chain = prompt | self.llm
                response = await chain.ainvoke(input_data)
                return response.content
            else:
                raise e

    async def stream_invoke(
        self, prompt: ChatPromptTemplate, input_data: dict, stream_callback=None
    ):
        """Stream invoke the LLM with the given prompt and data"""
        try:
            # Create streaming callback handler
            callbacks = (
                [StreamingCallbackHandler(stream_callback)] if stream_callback else []
            )

            # Create chain with callbacks
            chain = prompt | self.llm

            # Use astream for streaming - only yield content, let callback handle events
            async for chunk in chain.astream(
                input_data, config={"callbacks": callbacks}
            ):
                content = chunk.content if hasattr(chunk, "content") else str(chunk)
                yield content

        except Exception as e:
            logger.error(f"Error streaming invoke {self.active_model}: {e}")
            if stream_callback:
                stream_callback(
                    {"type": "error", "message": f"Streaming error: {str(e)}"}
                )

            # Try fallback if not already using fallback
            if self.active_model != settings.FALLBACK_MODEL:
                logger.info(f"Falling back to {settings.FALLBACK_MODEL}")
                self.set_model(settings.FALLBACK_MODEL)
                async for chunk in self.stream_invoke(
                    prompt, input_data, stream_callback
                ):
                    yield chunk
            else:
                raise e

    def get_active_model_info(self):
        """Get information about the currently active model"""
        model_config = settings.AVAILABLE_MODELS.get(self.active_model, {})
        return {
            "model_key": self.active_model,
            "display_name": model_config.get("display_name", self.active_model),
            "provider": model_config.get("provider", "unknown"),
            "description": model_config.get("description", ""),
        }
