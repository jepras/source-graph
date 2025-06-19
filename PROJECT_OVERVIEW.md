# 🕸️ Influence Graph - Project Overview

Latest updated on 11/6/2025 - 19:30

### Current tree structure
influence-graph/
├── 📁 backend/
│   ├── 📁 app/
│   │   ├── 📁 api/
│   │   │   └── 📁 routes/
│   │   │       ├── ai.py
│   │   │       ├── items.py
│   │   │       └── influences.py
│   │   ├── 📁 core/
│   │   │   └── 📁 database/
│   │   │       ├── neo4j.py
│   │   │       └── schema.py
│   │   ├── 📁 mcps/ (empty)
│   │   ├── 📁 models/
│   │   │   ├── item.py
│   │   │   ├── proposal.py
│   │   │   └── structured.py
│   │   ├── 📁 services/
│   │   │   ├── 📁 ai_agents/
│   │   │   │   ├── base_agent.py
│   │   │   │   ├── init.py
│   │   │   │   ├── proposal_agent.py
│   │   │   │   └── prompts.py
│   │   │   ├── 📁 content/ (empty)
│   │   │   └── 📁 graph/
│   │   │       └── graph_service.py
│   │   ├── 📁 workers/ (empty)
│   │   ├── config.py
│   │   ├── main.py
│   │   └── test_script.py
│   ├── .env
│   ├── requirements.txt
│   ├── run.py
│   └── setup_db.py
├── 📁 frontend/
│   ├── 📁 public/
│   │   └── vite.svg
│   ├── 📁 src/
│   │   ├── 📁 assets/
│   │   │   └── react.svg
│   │   ├── 📁 components/
│   │   │   ├── 📁 common/
│   │   │   │   ├── ConflictResolution.tsx
│   │   │   │   ├── ResizableGraphLayout.tsx
│   │   │   │   ├── ResizablePanels.tsx
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   └── YearValidation.tsx
│   │   │   ├── 📁 graph/
│   │   │   │   ├── GraphExpansionControls.tsx
│   │   │   │   └── InfluenceGraph.tsx
│   │   │   ├── 📁 layout/
│   │   │   │   └── MainLayout.tsx
│   │   │   ├── 📁 panels/
│   │   │   │   ├── GraphPanel.tsx
│   │   │   │   ├── ItemDetailsPanel.tsx
│   │   │   │   └── ResearchPanel.tsx
│   │   │   └── 📁 research/
│   │   │       ├── ProposalActions.tsx
│   │   │       ├── ProposalForm.tsx
│   │   │       ├── ProposalQuestions.tsx
│   │   │       └── ProposalResults.tsx
│   │   ├── 📁 contexts/
│   │   │   ├── AppStateProvider.tsx
│   │   │   ├── GraphContext.tsx
│   │   │   └── ResearchContext.tsx
│   │   ├── 📁 hooks/
│   │   │   ├── useGraphOperations.ts
│   │   │   └── useProposals.ts
│   │   ├── 📁 services/
│   │   │   └── api.ts
│   │   ├── 📁 types/
│   │   │   └── graph.ts
│   │   ├── 📁 utils/
│   │   │   └── graphUtils.ts
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── .env
│   ├── .gitignore
│   ├── README.md
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── 📁 docs/ (empty)
├── 📁 infrastructure/ (empty)
├── 📁 shared/ (empty)
├── 📁 own stuff/
│   └── 📁 img/
│       ├── Screenshot 2025-06-12 at 09.07.18.png
│       ├── Screenshot 2025-06-13 at 08.28.41.png
│       └── image.png
├── .gitignore
├── package-lock.json
├── PROJECT_OVERVIEW.md
├── README.md
├── TASKS.md
├── own_understanding.md
└── worklog.md

## What This Is

**Influence Graph** is an AI-powered knowledge graph system that traces and visualizes influence relationships between any type of creative work, cultural artifact, or innovation. It uses AI agents to discover and structure influence relationships, then presents them in an interactive timeline-based graph visualization.

Think of it as a universal "influence map" - like MusicMap but for everything. From songs to movies, books to technology, art to architecture - it shows how everything influences everything else.

