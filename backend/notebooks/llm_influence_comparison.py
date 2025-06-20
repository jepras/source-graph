# LLM Influence Quality Comparison
# Run this file block by block (like Jupyter cells)

# =============================================================================
# BLOCK 1: Setup and Imports
# =============================================================================

import os
import asyncio
from dotenv import load_dotenv
from IPython.display import display, Markdown, HTML
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_perplexity import ChatPerplexity
from langchain_core.prompts import ChatPromptTemplate
from datetime import datetime

# Load environment variables
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")

# Check API keys
for provider in ["Google", "OpenAI", "Perplexity"]:
    if not os.getenv(f"{provider.upper()}_API_KEY"):
        print(f"⚠️ Warning: {provider.upper()}_API_KEY not found in .env file.")
    else:
        print(f"✅ {provider} API Key loaded.")

print("\n✅ Multi-provider setup complete.")


# =============================================================================
# BLOCK 2: Define the InfluenceQualityTester Class
# =============================================================================


class InfluenceQualityTester:
    """A class to test and compare influence analysis quality across different LLMs and prompts."""

    def __init__(self):
        """Initialize the tester with prompts and output format."""
        self.prompts = self._get_prompts()
        self.output_format_instructions = """
STRICT OUTPUT FORMAT:
- Your entire response must be a bulleted list.
- Each bullet point must represent a single, specific influence.
- Start each bullet with the name of the influencing work/person/event.
- Follow with a concise explanation of *how* it influenced the item.
- Do not use headers, titles, introductions, or closing summaries.
"""
        print(f"✅ InfluenceQualityTester ready with {len(self.prompts)} prompts.")

    def _get_prompts(self) -> dict:
        """Returns the two prompts to compare: academic_forensic_analyst and academic_forensic_analyst_free."""
        return {
            "academic_forensic_analyst": """You are an Academic Forensic Analyst - a hybrid of rigorous scholarship and cultural detective work. You combine the deep analytical skills of a forensic analyst with the evidence-based approach of an academic researcher. You can write in an engaging, storytelling format while maintaining academic rigor.

- RULE 1: SPECIFICITY IS MANDATORY. (e.g., Use "*Neuromancer* by William Gibson" not "cyberpunk literature").
- RULE 2: CITE YOUR SOURCES. When possible, mention where you found this information (interviews, articles, documentaries, etc.).
- RULE 3: EXPLAIN THE "HOW". Do not just state the connection - describe the specific influence.
- RULE 4: INCLUDE OBSCURE INFLUENCES. After covering well-documented influences, include a few lesser-known, non-obvious connections that you've discovered.
- RULE 5: ENGAGING STORYTELLING. Write in an interesting, narrative format that makes the connections compelling.""",
            "academic_forensic_analyst_free": """You are an Academic Forensic Analyst - a hybrid of rigorous scholarship and cultural detective work. You combine the deep analytical skills of a forensic analyst with the evidence-based approach of an academic researcher. You can write in an engaging, storytelling format while maintaining academic rigor.

- RULE 1: SPECIFICITY IS MANDATORY. (e.g., Use "*Neuromancer* by William Gibson" not "cyberpunk literature").
- RULE 2: CITE YOUR SOURCES. When possible, mention where you found this information (interviews, articles, documentaries, etc.).
- RULE 3: EXPLAIN THE "HOW". Do not just state the connection - describe the specific influence.
- RULE 4: INCLUDE OBSCURE INFLUENCES. After covering well-documented influences, include a few lesser-known, non-obvious connections that you've discovered.
- RULE 5: ENGAGING STORYTELLING. Write in an interesting, narrative format that makes the connections compelling.
- RULE 6: FREE FORMAT. You can use any structure - paragraphs, sections, or creative formatting that best serves your analysis.""",
        }

    async def run_test(
        self, llm, system_prompt_text: str, item_query: str, prompt_name: str = ""
    ) -> str:
        """Runs a single test using a provided LLM instance."""

        # Choose output format based on prompt type
        if prompt_name == "academic_forensic_analyst_free":
            # No strict output format for the free version
            full_system_prompt = system_prompt_text
        else:
            # Use strict bulleted list format for all other prompts
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


