# Cell 1: Setup and imports
import sys
import os
import asyncio

# Add the backend to the Python path (go up one level from notebooks folder)
sys.path.append("..")

from app.config import settings
from app.services.ai_agents.base_agent import BaseAgent

from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

print("✅ Imports successful")
print(f"Using model: {settings.DEFAULT_MODEL}")

----

# Cell 2: Prompt tester class
class PromptTester(BaseAgent):
    """Simple prompt tester for system prompt experimentation"""
    
    def __init__(self, provider: str = "openai", model_name: str = None, temperature: float = None):
        self.provider = provider
        self.temperature = temperature or settings.TEMPERATURE
        
        if provider == "openai":
            self.model_name = model_name or "gpt-4o-mini"
            self.llm = ChatOpenAI(
                api_key=settings.OPENAI_API_KEY,
                model=self.model_name,
                temperature=self.temperature,
                max_tokens=settings.MAX_TOKENS,
            )
        elif provider == "google":
            self.model_name = model_name or "gemini-2.0-flash-exp"
            self.llm = ChatGoogleGenerativeAI(
                google_api_key=settings.GOOGLE_API_KEY,
                model=self.model_name,
                temperature=self.temperature,
                max_output_tokens=settings.MAX_TOKENS,
            )
        else:
            raise ValueError(f"Unsupported provider: {provider}")
        
        # Consistent output format instruction
        self.output_format = """
OUTPUT FORMAT:
- Write each influence as a separate bullet point
- No categorical headlines or sections
- Each bullet should include: influence name, year (if known), and brief explanation
- Start each bullet with the specific influence, then explain how it shaped the work
- Keep explanations concise but specific
- Do not include the creators previous works. Only list other influences. 
- Don't include what aided this work to succeed, only include what influenced it to be made in the first place. 
"""
    
    async def test_prompt(self, system_prompt: str, item_query: str) -> str:
        """Test a system prompt with an item query"""
        # Combine system prompt with output format
        full_system_prompt = system_prompt + "\n\n" + self.output_format
        
        prompt_template = self.create_prompt(full_system_prompt, item_query)
        response = await self.invoke(prompt_template, {})
        return response
    
    def get_system_prompts(self) -> dict:
        """Library of system prompts to test"""
        return {
            "own": """You are a cultural studies researcher specializing in influence mapping. 
            You excel in uncovering hidden influences behind creative works with allow you to both find the obvious influences and finding the surprising, lesser-known connection that most people miss. 
            Your writing takes the form of storytelling.
            Your academic background makes you output whether an influence is confirmed by the creator or a theory on the internet. If possible, provide where you found the influence. 
            """,
            "claude": """You are a master influence investigator who combines storytelling flair with detective precision to uncover the specific creative DNA behind any work. Your mission is to weave together documented connections into compelling narratives that reveal how particular works, techniques, and innovations shaped the creation.
Your investigation approach:

Hunt for SPECIFIC influences rather than broad categories: "Neuromancer by William Gibson" not "cyberpunk literature," "John Woo's bullet-time sequences" not "Asian martial arts," "A Tribe Called Quest's jazz sampling" not "hip-hop"
Look for documented connections through creator interviews, behind-the-scenes content, academic analysis, fan communities
Find direct evidence you can point to in the final work - samples, visual homages, quoted techniques
Include sources when possible: "Director stated in interviews...," "Artist confirmed in Rolling Stone...," "Hip-hop forums have long recognized...," "The making-of documentary reveals..."

Storytelling style:

Craft each influence as a mini-narrative showing the creative journey from influence to influenced work
Make connections vivid and traceable, revealing how specific elements transferred
Show the fascinating story of how these particular influences came together

Detective precision:

Focus on traceable, documented influences with "smoking gun" evidence
Look for direct references like Baudrillard's "Simulacra and Simulation" being physically shown in The Matrix
Identify specific techniques, innovations, or creative decisions that can be traced back to particular sources
Name exact works, people, techniques, or innovations rather than settling for general categories

Always prioritize specific over general, weaving these particular influences into compelling stories of creative evolution.""",
            "basic": """You are an expert at discovering cultural influences. Find the key influences that shaped the given item.""",
            
            "conversational": """You're a knowledgeable cultural historian who loves discovering fascinating connections. Tell me about the influences that shaped this item - I'm curious about both the obvious ones and the surprising connections you might know about.""",
            
            "specific_focus": """You are an expert at identifying specific, traceable influences on creative works. Focus on:
- Direct influences the creators acknowledged
- Specific techniques or elements borrowed from other works
- Cross-domain influences (music influencing film, technology influencing art, etc.)
- Documented historical connections""",
            
            "storytelling": """You are a master storyteller who specializes in cultural influence narratives. Weave together the fascinating story of how various influences came together to shape this work. Make the connections vivid and specific.""",
            
            "academic": """You are a cultural studies researcher specializing in influence mapping. Provide a scholarly analysis of the key influences, including primary sources, documented connections, and cross-cultural exchanges that shaped this work.""",
            
            "detective": """You are a cultural detective uncovering the hidden influences behind creative works. Investigate both the obvious influences and dig deeper to find the surprising, lesser-known connections that most people miss.""",
            
            "categories": """You are an expert at discovering influences across different categories. For the given item, identify influences in these areas:
- Stylistic influences (other works in the same medium)
- Technical influences (new methods or technologies)
- Cultural influences (historical events, social movements)
- Cross-media influences (influences from other art forms)
- Personal influences (creator's life experiences, other artists they knew)""",
            
            "current": """You are an expert at discovering fascinating influences across all creative domains - music, film, literature, technology, art, and beyond.

Your task is to find influences that shaped the given item. Focus on specific, interesting influences rather than broad cultural movements.

Guidelines:
- Find influences across macro (foundational), micro (specific techniques), and nano (tiny details) levels
- Include cross-domain influences (how music influenced film, technology influenced art, etc.)
- Focus on specific works, techniques, or innovations rather than general movements
- Include both obvious influences and surprising lesser-known ones
- Explain HOW each influence shaped the final work, not just that it did
- Prefer influences that can be traced to specific years or periods
- Include the creator/source of each influence when possible"""
        }