## 🏗️ Architecture Overview

### Backend (FastAPI + Neo4j + AI Agents)
- **FastAPI**: RESTful API with structured endpoints for graph operations
- **Neo4j**: Graph database storing items, creators, and influence relationships
- **AI Agents**: LangChain-based agents for research, structuring, and proposal generation
- **MCPs**: Model Context Protocol integration for enhanced data gathering

### Frontend (React + TypeScript + D3.js)
- **React + TypeScript**: Modern component-based UI with type safety
- **D3.js**: Interactive graph visualization with timeline and categorical layouts
- **Tailwind CSS**: Responsive styling with consistent design system
- **Resizable Panels**: Flexible layout system for research and visualization

## 🎯 Core Features

### 1. AI-Powered Influence Discovery
- **Research & Proposal Agent**: Generates organized influence proposals across three scopes:
  - **Macro**: Major foundational influences
  - **Micro**: Specific techniques and elements  
  - **Nano**: Tiny details and specific references
- **Structure Agent**: Converts free-text research into structured data
- **Source Tracking**: Tracks information sources and verification status

### 4. Canvas Research (Interactive Document Mode)
- **Canvas Research**: Provides an interactive, document-based research mode where users can iteratively refine, edit, and structure AI-generated research about an item before saving influences to the graph.
- **Section Editing & Refinement**: Users can edit any section, prompt the AI to refine content, and select which influences to add to the graph.
- **Flexible Workflow**: Enables deeper, more controlled research and curation before graph integration.

### 2. Interactive Graph Visualization
- **Timeline Layout**: Chronological arrangement showing influence flow
- **Categorical Layout**: Grouped by influence categories
- **Multi-level Expansion**: Click nodes to expand influence networks
- **Accumulative Graph**: Builds comprehensive networks over time

### 3. Smart Data Management
- **Conflict Resolution**: Merges duplicate items and creators
- **Year Validation**: Ensures influences predate influenced items
- **Confidence Scoring**: AI-assigned confidence levels for relationships

## 📊 Data Model

### Core Entities
```typescript
Item {
  id: string
  name: string
  description?: string
  year?: number
  auto_detected_type?: string  // song/movie/innovation/etc
  confidence_score?: float
  verification_status: string  // ai_generated/user_verified/community_verified
  created_at?: datetime
}

Creator {
  id: string
  name: string
  type: string  // person/organization/collective
}

InfluenceRelation {
  from_item: Item
  to_item: Item
  confidence: float
  influence_type: string
  explanation: string
  category: string  // LLM creates freely
  scope?: string  // macro/micro/nano
  source?: string
  year_of_influence?: number
  clusters?: string[]
}

InfluenceProposal {
  name: string
  type?: string  // auto-detected by LLM
  creator_name?: string
  creator_type?: string  // person/organization/collective
  year?: number
  category: string
  scope: string  // macro/micro/nano
  influence_type: string
  confidence: float  // 0.0-1.0
  explanation: string
  source?: string
  accepted: boolean
  parent_id?: string  // for nested proposals
  children: InfluenceProposal[]
  clusters?: string[]
}

GraphResponse {
  main_item: Item
  influences: InfluenceRelation[]
  categories: string[]
  creators: Creator[]
  scopes?: string[]  // available scopes for filtering
}
```

### Graph Schema
```cypher
// Node Labels
(:Item) - Creative works, cultural artifacts, innovations
(:Creator) - People, organizations, collectives who create items
(:Category) - Influence categories (for usage tracking only)
(:User) - Future: user accounts for community features

// Relationships
(Item)-[:CREATED_BY {role: string}]->(Creator)
(Item)-[:INFLUENCES {
  confidence: float,
  influence_type: string,
  explanation: string,
  category: string,  // Stored as property, not relationship
  scope: string,
  source: string,
  year_of_influence: number,
  clusters: string[],
  created_at: datetime
}]->(Item)

// Note: Categories are stored as string properties on INFLUENCES relationships
// Category nodes exist only for usage tracking, not for direct relationships

// Constraints & Indexes
CREATE CONSTRAINT item_id FOR (i:Item) REQUIRE i.id IS UNIQUE
CREATE CONSTRAINT creator_id FOR (c:Creator) REQUIRE c.id IS UNIQUE

CREATE INDEX item_name FOR (i:Item) ON (i.name)
CREATE INDEX item_year FOR (i:Item) ON (i.year)
CREATE INDEX item_type FOR (i:Item) ON (i.auto_detected_type)
CREATE INDEX creator_name FOR (c:Creator) ON (c.name)
CREATE INDEX creator_type FOR (c:Creator) ON (c.type)

```

