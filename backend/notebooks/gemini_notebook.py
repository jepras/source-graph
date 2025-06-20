# Cell 1: Setup and Imports
import os
from dotenv import load_dotenv
import asyncio

# LangChain components for Google Gemini
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
# Check if the API key is available in the environment
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    print("❌ ERROR: GOOGLE_API_KEY not found in .env file.")
    print("Please create a .env file and add your key: GOOGLE_API_KEY='your_key_here'")
else:
    print("✅ Google API Key loaded successfully.")

print("✅ Imports and setup complete.")


# Cell 2: The InfluenceFinder Class
class InfluenceFinder:
    """A class to test various system prompts for finding cultural influences."""

    def __init__(
        self, model_name: str = "gemini-1.5-pro-latest", temperature: float = 0.5
    ):
        """
        Initializes the InfluenceFinder with a specific Gemini model.
        Note: 'gemini-1.5-pro-latest' is the recommended model for this task.
              'gemini-1.5-flash-latest' is a faster, more cost-effective alternative.
        """
        if not GOOGLE_API_KEY:
            raise ValueError("Google API Key is not set. Please check your .env file.")

        self.model_name = model_name
        self.temperature = temperature

        # Initialize the LangChain Chat Model for Gemini
        self.llm = ChatGoogleGenerativeAI(
            model=self.model_name,
            google_api_key=GOOGLE_API_KEY,
            temperature=self.temperature,
            max_output_tokens=2048,
            convert_system_message_to_human=True,  # Important for some Gemini models
        )

        # Define a consistent output format to append to every system prompt
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
        """Returns a library of system prompts to test, each with a distinct persona."""
        return {
            "academic_historian": """You are a meticulous cultural historian. Your expertise is in tracing creative lineage with academic rigor. You must cite specific works, people, and movements, prioritizing confirmed influences over popular theories. Your tone is formal and informative.""",
            "new": """You are an elite Cultural Forensics Analyst. Your mission is to deconstruct a creative work and produce a definitive, evidence-based report on its specific influences. You do not state the obvious; you reveal the deep, interconnected web of ideas that led to its creation.

**COGNITIVE FRAMEWORK: Follow these steps for your analysis:**

1.  **DECONSTRUCT THE SUBJECT:** First, briefly analyze the provided item. Identify its core components, genre, era, and key themes. (This is for your internal reasoning only, do not show this step in the output).

2.  **MULTI-VECTOR SEARCH:** Actively search for influences across multiple, distinct vectors:
    *   **Direct Lineage:** Works in the same medium that came before (e.g., a film influenced by an older film).
    *   **Cross-Domain:** Influences from entirely different fields (e.g., architecture influencing a video game, philosophy influencing a novel).
    *   **Technical/Methodological:** Specific techniques or technologies that enabled or shaped the work (e.g., a new camera technique, a new software).
    *   **Historical/Political:** Real-world events, figures, or social movements that provided the thematic backdrop or allegorical foundation.

3.  **VALIDATE & SPECIFY:** For each potential influence found, you must move from the general to the specific. Do not accept a broad category if a specific work can be named.

4.  **SYNTHESIZE THE CONNECTION:** For each influence, you MUST explain the *mechanism* of influence. How, specifically, did it shape the final work? What element was borrowed, adapted, or subverted?

**RULES OF ENGAGEMENT: Your final report must adhere to these strict rules:**

*   **RULE 1: SPECIFICITY IS MANDATORY.** Do not use generic categories.
    *   WRONG: "Influenced by samurai films."
    *   RIGHT: "*The Hidden Fortress* by Akira Kurosawa (1958)..."
    *   WRONG: "Influenced by cyberpunk literature."
    *   RIGHT: "*Neuromancer* by William Gibson (1984)..."

*   **RULE 2: EVIDENCE OVER HEARSAY.** Prioritize influences confirmed by the creator in interviews, "making-of" documentaries, or those widely recognized by academic analysis. Note if an influence is a strong, well-supported theory vs. a confirmed fact.

*   **RULE 3: EXPLAIN THE "HOW".** Do not just state the connection. Your primary value is explaining *how* the influence manifested.
    *   WEAK: "Influenced by *The Dam Busters*."
    *   STRONG: "*The Dam Busters* (1955): Provided the direct shot-for-shot template for the Death Star trench run, including similar pilot dialogue and tactical objectives."

*   **RULE 4: NO INTRO/OUTRO.** Your response must begin immediately with the first bullet point and end with the last. Do not include headers, introductory sentences, or concluding summaries.

Now, apply this entire framework to the user's query.""",
            "cultural_detective": """You are a cultural detective. Your mission is to uncover not just the obvious influences, but the surprising, hidden connections that most people miss. Look for cross-domain inspirations (e.g., architecture influencing music) and provide the 'aha!' moments of discovery.""",
            "narrative_storyteller": """You are a master storyteller. Instead of just listing facts, you weave a compelling narrative about how different creative threads came together to form the final work. Make the connections feel alive and explain the *'why'* behind each influence.""",
            "direct_and_simple": """You are an AI assistant. Your task is to identify and list the primary influences for the given item. Be clear, concise, and accurate.""",
            "cross_domain_synthesizer": """You are an expert in synthesis, specializing in how ideas cross-pollinate between different fields. For the given item, identify influences from technology, philosophy, history, and other art forms, in addition to its own medium. Explain the mechanism of the influence.""",
            "enthusiast_explainer": """You're a super-passionate fan and pop-culture expert talking to a friend. Your tone is energetic and full of fascinating trivia. You love pointing out the 'coolest' and most interesting connections that shaped the work, making it fun and accessible.""",
        }

    async def run_test(self, system_prompt_text: str, item_query: str) -> str:
        """Runs a single test with a given system prompt and user query."""
        # Combine the persona prompt with the strict formatting instructions
        full_system_prompt = (
            system_prompt_text + "\n\n" + self.output_format_instructions
        )

        # Create the prompt template
        prompt_template = ChatPromptTemplate.from_messages(
            [
                SystemMessage(content=full_system_prompt),
                HumanMessage(content="Find the influences for this item: {item_query}"),
            ]
        )

        # Create the chain and invoke it
        chain = prompt_template | self.llm
        try:
            response = await chain.ainvoke({"item_query": item_query})
            return response.content
        except Exception as e:
            return f"❌ An error occurred during API call: {e}"


