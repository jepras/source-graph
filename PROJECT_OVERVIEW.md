# 🕸️ Influence Graph - Project Overview

Latest updated on 11/6/2025 - 19:30

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