## 🔄 User Workflow

### 1. Research New Items
1. Enter item name, type, and creator in Research Panel
2. AI generates influence proposals across macro/micro/nano levels
3. **Switch to Canvas Research for document-based exploration and refinement**
4. In Canvas mode, review, edit, and refine sections of the research document
5. Select relevant influences and save to the graph
6. Ask follow-up questions for deeper analysis
7. Save confirmed influences to database

### 2. Explore Existing Graph
1. Search for items in the database
2. View influence relationships in interactive graph
3. Click nodes to expand influence networks
4. Toggle between timeline and categorical layouts
5. View detailed item information in side panel

### 3. Build Comprehensive Networks
- Accumulate items and influences over multiple sessions
- Create rich networks showing complex influence chains
- Discover unexpected connections between different domains

## 🛠️ Technical Implementation

### Backend Services
app/
├── api/routes/ # FastAPI endpoints
│ ├── ai.py # AI research and proposal endpoints
│ ├── items.py # Item CRUD operations
│ └── influences.py # Influence relationship endpoints
├── services/
│ ├── ai_agents/ # LangChain-based AI agents
│ │ ├── research_agent.py
│ │ ├── structure_agent.py
│ │ └── proposal_agent.py
│ ├── graph/ # Neo4j database operations
│ └── content/ # Content processing services
├── models/ # Pydantic data models
└── core/ # Database connections and config

### Frontend Components
src/
├── components/
│ ├── panels/ # Main application panels
│ │ ├── ResearchPanel.tsx
│ │ ├── GraphPanel.tsx
│ │ └── ItemDetailsPanel.tsx
│ ├── canvas/ # Canvas research document mode
│ │ ├── CanvasTab.tsx
│ │ ├── DocumentRenderer.tsx
│ │ └── SectionComponent.tsx
│ ├── graph/ # D3.js graph visualization
│ ├── research/ # AI research interface
│ └── common/ # Reusable UI components
├── contexts/ # React context providers
│ └── CanvasContext.tsx # Canvas document state management
├── hooks/ # Custom React hooks
│ ├── useCanvasOperations.ts # Canvas research logic (start, refine, update sections)
│ ├── useGraphOperations.ts # Graph loading and expansion logic
│ └── useProposals.ts # AI proposal management
├── services/ # API client and utilities
├── types/ # TypeScript type definitions
└── utils/ # Utility functions
  └── graphUtils.ts # Graph data processing and positioning

#### Canvas Research Implementation Details
- **CanvasTab**: Main entry point for Canvas mode, manages switching between proposal and canvas workflows.
- **DocumentRenderer**: Renders the canvas document as a list of editable/refinable sections.
- **SectionComponent**: Handles editing, AI refinement, and selection for each section.
- **CanvasContext**: Provides state management for the current document, loading states, and section updates.
- **useCanvasOperations**: Custom hook for starting research, sending chat messages, and refining sections via API.
- **Workflow**: Users can edit, refine, and structure research before saving selected influences to the graph, allowing for a more controlled and iterative research process.

## 🚀 Current Status

### ✅ Completed Features
- **MVP Core**: Basic influence discovery and visualization
- **AI Integration**: Research, structure, and proposal agents
- **Graph Visualization**: Interactive D3.js timeline and categorical layouts
- **Database Schema**: Neo4j graph with items, creators, and relationships
- **API Layer**: Complete FastAPI backend with structured endpoints
- **UI Framework**: Modern React frontend with resizable panels
- **Conflict Resolution**: Smart merging of duplicate items and influences
- **Year Validation**: Ensures chronological accuracy of influence relationships
- **Proposal System**: AI-generated influence proposals with user confirmation
- **Follow-up Questions**: Interactive research with targeted AI analysis
- **Database Management**: UI-based cleanup and merge operations

