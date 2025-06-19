Component Structure
📁 src/components/canvas/
├── CanvasTab.tsx           # Main container with chat + document
├── DocumentRenderer.tsx    # Renders research document
├── SectionComponent.tsx    # Individual influence sections with hover actions
└── ChatInput.tsx          # Chat interface with save button

📁 src/contexts/
└── CanvasContext.tsx      # State management for Canvas documents

📁 src/hooks/
└── useCanvas.ts           # Canvas operations (research, chat, refinement)

📁 src/types/
└── canvas.ts              # TypeScript interfaces for Canvas system
State Management (CanvasContext)
typescriptinterface CanvasState {
  currentDocument: CanvasDocument | null;  // Active research document
  loading: boolean;                        // Global loading state
  chatHistory: ChatMessage[];             // Conversation history
  sectionLoadingStates: Record<string, boolean>; // Per-section loading
  error: string | null;                    // Error display
}
Data Flow

User Input → CanvasTab → useCanvasOperations
API Calls → Canvas Backend → AI Agent
Response → CanvasContext → DocumentRenderer → SectionComponents
User Actions (refine/delete) → SectionComponent → useCanvasOperations

Backend Architecture
File Structure
📁 backend/app/
├── 📁 models/
│   └── canvas.py              # Canvas data models (CanvasDocument, DocumentSection)
├── 📁 api/routes/
│   └── canvas.py              # Canvas API endpoints
└── 📁 services/ai_agents/
    └── canvas_agent.py        # Canvas AI agent with divided prompts
API Endpoints
pythonPOST /api/canvas/research     # Initial research generation
POST /api/canvas/chat         # Follow-up questions and content expansion  
POST /api/canvas/refine       # Section-specific refinement
AI Agent Architecture
Prompt Division Strategy:
python# 1. AI Guidance - What we want the AI to achieve
CANVAS_AI_GUIDANCE = """You are an expert at discovering fascinating influences..."""

# 2. Output Structure - Exact JSON format required  
CANVAS_OUTPUT_FORMAT = """Return ONLY valid JSON in this exact format: {...}"""

# 3. Critical Rules - Non-negotiable requirements
CANVAS_CRITICAL_RULES = """CRITICAL REQUIREMENTS: Years must be integers..."""
Data Models
Core Entities
typescriptinterface CanvasDocument {
  id: string;
  item_name: string;
  item_type?: string;
  item_year?: number;           // Main item year
  creator?: string;
  sections: DocumentSection[];  // Intro + influence sections
  created_at: Date;
}

interface DocumentSection {
  id: string;
  type: 'intro' | 'influence-item';  // Section type
  content: string;                   // Human-readable paragraph
  influence_data?: {                 // Structured influence data
    name: string;                    // Influence name (becomes graph node)
    creator_name?: string;
    year?: number;                   // Influence year  
    category: string;                // "Handheld Cinematography"
    scope: 'macro' | 'micro' | 'nano';
    confidence: number;              // 0.6-0.9
    explanation: string;
    clusters?: string[];             // ["Visual Foundation"]
  };
  selectedForGraph: boolean;         // User selection for graph saving
}
Document Structure Pattern
📄 Introduction paragraph (item overview)
🎯 Influence 1: Name by Creator: Description...
🎯 Influence 2: Name by Creator: Description...  
🎯 Influence 3: Name by Creator: Description...
User Workflows
1. Initial Research Flow
User → "What influenced Shaft (1971)?" 
     → Canvas Agent generates structured document
     → Displays intro + 4-7 influences with metadata
     → User can select influences for graph saving
2. Conversational Expansion Flow
User → "tell me more about musical influences"
     → Canvas Agent finds 1-6 additional influences  
     → Appends new sections to existing document
     → Maintains conversation history
3. Section Refinement Flow
User → Hover on section → + menu → "Refine this section"
     → Text input: "make this more specific"
     → Canvas Agent refines content paragraph
     → Section updates in place
4. Graph Integration Flow
User → Checks influences for graph → Save button
     → Converts to AcceptProposalsRequest format
     → Uses existing conflict resolution system  
     → Integrates with graph via existing API
Technical Implementation Details
Canvas vs Proposals Differences
AspectCanvas ResearchProposals SystemUI StyleDocument-based, conversationalStructured checklistContent FormatFlowing paragraphs with embedded dataOrganized by scope levelsUser InteractionChat-driven expansionForm-based generationAI AgentStorytelling-focused promptsStructured proposal promptsData StorageIn-memory during sessionNone (immediate to graph)
Integration Points

Graph Saving: Canvas reuses acceptProposals API and conflict resolution
AI Infrastructure: Shares base agent and prompt patterns with proposals
Search Integration: Canvas items appear in main search after saving
Context Sharing: Both systems use same ResearchPanel tabs

Key Design Decisions
Prompt Architecture

Divided prompts prevent JSON formatting errors (learned from proposals)
Double-brace escaping {{}} for JSON templates
Strict JSON cleaning with regex patterns for robust parsing

State Management

Separate Canvas context to avoid interference with proposals
Section-level loading states for granular UI feedback
In-memory document storage (no persistence across sessions)

Error Handling

Same error recovery patterns as proposal agent (JSON cleaning, validation)
Graceful degradation when AI fails to generate proper structure
User-visible error states with actionable messages

Loading UX

Different loading indicators for initial vs follow-up research
Auto-scroll to content generation for better user awareness
Non-blocking refinement with per-section loading overlays