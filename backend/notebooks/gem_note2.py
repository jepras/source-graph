# Cell 1: Setup and Imports
import os
from dotenv import load_dotenv
import asyncio

# LangChain components for Google Gemini
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    print("❌ ERROR: GOOGLE_API_KEY not found in .env file.")
else:
    print("✅ Google API Key loaded successfully.")

print("✅ Imports and setup complete.")


# Cell 2: The Refactored InfluenceFinder Class
class InfluenceFinder:
    """A class to test various system prompts for finding cultural influences."""

    def __init__(
        self, model_name: str = "gemini-1.5-pro-latest", temperature: float = 0.5
    ):
        self.model_name = model_name
        self.temperature = temperature

        # Initialize the LangChain Chat Model for Gemini
        # REMOVED the deprecated 'convert_system_message_to_human' parameter
        self.llm = ChatGoogleGenerativeAI(
            model=self.model_name,
            google_api_key=GOOGLE_API_KEY,
            temperature=self.temperature,
            max_output_tokens=2048,
        )

        self.output_format_instructions = """
STRICT OUTPUT FORMAT:
- Your entire response must be a bulleted list.
- Each bullet point must represent a single, specific influence.
- Start each bullet with the name of the influencing work/person/event.
- Follow with a concise explanation of *how* it influenced the item.
- Do not use headers, titles, introductions, or closing summaries.
"""
        print(f"✅ InfluenceFinder initialized with model: {self.model_name}")

    def get_system_prompts(self) -> dict:
        """Returns a library of system prompts to test."""
        # --- Using the "Compensating Prompt" for high quality results ---
        return {
            "forensics_analyst": """You are an elite Cultural Forensics Analyst. Your mission is to deconstruct a creative work and produce a definitive, evidence-based report on its specific influences. You do not state the obvious; you reveal the deep, interconnected web of ideas that led to its creation.

COGNITIVE FRAMEWORK: Follow these steps for your analysis:
1.  DECONSTRUCT THE SUBJECT: First, briefly analyze the provided item. Identify its core components, genre, era, and key themes. (This is for your internal reasoning only, do not show this step in the output).
2.  MULTI-VECTOR SEARCH: Actively search for influences across multiple, distinct vectors: Direct Lineage, Cross-Domain, Technical/Methodological, and Historical/Political.
3.  VALIDATE & SPECIFY: For each potential influence found, you must move from the general to the specific. Do not accept a broad category if a specific work can be named.
4.  SYNTHESIZE THE CONNECTION: For each influence, you MUST explain the *mechanism* of influence. How, specifically, did it shape the final work?

RULES OF ENGAGEMENT:
- RULE 1: SPECIFICITY IS MANDATORY. (e.g., Use "*Neuromancer* by William Gibson" not "cyberpunk literature").
- RULE 2: EVIDENCE OVER HEARSAY. Prioritize confirmed influences.
- RULE 3: EXPLAIN THE "HOW". Do not just state the connection.
- RULE 4: NO INTRO/OUTRO. Your response must begin immediately with the first bullet point.

GOLD-STANDARD OUTPUT EXAMPLE:
*   *Dune* by Frank Herbert (1965): Provided the foundational sci-fi concepts of a desert planet (Tatooine), a mystical mind-control power (The Force), and a direct nod with the "spice mines of Kessel".
"""
        }

    async def run_test(self, system_prompt_text: str, item_query: str) -> str:
        """Runs a single test with a given system prompt and user query."""
        full_system_prompt = (
            system_prompt_text + "\n\n" + self.output_format_instructions
        )

        # --- MODERN PROMPT STRUCTURE ---
        # This is the new, more robust way to build prompts in LangChain
        prompt_template = ChatPromptTemplate.from_messages(
            [
                ("system", full_system_prompt),
                ("human", "Find the influences for this item: {item_query}"),
            ]
        )

        chain = prompt_template | self.llm
        try:
            response = await chain.ainvoke({"item_query": item_query})
            return response.content
        except Exception as e:
            return f"❌ An error occurred during API call: {e}"


# Cell 3: Main Execution Block


async def main():
    """Main function to run the experiment."""

    # --- 1. Define your experiment here ---
    item_to_research = "Kendrick Lamar's DAMN"  # <--- CHANGE THE ITEM HERE

    prompt_to_test = "forensics_analyst"  # This is the high-quality prompt from Cell 2

    # --- 2. Initialize the finder and get the prompt text ---
    finder = InfluenceFinder(model_name="gemini-1.5-pro-latest")
    system_prompts = finder.get_system_prompts()
    prompt_text = system_prompts.get(prompt_to_test)

    if not prompt_text:
        print(f"❌ Error: Prompt key '{prompt_to_test}' not found.")
        return

    # --- 3. Run the test with a DEBUG print statement ---
    print("=" * 100)
    print(
        f"🔬 DEBUG: About to run test for item: '{item_to_research}' with prompt: '{prompt_to_test}'"
    )
    print("=" * 100)

    result = await finder.run_test(prompt_text, item_to_research)

    print(result)


# --- 4. Run the main function ---
# In a Jupyter Notebook, you can 'await' a function at the top level.
await main()
