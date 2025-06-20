# Cell 1: Setup and Imports (No Changes)
import os
import pandas as pd
from dotenv import load_dotenv
import asyncio
from IPython.display import display, HTML
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

for provider in ["Google", "OpenAI"]:
    if not os.getenv(f"{provider.upper()}_API_KEY"):
        print(f"⚠️ Warning: {provider.upper()}_API_KEY not found in .env file.")
    else:
        print(f"✅ {provider} API Key loaded.")

print("\n✅ Multi-provider setup complete with pandas.")


# Cell 2: InfluenceFinder with Multiple Prompts
class InfluenceFinder:
    """A model-agnostic class to test a dictionary of prompts."""

    def __init__(self):
        """Initializes the finder and loads the prompt library."""
        self.prompts = self._get_all_prompts()
        self.output_format_instructions = """
STRICT OUTPUT FORMAT:
- Your entire response must be a bulleted list.
- Each bullet point must represent a single, specific influence.
- Start each bullet with the name of the influencing work/person/event.
- Follow with a concise explanation of *how* it influenced the item.
- Do not use headers, titles, introductions, or closing summaries.
"""
        print(f"✅ InfluenceFinder ready with {len(self.prompts)} prompts.")

    def _get_all_prompts(self) -> dict:
        """Returns a library of system prompts to test, each with a distinct persona."""
        return {
            "forensics_analyst": """You are an elite Cultural Forensics Analyst. Your mission is to deconstruct a creative work and produce a definitive, evidence-based report on its specific influences. You do not state the obvious; you reveal the deep, interconnected web of ideas that led to its creation.
- RULE 1: SPECIFICITY IS MANDATORY. (e.g., Use "*Neuromancer* by William Gibson" not "cyberpunk literature").
- RULE 2: EVIDENCE OVER HEARSAY. Prioritize confirmed influences.
- RULE 3: EXPLAIN THE "HOW". Do not just state the connection.
""",
            "direct_and_simple": """You are an AI assistant. Your task is to identify and list the primary influences for the given item. Be clear, concise, and accurate.""",
            "enthusiast_explainer": """You're a super-passionate fan and pop-culture expert talking to a friend. Your tone is energetic and full of fascinating trivia. You love pointing out the 'coolest' and most interesting connections that shaped the work, making it fun and accessible.""",
        }

    async def run_test(self, llm, system_prompt_text: str, item_query: str) -> str:
        """Runs a single test using a provided LLM instance."""
        full_system_prompt = (
            system_prompt_text + "\n\n" + self.output_format_instructions
        )

        prompt_template = ChatPromptTemplate.from_messages(
            [
                ("system", full_system_prompt),
                ("human", "Find the influences for this item: {item_query}"),
            ]
        )

        chain = prompt_template | llm
        try:
            response = await chain.ainvoke({"item_query": item_query})
            return response.content
        except Exception as e:
            return f"❌ An error occurred during API call: {e}"


# Cell 3: Main Execution Block with Transposed Table


async def main():
    """Main function to run the matrix comparison and display in a transposed table."""

    # --- 1. DEFINE YOUR EXPERIMENT HERE ---

    item_to_research = "The movie 'Dune: Part Two'"  # <--- CHANGE THE ITEM HERE

    models_to_test = [
        {"provider": "Google", "model_name": "gemini-1.5-pro-latest"},
        {"provider": "OpenAI", "model_name": "gpt-4o"},
    ]

    prompts_to_test = ["forensics_analyst", "enthusiast_explainer"]

    # --- 2. PREPARE THE EXPERIMENT ---
    finder = InfluenceFinder()
    tasks = []
    configs = []

    print("🚀 Preparing task matrix...")
    for model_info in models_to_test:
        for prompt_name in prompts_to_test:
            prompt_text = finder.prompts.get(prompt_name)
            if not prompt_text:
                print(f"⚠️ Skipping: Prompt '{prompt_name}' not found.")
                continue

            provider = model_info["provider"]
            model_name = model_info["model_name"]
            llm = None
            if provider == "Google" and GOOGLE_API_KEY:
                llm = ChatGoogleGenerativeAI(
                    model=model_name, google_api_key=GOOGLE_API_KEY, temperature=0.5
                )
            elif provider == "OpenAI" and OPENAI_API_KEY:
                llm = ChatOpenAI(
                    model=model_name, api_key=OPENAI_API_KEY, temperature=0.5
                )

            if llm:
                task = finder.run_test(llm, prompt_text, item_to_research)
                tasks.append(task)
                configs.append(
                    {
                        "Provider": provider,
                        "Model": model_name,
                        "Prompt Name": prompt_name,
                    }
                )

    # --- 3. EXECUTE ALL TASKS CONCURRENTLY ---
    if not tasks:
        print("No tasks to run. Please check your API keys and prompt names.")
        return

    print(f"🏃 Running {len(tasks)} API calls in parallel... (This may take a moment)")
    results = await asyncio.gather(*tasks)
    print("✅ All API calls complete.")

    # --- 4. FORMAT AND DISPLAY THE TRANSPOSED RESULTS TABLE ---

    # First, create the DataFrame as before
    data = []
    for config, result_text in zip(configs, results):
        row = {
            "Provider": config["Provider"],
            "Model": config["Model"],
            "Prompt Name": config["Prompt Name"],
            "Model Output": result_text,
        }
        data.append(row)
    df = pd.DataFrame(data)

    # --- THIS IS THE KEY CHANGE: TRANSPOSE THE DATAFRAME ---
    df_transposed = df.T

    # Create descriptive column headers from the configs
    column_headers = [
        f"<b>{config['Provider']}</b><br>{config['Model']}<br><i>({config['Prompt Name']})</i>"
        for config in configs
    ]
    df_transposed.columns = column_headers

    # CSS styling for the new transposed layout
    styles = [
        # Style for the row headers (Provider, Model, etc.)
        dict(
            selector="th.row_heading",
            props=[
                ("text-align", "right"),
                ("font-weight", "bold"),
                ("padding-right", "10px"),
            ],
        ),
        # Style for the column headers (the model/prompt combos)
        dict(
            selector="th.col_heading",
            props=[("text-align", "center"), ("vertical-align", "top")],
        ),
        # Style for the data cells
        dict(
            selector="td",
            props=[
                ("text-align", "left"),
                ("vertical-align", "top"),
                ("white-space", "pre-wrap"),  # Crucial for showing newlines
                ("border", "1px solid #ddd"),
                ("padding", "8px"),
            ],
        ),
    ]

    # Apply styles and display the transposed DataFrame
    styled_df = df_transposed.style.set_table_styles(styles)

    # Display the final table with a title
    display(HTML(f"<h3>Influence Analysis for: '{item_to_research}'</h3>"))
    display(styled_df)


# --- RUN THE EXPERIMENT ---
await main()