# =============================================================================
# BLOCK 3: Define the Display Functions
# =============================================================================


def display_results(item_to_research: str, configs: list, results: list):
    """Display results in a clean markdown matrix format."""

    # Create the matrix structure
    display(
        Markdown(
            f"# Influence Analysis Comparison\n\n**Item:** {item_to_research}\n\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n---"
        )
    )

    # Create a 2x2 matrix with prompts as rows and models as columns
    matrix_data = {}
    for config, result in zip(configs, results):
        prompt = config["prompt"]
        model_key = f"{config['provider']} ({config['model']})"

        if prompt not in matrix_data:
            matrix_data[prompt] = {}
        matrix_data[prompt][model_key] = result

    # Display the matrix
    markdown_content = "## Results Matrix\n\n"
    markdown_content += (
        "| Prompt | Gemini 1.5 Pro | GPT-4o | Perplexity Sonar Large |\n"
    )
    markdown_content += "|--------|----------------|--------|----------------------|\n"

    for prompt_name in ["academic_forensic_analyst"]:
        if prompt_name in matrix_data:
            # Get the display name for the prompt
            prompt_display = "🔍 Academic Forensic Analyst"

            # Get results for each model
            gemini_result = matrix_data[prompt_name].get(
                "Google (gemini-1.5-pro-latest)", "No result"
            )
            gpt4_result = matrix_data[prompt_name].get("OpenAI (gpt-4o)", "No result")
            perplexity_result = matrix_data[prompt_name].get(
                "Perplexity (llama-3.1-sonar-large-128k-online)", "No result"
            )

            # Format results for markdown table (escape newlines and quotes)
            gemini_formatted = gemini_result.replace("\n", "<br>").replace("|", "\\|")
            gpt4_formatted = gpt4_result.replace("\n", "<br>").replace("|", "\\|")
            perplexity_formatted = perplexity_result.replace("\n", "<br>").replace(
                "|", "\\|"
            )

            markdown_content += f"| {prompt_display} | {gemini_formatted} | {gpt4_formatted} | {perplexity_formatted} |\n"

    display(Markdown(markdown_content))

    # Add individual detailed views
    display(Markdown("## Detailed Results\n\n---"))

    for i, (config, result) in enumerate(zip(configs, results), 1):
        if config["prompt"] == "academic_forensic_analyst":
            prompt_display = "🔍 Academic Forensic Analyst"
        elif config["prompt"] == "academic_forensic_analyst_free":
            prompt_display = "🔍 Academic Forensic Analyst (Free Format)"
        model_display = f"{config['provider']} ({config['model']})"

        detailed_markdown = f"### {i}. {prompt_display} + {model_display}\n\n"
        detailed_markdown += f"**Configuration:**\n- Provider: {config['provider']}\n- Model: {config['model']}\n- Prompt: {config['prompt']}\n\n"
        detailed_markdown += f"**Output:**\n\n{result}\n\n---\n"

        display(Markdown(detailed_markdown))


# =============================================================================
# BLOCK 4: Define the Main Comparison Function
# =============================================================================


async def run_comparison(item_to_research: str):
    """Main function to run the comparison and display results."""

    # Define models and prompts
    models_to_test = [
        {"provider": "Google", "model_name": "gemini-1.5-pro-latest"},
        {"provider": "OpenAI", "model_name": "gpt-4o"},
        {"provider": "Perplexity", "model_name": "llama-3.1-sonar-large-128k-online"},
    ]

    prompts_to_test = [
        "academic_forensic_analyst",
    ]

    # Initialize tester
    tester = InfluenceQualityTester()
    tasks = []
    configs = []

    print("🚀 Preparing comparison matrix...")

    # Prepare all tasks
    for model_info in models_to_test:
        for prompt_name in prompts_to_test:
            prompt_text = tester.prompts.get(prompt_name)
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
            elif provider == "Perplexity" and PERPLEXITY_API_KEY:
                llm = ChatPerplexity(
                    model=model_name, api_key=PERPLEXITY_API_KEY, temperature=0.5
                )

            if llm:
                task = tester.run_test(llm, prompt_text, item_to_research, prompt_name)
                tasks.append(task)
                configs.append(
                    {
                        "provider": provider,
                        "model": model_name,
                        "prompt": prompt_name,
                    }
                )

    # Execute all tasks concurrently
    if not tasks:
        print("No tasks to run. Please check your API keys.")
        return

    print(f"🏃 Running {len(tasks)} API calls in parallel... (This may take a moment)")
    results = await asyncio.gather(*tasks)
    print("✅ All API calls complete.")

    # Display results in a clean matrix format
    display_results(item_to_research, configs, results)


