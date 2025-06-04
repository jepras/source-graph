from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.config import settings


class BaseAgent:
    def __init__(self, model_name: str = None, temperature: float = None):
        self.llm = ChatOpenAI(
            api_key=settings.OPENAI_API_KEY,
            model=model_name or settings.DEFAULT_MODEL,
            temperature=temperature or settings.TEMPERATURE,
            max_tokens=settings.MAX_TOKENS,
        )

    def create_prompt(
        self, system_message: str, human_message: str
    ) -> ChatPromptTemplate:
        """Create a chat prompt template"""
        return ChatPromptTemplate.from_messages(
            [("system", system_message), ("human", human_message)]
        )

    async def invoke(self, prompt: ChatPromptTemplate, input_data: dict) -> str:
        """Invoke the LLM with the given prompt and data"""
        chain = prompt | self.llm
        response = await chain.ainvoke(input_data)
        return response.content