tester = PromptTester()
print("✅ Prompt tester ready with consistent output formatting")

--

# Cell 2.1: Quick model switching
def switch_model(provider="openai", model_name=None):
    """Quickly switch between models"""
    global tester
    
    model_options = {
        "openai": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
        "google": ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"]
    }
    
    if provider in model_options:
        print(f"Available {provider} models: {model_options[provider]}")
    
    tester = PromptTester(provider=provider, model_name=model_name)
    return tester

# Quick switches
def use_gemini():
    return switch_model("google", "gemini-2.5")

def use_gpt4o():
    return switch_model("openai", "gpt-4o")

def use_gpt4o_mini():
    return switch_model("openai", "gpt-4o-mini")

# Initialize with default
tester = PromptTester()
print("✅ Multi-model prompt tester ready")
print("Quick switches: use_gemini(), use_gpt4o(), use_gpt4o_mini()")

# Cell 5: Side-by-side comparison
async def compare_prompts_side_by_side(query: str, prompt_names: list = None):
    """Compare multiple prompts on the same query side-by-side"""
    
    if prompt_names is None:
        prompt_names = ["basic", "conversational", "specific_focus", "current"]
    
    prompts = tester.get_system_prompts()
    
    print(f"🔍 COMPARING PROMPTS FOR: {query}")
    print("=" * 100)
    
    results = {}
    
    for prompt_name in prompt_names:
        if prompt_name not in prompts:
            print(f"⚠️  Prompt '{prompt_name}' not found, skipping...")
            continue
            
        print(f"\n📋 PROMPT: {prompt_name.upper()}")
        print("-" * 50)
        
        try:
            response = await tester.test_prompt(prompts[prompt_name], query)
            print(response)
            results[prompt_name] = response
        except Exception as e:
            print(f"❌ ERROR: {e}")
            results[prompt_name] = None
        
        print("\n" + "="*100)
    
    return results

# Example usage
results = await compare_prompts_side_by_side("What influenced Kendrick Lamar's DAMN?", ["basic", "own", "claude", "specific_focus", "storytelling", "academic", "detective"])


---

# Cell 6: Test all prompts on one query
async def test_all_prompts(query: str):
    """Test all available prompts on one query"""
    prompts = tester.get_system_prompts()
    prompt_names = list(prompts.keys())
    
    return await compare_prompts_side_by_side(query, prompt_names)

# Example usage
# results = await test_all_prompts("What influenced Thriller by Michael Jackson?")

---

Test a single prompt:
pythonawait test_single("conversational", "What influenced Purple Rain by Prince?")

Compare prompts side-by-side:
python results = await compare_prompts_side_by_side(
    "What influenced Pulp Fiction?", 
    ["basic", "storytelling", "detective"]
)

Test all prompts on one item:
pythonresults = await test_all_prompts("What influenced the iPhone?")

Test your own custom prompts:
pythoncustom = "You are obsessed with finding the weirdest, most unexpected influences. Focus on bizarre connections."
await test_custom_prompt(custom, "What influenced The Matrix (1999)?")