# =============================================================================
# BLOCK 5: Configure Your Experiment
# =============================================================================

# Change this to test different items
item_to_research = "Little Simz Lotus album"

print(f"🎯 Ready to analyze: {item_to_research}")


# =============================================================================
# BLOCK 6: Run the Comparison (Async Version)
# =============================================================================


# Option 1: Run as async (for Jupyter/IPython environments)
async def execute_comparison():
    await run_comparison(item_to_research)


# Run this in Jupyter/IPython:
await execute_comparison()


# =============================================================================
# BLOCK 7: Run the Comparison (Sync Version)
# =============================================================================


# Option 2: Run as sync (for regular Python environments)
def run_sync():
    asyncio.run(run_comparison(item_to_research))


# Run this in regular Python:
# run_sync()


# =============================================================================
# BLOCK 8: Two-Agent Structured Extraction System
# =============================================================================


class StructuredInfluenceExtractor:
    """A two-agent system: one generates free-form analysis, another extracts structured data."""

    def __init__(self):
        """Initialize the extractor with the academic forensic analyst prompt."""
        self.academic_forensic_prompt = """You are an Academic Forensic Analyst - a hybrid of rigorous scholarship and cultural detective work. You combine the deep analytical skills of a forensic analyst with the evidence-based approach of an academic researcher. You can write in an engaging, storytelling format while maintaining academic rigor.

- RULE 1: SPECIFICITY IS MANDATORY. (e.g., Use "*Neuromancer* by William Gibson" not "cyberpunk literature").
- RULE 2: CITE YOUR SOURCES. When possible, mention where you found this information (interviews, articles, documentaries, etc.).
- RULE 3: EXPLAIN THE "HOW". Do not just state the connection - describe the specific influence.
- RULE 4: INCLUDE OBSCURE INFLUENCES. After covering well-documented influences, include a few lesser-known, non-obvious connections that you've discovered.
- RULE 5: ENGAGING STORYTELLING. Write in an interesting, narrative format that makes the connections compelling.
- RULE 6: FREE FORMAT. You can use any structure - paragraphs, sections, or creative formatting that best serves your analysis."""

        self.extraction_prompt = """You are a Data Extraction Specialist. Your task is to analyze a detailed influence analysis text and extract structured influence data while preserving the rich storytelling and descriptive elements.

EXTRACTION RULES:
- First, write a brief intro paragraph explaining what the researched item is (similar to the free-form analysis)
- Then extract each influence mentioned in the text
- For each influence, identify: name, year, category, description, and source link (if available). If they don't exist, then figure it out. All years need to be integers.
- Categories can be: Literature, Film, Music, Art, Technology, Philosophy, Science, History, Mythology, Architecture, Fashion, Politics, etc.
- If category is unclear, make your best judgment
- Use the description from the previous agent as much as possible.
- PRESERVE THE STORYTELLING: Keep the rich, descriptive language and narrative flow from the original analysis
- MAINTAIN ESSENCE: Don't just distill - capture the emotional and contextual details that make the influence compelling
- KEEP THE "HOW": Ensure the description explains the specific way the influence shaped the work, not just that it influenced it
- INCLUDE SOURCES: If a source link is mentioned in the text for a specific influence, include it in the structured data

OUTPUT FORMAT:
- Start with an intro paragraph explaining the researched item
- Then list each influence on a new line
- Format: [Name] | [Year] | [Category] | [Description] | [Source Link]
- Use "|" as separator between fields
- Description should be rich and narrative, preserving the original storytelling quality
- Source Link should be the URL if mentioned, or "No source" if not available"""

        print("✅ StructuredInfluenceExtractor ready with two-agent system.")

    async def run_two_agent_extraction(
        self, llm, item_query: str, provider: str = ""
    ) -> dict:
        """Runs the two-agent system: analysis generation + structured extraction."""

        print("🤖 Agent 1: Generating free-form analysis...")

        # Agent 1: Generate free-form analysis
        analysis_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", self.academic_forensic_prompt),
                ("human", "Find the influences for this item: {item_query}"),
            ]
        )

        analysis_chain = analysis_prompt | llm
        try:
            response = await analysis_chain.ainvoke({"item_query": item_query})
            free_form_analysis = response.content
            print("✅ Free-form analysis generated.")
        except Exception as e:
            return {"error": f"❌ Analysis generation failed: {e}"}

        print("🤖 Agent 2: Extracting structured data...")

        # Agent 2: Extract structured data
        extraction_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", self.extraction_prompt),
                (
                    "human",
                    "Extract structured influence data from this analysis:\n\n{analysis_text}",
                ),
            ]
        )

        extraction_chain = extraction_prompt | llm
        try:
            extraction_response = await extraction_chain.ainvoke(
                {"analysis_text": free_form_analysis}
            )
            structured_data = extraction_response.content
            print("✅ Structured data extracted.")
        except Exception as e:
            return {"error": f"❌ Data extraction failed: {e}"}

        return {
            "free_form_analysis": free_form_analysis,
            "structured_data": structured_data,
        }


