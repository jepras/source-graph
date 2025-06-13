# 🕸️ Influence Graph - Project Overview

Latest updated on 11/6/2025 - 19:30

### Current tree structure
influence-graph/
├── 📁 backend/
│   ├── 📁 app/
│   │   ├── 📁 api/
│   │   │   └── 📁 routes/
│   │   │       ├── ai.py (9.3KB, 265 lines)
│   │   │       ├── items.py (4.3KB, 130 lines)
│   │   │       └── influences.py (4.0KB, 119 lines)
│   │   ├── 📁 core/
│   │   │   └── 📁 database/
│   │   │       ├── neo4j.py (632B, 26 lines)
│   │   │       ├── sample_data.py (6.7KB, 210 lines)
│   │   │       └── schema.py (2.0KB, 58 lines)
│   │   ├── 📁 mcps/ (empty)
│   │   ├── 📁 models/
│   │   │   ├── ai.py (396B, 18 lines)
│   │   │   ├── item.py (1.2KB, 49 lines)
│   │   │   ├── proposal.py (5.6KB, 150 lines)
│   │   │   └── structured.py (2.9KB, 79 lines)
│   │   ├── 📁 services/
│   │   │   ├── 📁 ai_agents/
│   │   │   │   ├── base_agent.py (1003B, 28 lines)
│   │   │   │   ├── init.py (20B, 2 lines)
│   │   │   │   ├── proposal_agent.py (21KB, 573 lines)
│   │   │   │   ├── prompts.py (7.2KB, 166 lines)
│   │   │   │   ├── research_agent.py (4.1KB, 84 lines)
│   │   │   │   └── structure_agent.py (9.0KB, 252 lines)
│   │   │   ├── 📁 content/ (empty)
│   │   │   └── 📁 graph/
│   │   │       └── graph_service.py (41KB, 1000 lines)
│   │   ├── �� workers/ (empty)
│   │   ├── config.py (819B, 35 lines)
│   │   ├── main.py (911B, 34 lines)
│   │   └── test_script.py (170B, 6 lines)
│   ├── 📁 venv/ (Python virtual environment)
│   ├── debug_structure.py (1.2KB, 40 lines)
│   ├── requirements.txt (340B, 21 lines)
│   ├── run.py (140B, 6 lines)
│   ├── setup_db.py (396B, 17 lines)
│   ├── test_ai_endpoint.py (782B, 32 lines)
│   ├── test_graph_service.py (602B, 19 lines)
│   ├── test_llm.py (619B, 24 lines)
│   └── test_scope.py (4.9KB, 148 lines)
├── 📁 frontend/
│   ├── 📁 node_modules/ (npm dependencies)
│   ├── 📁 public/ (static assets)
│   ├── 📁 src/
│   │   ├── 📁 assets/ (static assets)
│   │   ├── 📁 components/
│   │   │   ├── 📁 common/
│   │   │   │   ├── ConflictResolution.tsx (5.9KB, 158 lines)
│   │   │   │   ├── ResizableGraphLayout.tsx (4.1KB, 110 lines)
│   │   │   │   ├── ResizablePanels.tsx (3.8KB, 106 lines)
│   │   │   │   ├── SearchBar.tsx (2.2KB, 73 lines)
│   │   │   │   └── YearValidation.tsx (6.7KB, 211 lines)
│   │   │   ├── 📁 graph/
│   │   │   │   ├── GraphExpansionControls.tsx (3.5KB, 98 lines)
│   │   │   │   └── InfluenceGraph.tsx (19KB, 527 lines)
│   │   │   ├── 📁 layout/
│   │   │   │   └── MainLayout.tsx (3.0KB, 94 lines)
│   │   │   ├── 📁 panels/
│   │   │   │   ├── GraphPanel.tsx (2.7KB, 66 lines)
│   │   │   │   ├── ItemDetailsPanel.tsx (9.1KB, 270 lines)
│   │   │   │   └── ResearchPanel.tsx (1.5KB, 44 lines)
│   │   │   └── 📁 research/
│   │   │       ├── ProposalActions.tsx (3.8KB, 101 lines)
│   │   │       ├── ProposalForm.tsx (4.2KB, 114 lines)
│   │   │       ├── ProposalQuestions.tsx (8.6KB, 192 lines)
│   │   │       └── ProposalResults.tsx (12KB, 233 lines)
│   │   ├── 📁 contexts/ (React contexts)
│   │   ├── 📁 hooks/
│   │   │   ├── useGraphOperations.ts (8.5KB, 238 lines)
│   │   │   └── useProposals.ts (9.7KB, 254 lines)
│   │   ├── 📁 services/
│   │   │   └── api.ts (14KB, 451 lines)
│   │   ├── 📁 types/
│   │   │   └── graph.ts (613B, 27 lines)
│   │   ├── 📁 utils/
│   │   │   └── graphUtils.ts (23KB, 661 lines)
│   │   ├── App.css (606B, 43 lines)
│   │   ├── App.tsx (298B, 14 lines)
│   │   ├── index.css (306B, 10 lines)
│   │   ├── main.tsx (230B, 11 lines)
│   │   └── vite-env.d.ts (38B, 2 lines)
│   ├── .gitignore (253B, 25 lines)
│   ├── eslint.config.js (734B, 29 lines)
│   ├── index.html (366B, 14 lines)
│   ├── package-lock.json (169KB, 4939 lines)
│   ├── package.json (812B, 35 lines)
│   ├── README.md (1.9KB, 55 lines)
│   ├── tsconfig.app.json (702B, 28 lines)
│   ├── tsconfig.json (119B, 8 lines)
│   ├── tsconfig.node.json (630B, 26 lines)
│   └── vite.config.ts (229B, 11 lines)
├── 📁 docs/ (documentation)
├── 📁 infrastructure/ (deployment configs)
├── 📁 shared/ (shared utilities)
├── 📁 own stuff/ (personal files)
├── 📁 .cursor/ (Cursor IDE config)
├── 📁 .git/ (git repository)
├── 📁 .vscode/ (VS Code config)
├── .gitignore (310B, 26 lines)
├── package-lock.json (87B, 7 lines)
├── previous_db.json (1.7KB, 77 lines)
├── PROJECT_OVERVIEW.md (9.0KB, 258 lines)
├── README.md (731B, 18 lines)
├── TASKS.md (11KB, 211 lines)
└── worklog.md (4.6KB, 88 lines)

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
- **Research Agent**: Analyzes items to find potential influences
- **Structure Agent**: Converts free-text research into structured data
- **Proposal Agent**: Generates organized influence proposals across three scopes:
  - **Macro**: Major foundational influences
  - **Micro**: Specific techniques and elements  
  - **Nano**: Tiny details and specific references