# Cell 3: The Comparison Runner
async def compare_influences(
    finder: InfluenceFinder, item_to_research: str, prompt_keys: list = None
):
    """
    Runs a comparison for an item across multiple system prompts.

    Args:
        finder: An instance of the InfluenceFinder class.
        item_to_research: The topic you want to find influences for (e.g., "Star Wars").
        prompt_keys: A list of keys for the prompts you want to test.
                     If None, all prompts will be tested.
    """
    all_prompts = finder.get_system_prompts()

    if prompt_keys is None:
        prompt_keys = list(all_prompts.keys())  # Test all if none are specified

    print(f"🔬 Testing {len(prompt_keys)} prompts for: '{item_to_research}'")
    print("=" * 100)

    for key in prompt_keys:
        if key not in all_prompts:
            print(f"⚠️ Prompt key '{key}' not found. Skipping.")
            continue

        print(f"\n>>>>> PROMPT PERSONA: {key.upper()} <<<<<\n")

        # Get the result from the finder
        result = await finder.run_test(all_prompts[key], item_to_research)

        print(result)
        print("\n" + "-" * 100)


# Cell 4: Run the Experiment!

# --- 1. Choose your model and create the finder instance ---
# Use 'gemini-1.5-pro-latest' for quality or 'gemini-1.5-flash-latest' for speed
finder = InfluenceFinder(model_name="gemini-1.5-pro-latest")


# --- 2. Define what you want to research ---
ITEM_TO_RESEARCH = "Michael Jackson's Thriller"


# --- 3. Choose which prompts you want to compare ---
# You can test a few, or test them all by setting this to None
PROMPTS_TO_TEST = [
    "new",
    "cultural_detective",
]


# --- 4. Run the comparison ---
# The 'await' command works at the top level in modern Jupyter notebooks
await compare_influences(finder, ITEM_TO_RESEARCH, PROMPTS_TO_TEST)