async def run_two_agent_comparison(item_to_research: str):
    """Run the two-agent system comparison across both models."""

    models_to_test = [
        {"provider": "Google", "model_name": "gemini-1.5-pro-latest"},
        {"provider": "Perplexity", "model_name": "llama-3.1-sonar-large-128k-online"},
    ]

    extractor = StructuredInfluenceExtractor()
    results = {}

    for model_info in models_to_test:
        provider = model_info["provider"]
        model_name = model_info["model_name"]

        print(f"\n🚀 Testing {provider} ({model_name})...")

        llm = None
        if provider == "Google" and GOOGLE_API_KEY:
            llm = ChatGoogleGenerativeAI(
                model=model_name, google_api_key=GOOGLE_API_KEY, temperature=0.5
            )
        elif provider == "Perplexity" and PERPLEXITY_API_KEY:
            llm = ChatPerplexity(
                model=model_name, api_key=PERPLEXITY_API_KEY, temperature=0.5
            )

        if llm:
            result = await extractor.run_two_agent_extraction(
                llm, item_to_research, provider
            )
            results[f"{provider} ({model_name})"] = result
        else:
            results[f"{provider} ({model_name})"] = {"error": "❌ LLM not available"}

    # Display results
    display_two_agent_results(item_to_research, results)


def display_two_agent_results(item_to_research: str, results: dict):
    """Display the two-agent system results in a table format."""

    display(
        Markdown(
            f"# Two-Agent Structured Extraction Results\n\n**Item:** {item_to_research}\n\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n---"
        )
    )

    # Create table headers
    markdown_content = "## Results Matrix\n\n"
    markdown_content += "| Model | 🔍 Free-Form Analysis | 📊 Structured Data |\n"
    markdown_content += "|-------|----------------------|-------------------|\n"

    # Get model names
    model_names = list(results.keys())

    # Create rows for each model
    for model_name in model_names:
        if "error" in results[model_name]:
            markdown_content += f"| {model_name} | ❌ Error | ❌ Error |\n"
        else:
            # Format the free-form analysis (show full length)
            analysis = results[model_name]["free_form_analysis"]
            formatted_analysis = analysis.replace("\n", "<br>").replace("|", "\\|")

            # Format the structured data as markdown (not code blocks)
            structured = results[model_name]["structured_data"]
            formatted_structured = structured.replace("\n", "<br>").replace("|", "\\|")

            markdown_content += (
                f"| {model_name} | {formatted_analysis} | {formatted_structured} |\n"
            )

    display(Markdown(markdown_content))


# Run the two-agent comparison
await run_two_agent_comparison(item_to_research)


# =============================================================================
# BLOCK 9: Test Perplexity Source Metadata Access
# =============================================================================