### 2. Interactive Graph Visualization
- **Timeline Layout**: Chronological arrangement showing influence flow
- **Categorical Layout**: Grouped by influence categories
- **Multi-level Expansion**: Click nodes to expand influence networks
- **Accumulative Graph**: Builds comprehensive networks over time

### 3. Smart Data Management
- **Conflict Resolution**: Merges duplicate items and creators
- **Year Validation**: Ensures influences predate influenced items
- **Confidence Scoring**: AI-assigned confidence levels for relationships
- **Source Tracking**: Tracks information sources and verification status

## 📊 Data Model

### Core Entities
```typescript
Item {
  id: string
  name: string
  type: string (auto-detected)
  year: number
  description: string
  confidence_score: float
  verification_status: string
}

Creator {
  id: string
  name: string
  type: "person" | "organization" | "collective"
}

InfluenceRelation {
  from_item: Item
  to_item: Item
  confidence: float
  influence_type: string
  explanation: string
  category: string
  scope: "macro" | "micro" | "nano"
  source: string
}
```

### Graph Schema
- `(Item)-[:CREATED_BY]->(Creator)`
- `(Item)-[:INFLUENCES]->(Item)`
- `(Item)-[:BELONGS_TO]->(Category)`

## 🔄 User Workflow

### 1. Research New Items
1. Enter item name, type, and creator in Research Panel
2. AI generates influence proposals across macro/micro/nano levels
3. Review and select relevant proposals
4. Ask follow-up questions for deeper analysis
5. Save confirmed influences to database

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
│ ├── graph/ # D3.js graph visualization
│ ├── research/ # AI research interface
│ └── common/ # Reusable UI components
├── contexts/ # React context providers
├── hooks/ # Custom React hooks
│ ├── useGraphOperations.ts # Graph loading and expansion logic
│ └── useProposals.ts # AI proposal management
├── services/ # API client and utilities
├── types/ # TypeScript type definitions
└── utils/ # Utility functions
  └── graphUtils.ts # Graph data processing and positioning


## 🚀 Current Status

### ✅ Completed Features
- **MVP Core**: Basic influence discovery and visualization
- **AI Integration**: Research, structure, and proposal agents
- **Graph Visualization**: Interactive D3.js timeline and categorical layouts
- **Database Schema**: Neo4j graph with items, creators, and relationships
- **API Layer**: Complete FastAPI backend with structured endpoints
- **UI Framework**: Modern React frontend with resizable panels

### �� In Progress
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

## �� Related Projects

- **MusicMap**: Genre influence visualization
- **Every Noise at Once**: Music genre mapping
- **The Pudding's Film Influences**: Movie influence analysis
- **Wikipedia Influence Graph**: Academic influence tracking



---

*This project represents a new approach to understanding and visualizing the complex web of influences that shape our creative and cultural landscape. By combining AI-powered discovery with human curation, it aims to create the most comprehensive and accurate influence tracking system ever built.*