### 🔄 In Progress
- **Clustering**: Semantic grouping of related influences
- **MCP Integration**: Enhanced data gathering with external tools
- **Community Features**: User verification and voting systems
- **Advanced Filtering**: Scope-based and confidence-based filtering

### 📋 Planned Features
- **Media Embedding**: Images, videos, and audio integration
- **Background Processing**: Automated influence discovery
- **Export/Import**: Graph data sharing and backup
- **Mobile Support**: Responsive design for mobile devices

## 🎨 Design Philosophy

### User Experience
- **AI-Assisted, Human-Controlled**: AI proposes, humans decide
- **Progressive Disclosure**: Start simple, expand complexity as needed
- **Visual Clarity**: Clean graph layouts with meaningful visual encoding
- **Flexible Workflow**: Support both research and exploration modes

### Technical Principles
- **Modular Architecture**: Clear separation between interface and implementation
- **Type Safety**: Comprehensive TypeScript and Pydantic models
- **Extensible Design**: Easy to add new AI agents and data sources
- **Performance Focus**: Efficient graph queries and rendering

## 🔧 Development Setup

### Prerequisites
- Python 3.8+ with virtual environment
- Node.js 16+ with npm
- Neo4j Desktop or local instance
- OpenAI API key for AI features

### Quick Start
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python run.py

# Frontend
cd frontend
npm install
npm run dev

# Database
# Start Neo4j Desktop and create/start a database
# Access browser at http://localhost:7474
```

### Environment Variables
```bash
# Backend .env
OPENAI_API_KEY=your_openai_key
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

## 🎯 Use Cases

### For Researchers
- Trace influence chains across different domains
- Discover unexpected connections between works
- Build comprehensive influence networks

### For Creators
- Understand your own influences
- Find inspiration from diverse sources
- Document creative process and references

### For Educators
- Show influence relationships in art, music, literature
- Demonstrate how ideas evolve and spread
- Create interactive learning experiences

### For Curators
- Map cultural movements and trends
- Identify key influencers and innovations
- Create thematic exhibitions and collections

## 🤝 Contributing

This project follows a clear separation between interface and implementation packages, allowing for both human-written core logic and AI-generated implementation details. The architecture supports:

- **Interface Packages**: Define contracts, data shapes, and critical tests
- **Implementation Packages**: Fulfill constraints (can be AI-generated)
- **Clear Dependencies**: Implementation depends on interfaces, never reverse
- **Regeneration Freedom**: AI-generated packages can be rewritten without fear

## 🔗 Related Projects

- **MusicMap**: Genre influence visualization
- **Every Noise at Once**: Music genre mapping
- **The Pudding's Film Influences**: Movie influence analysis
- **Wikipedia Influence Graph**: Academic influence tracking

## 📈 Recent Developments

### Architecture Improvements
- **Streamlined API Structure**: Consolidated endpoints and improved consistency
- **Enhanced Conflict Resolution**: Better handling of duplicate items and influences
- **Improved Year Validation**: Support for historical dates and chronological accuracy
- **Refactored Frontend**: Cleaner component structure and better state management

### AI Agent Enhancements
- **Proposal System**: Multi-scope influence proposals (macro/micro/nano)
- **Follow-up Questions**: Interactive research with targeted analysis
- **Structured Output**: Consistent data formatting for database storage
- **Confidence Scoring**: AI-assigned confidence levels for relationships

### User Experience Updates
- **Integrated Research**: AI research panel integrated into main graph view
- **Smart Merging**: Automatic detection and resolution of duplicate items
- **Database Management**: UI-based cleanup and merge operations
- **Enhanced Visualization**: Improved timeline and categorical layouts

---

*This project represents a new approach to understanding and visualizing the complex web of influences that shape our creative and cultural landscape. By combining AI-powered discovery with human curation, it aims to create the most comprehensive and accurate influence tracking system ever built.*