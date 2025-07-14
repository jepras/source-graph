# 🕸️ Influence Graph - Current System Overview

*Last updated: January 2025*

This document describes how the Influence Graph system **actually works** in its current state, not how it's intended to work or planned features.

## 🏗️ System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend (React + TypeScript)"
        UI[MainLayout.tsx]
        Graph[InfluenceGraph.tsx]
        Research[ResearchPanel.tsx]
        Details[ItemDetailsPanel.tsx]
        Canvas[CanvasTab.tsx]
    end
    
    subgraph "Backend (FastAPI + Python)"
        API[FastAPI Routes]
        Agents[AI Agents]
        GraphService[Graph Service]
        MCP[MCP Clients]
    end
    
    subgraph "Data Layer"
        Neo4j[(Neo4j Database)]
        MCPTools[YouTube MCP]
    end
    
    UI --> API
    Graph --> API
    Research --> API
    Canvas --> API
    Details --> API
    
    API --> Agents
    API --> GraphService
    API --> MCP
    
    Agents --> GraphService
    GraphService --> Neo4j
    MCP --> MCPTools
```

### Component Architecture

```mermaid
graph LR
    subgraph "Frontend Components"
        MainLayout[MainLayout]
        SearchBar[SearchBar]
        ResearchPanel[ResearchPanel]
        GraphPanel[GraphPanel]
        ItemDetails[ItemDetailsPanel]
        CanvasTab[CanvasTab]
        EnhancementPanel[EnhancementPanel]
    end
    
    subgraph "Backend Services"
        AI[AI Agents]
        Graph[Graph Service]
        MCP[MCP Client]
        DB[Neo4j DB]
    end
    
    subgraph "Data Models"
        Item[Item Model]
        Influence[Influence Model]
        Canvas[Canvas Model]
        Enhanced[Enhanced Content]
    end
    
    MainLayout --> ResearchPanel
    MainLayout --> GraphPanel
    ResearchPanel --> CanvasTab
    GraphPanel --> ItemDetails
    ItemDetails --> EnhancementPanel
    
    ResearchPanel --> AI
    CanvasTab --> AI
    GraphPanel --> Graph
    EnhancementPanel --> MCP
    
    AI --> Graph
    Graph --> DB
    MCP --> DB
    
    Graph --> Item
    Graph --> Influence
    AI --> Canvas
    MCP --> Enhanced
```

## 🔄 Data Flow

### 1. Research & Influence Discovery Flow

```mermaid
sequenceDiagram
    participant U as User
    participant RP as ResearchPanel
    participant AI as AI Agent
    participant GS as GraphService
    participant DB as Neo4j
    
    U->>RP: Enter item name
    RP->>AI: /api/ai/propose
    AI->>AI: Generate macro/micro/nano proposals
    AI->>RP: Return 6 proposals (2 each scope)
    U->>RP: Select proposals to accept
    RP->>AI: /api/ai/proposals/accept
    AI->>GS: Check for conflicts
    alt Conflicts found
        GS->>RP: Return conflict preview
        U->>RP: Review and resolve conflicts
    else No conflicts
        GS->>DB: Save structured influences
        GS->>RP: Return success
    end
    RP->>U: Show saved item in graph
```

### 2. Canvas Research Flow

```mermaid
sequenceDiagram
    participant U as User
    participant CT as CanvasTab
    participant CA as CanvasAgent
    participant GS as GraphService
    participant DB as Neo4j
    
    U->>CT: Start canvas research
    CT->>CA: /api/canvas/research
    CA->>CA: Generate structured document
    CA->>CT: Return document with sections
    U->>CT: Edit/refine sections
    CT->>CA: /api/canvas/refine
    CA->>CT: Return updated section
    U->>CT: Select influences for graph
    CT->>GS: Save selected influences
    GS->>DB: Store in database
    GS->>CT: Return success
```

### 3. Graph Visualization Flow

```mermaid
sequenceDiagram
    participant U as User
    participant IG as InfluenceGraph
    participant GS as GraphService
    participant DB as Neo4j
    
    U->>IG: Click on node
    IG->>GS: /api/items/{id}/influences
    GS->>DB: Query influence relationships
    DB->>GS: Return graph data
    GS->>IG: Return nodes and links
    IG->>IG: Update D3.js visualization
    IG->>U: Show expanded graph
    
    U->>IG: Toggle chronological/clustering
    IG->>IG: Reposition nodes
    IG->>U: Update layout
```

### 4. Content Enhancement Flow

```mermaid
sequenceDiagram
    participant U as User
    participant EP as EnhancementPanel
    participant EA as EnhancementAgent
    participant MCP as MCP Client
    participant GS as GraphService
    participant DB as Neo4j
    
    U->>EP: Click enhance button
    EP->>EA: /api/enhancement/items/{id}/enhance
    EA->>EA: Analyze item context
    EA->>EA: Generate search queries
    EA->>MCP: Execute YouTube searches
    MCP->>EA: Return video results
    EA->>EA: Score and filter content
    EA->>GS: Save enhanced content
    GS->>DB: Store content metadata
    GS->>EP: Return enhanced content
    EP->>U: Display videos/info
```

## 📊 Data Model

### Core Database Schema

```mermaid
erDiagram
    Item {
        string id PK
        string name
        string description
        int year
        string auto_detected_type
        float confidence_score
        string verification_status
        datetime created_at
    }
    
    Creator {
        string id PK
        string name
        string type
    }
    
    InfluenceRelation {
        string from_item_id FK
        string to_item_id FK
        float confidence
        string influence_type
        string explanation
        string category
        string scope
        string source
        int year_of_influence
        array clusters
    }
    
    EnhancedContent {
        string id PK
        string item_id FK
        string content_type
        string source
        string title
        string url
        string thumbnail
        float relevance_score
        string context_explanation
        json embedded_data
        datetime created_at
    }
    
    Item ||--o{ InfluenceRelation : "influences"
    Item ||--o{ InfluenceRelation : "influenced_by"
    Item ||--o{ EnhancedContent : "has_content"
    Creator ||--o{ Item : "creates"
```

### Frontend State Management

```mermaid
graph TD
    subgraph "Graph Context"
        GraphState[Graph State]
        AccumulatedGraph[Accumulated Graph]
        SelectedNode[Selected Node]
        ClusteringMode[Clustering Mode]
        ChronologicalOrder[Chronological Order]
    end
    
    subgraph "Canvas Context"
        CanvasState[Canvas State]
        CurrentDocument[Current Document]
        Sections[Sections]
        SelectedInfluences[Selected Influences]
    end
    
    subgraph "App State"
        AppState[App State]
        SearchResults[Search Results]
        LoadingStates[Loading States]
        ErrorStates[Error States]
    end
    
    GraphState --> AccumulatedGraph
    GraphState --> SelectedNode
    GraphState --> ClusteringMode
    GraphState --> ChronologicalOrder
    
    CanvasState --> CurrentDocument
    CanvasState --> Sections
    CanvasState --> SelectedInfluences
    
    AppState --> SearchResults
    AppState --> LoadingStates
    AppState --> ErrorStates
```

## 🎯 Key Features & How They Work

### 1. AI-Powered Influence Discovery

**Current Implementation:**
- Uses LangChain-based `ProposalAgent` with temperature 0.4
- Generates exactly 6 proposals: 2 macro, 2 micro, 2 nano
- Each proposal includes confidence scores (0.6-0.9 range)
- Supports scope-based filtering (macro/micro/nano)
- Includes conflict detection before saving

**Scope Definitions:**
- **Macro**: Major foundational influences (genres, movements, major works)
- **Micro**: Specific techniques and elements (methods, regional scenes, specific works)
- **Nano**: Tiny details and specifics (sounds, tools, personal moments)

### 2. Canvas Research Mode

**Current Implementation:**
- Interactive document-based research interface
- Two-agent system available (single agent by default)
- Supports section-by-section refinement
- Users can edit content and select which influences to save
- Maintains document state between sessions

**Workflow:**
1. Generate initial research document with sections
2. Allow user editing and AI refinement
3. Select specific influences for graph integration
4. Save selected influences with conflict resolution

### 3. Graph Visualization

**Current Implementation:**
- D3.js-based interactive visualization
- Two layout modes: chronological and clustering
- Supports node expansion and edge highlighting
- Accumulative graph building (adds to existing graph)
- Custom cluster management available

**Layout Modes:**
- **Chronological**: Nodes positioned by year (x-axis)
- **Clustering**: Nodes grouped by influence categories
- **Custom**: User-defined cluster assignments

### 4. Content Enhancement

**Current Implementation:**
- YouTube MCP integration (Spotify/Wikipedia planned)
- AI-powered content analysis and scoring
- Relevance filtering (0-10 scale)
- Stores enhanced content in Neo4j database
- Supports up to 4 content pieces per item

**Enhancement Process:**
1. Analyze item context and type
2. Generate targeted search queries
3. Execute MCP tool searches
4. Score and filter results
5. Save relevant content with metadata

### 5. Conflict Resolution

**Current Implementation:**
- Comprehensive conflict detection for items and influences
- Preview system for merge decisions
- Supports item merging and relationship transfer
- Year validation (influences must predate influenced items)
- Confidence-based conflict resolution

## 🔧 Technical Implementation Details

### Backend Services Architecture

```mermaid
graph TB
    subgraph "API Layer"
        ItemsAPI[Items API]
        AIAPI[AI API]
        CanvasAPI[Canvas API]
        EnhancementAPI[Enhancement API]
        InfluencesAPI[Influences API]
    end
    
    subgraph "Service Layer"
        GraphService[Graph Service]
        ItemService[Item Service]
        CreatorService[Creator Service]
        InfluenceService[Influence Service]
        ConflictService[Conflict Service]
        BulkService[Bulk Service]
    end
    
    subgraph "AI Agents"
        ProposalAgent[Proposal Agent]
        CanvasAgent[Canvas Agent]
        EnhancementAgent[Enhancement Agent]
        TwoAgentCanvas[Two Agent Canvas]
    end
    
    subgraph "External"
        MCPClient[MCP Client]
        Neo4jDB[(Neo4j)]
    end
    
    ItemsAPI --> GraphService
    AIAPI --> ProposalAgent
    CanvasAPI --> CanvasAgent
    EnhancementAPI --> EnhancementAgent
    InfluencesAPI --> GraphService
    
    GraphService --> ItemService
    GraphService --> CreatorService
    GraphService --> InfluenceService
    GraphService --> ConflictService
    GraphService --> BulkService
    
    ProposalAgent --> GraphService
    CanvasAgent --> GraphService
    EnhancementAgent --> MCPClient
    
    ItemService --> Neo4jDB
    CreatorService --> Neo4jDB
    InfluenceService --> Neo4jDB
    MCPClient --> Neo4jDB
```

### Frontend Component Hierarchy

```mermaid
graph TD
    App[App.tsx] --> MainLayout[MainLayout.tsx]
    
    MainLayout --> SearchBar[SearchBar.tsx]
    MainLayout --> ResearchPanel[ResearchPanel.tsx]
    MainLayout --> GraphPanel[GraphPanel.tsx]
    
    ResearchPanel --> CanvasTab[CanvasTab.tsx]
    ResearchPanel --> EnhancementPanel[EnhancementPanel.tsx]
    
    CanvasTab --> DocumentRenderer[DocumentRenderer.tsx]
    CanvasTab --> ChatInput[ChatInput.tsx]
    CanvasTab --> ModelSelector[ModelSelector.tsx]
    
    GraphPanel --> InfluenceGraph[InfluenceGraph.tsx]
    GraphPanel --> GraphExpansionControls[GraphExpansionControls.tsx]
    
    InfluenceGraph --> CustomClusterManager[CustomClusterManager.tsx]
    
    GraphPanel --> ItemDetailsPanel[ItemDetailsPanel.tsx]
    ItemDetailsPanel --> ConflictResolution[ConflictResolution.tsx]
```

## 🚀 Current Capabilities

### ✅ What Works Now

1. **AI Influence Discovery**
   - Generates structured influence proposals
   - Scope-based categorization (macro/micro/nano)
   - Confidence scoring and validation
   - Conflict detection and resolution

2. **Interactive Graph Visualization**
   - D3.js-based interactive graph
   - Multiple layout modes
   - Node expansion and selection
   - Edge highlighting and filtering

3. **Canvas Research Mode**
   - Document-based research interface
   - Section editing and refinement
   - AI-powered content generation
   - Selective influence saving

4. **Content Enhancement**
   - YouTube MCP integration
   - AI-powered content analysis
   - Relevance scoring and filtering
   - Enhanced content storage

5. **Data Management**
   - Neo4j graph database
   - Comprehensive conflict resolution
   - Year validation
   - Confidence-based relationships

### 🔄 Current Data Flow Summary

1. **User Input** → Research Panel or Canvas Tab
2. **AI Processing** → Proposal Agent or Canvas Agent
3. **Conflict Detection** → Graph Service
4. **Data Storage** → Neo4j Database
5. **Graph Update** → D3.js Visualization
6. **Content Enhancement** → MCP Client → Enhanced Content Storage

### 📈 System Performance

- **Response Time**: AI proposals typically 5-15 seconds
- **Graph Rendering**: Handles up to 100+ nodes smoothly
- **Database**: Neo4j handles complex graph queries efficiently
- **MCP Integration**: YouTube searches complete in 2-5 seconds
- **Conflict Resolution**: Comprehensive detection in 1-3 seconds

## 🔮 Current Limitations

1. **MCP Integration**: Only YouTube currently implemented
2. **Graph Size**: Performance degrades with 200+ nodes
3. **AI Model**: Single model per agent (no model switching)
4. **Offline Support**: No offline functionality
5. **Collaboration**: No multi-user support
6. **Export**: Limited export capabilities
7. **Mobile**: No mobile-optimized interface

This overview represents the current state of the Influence Graph system as it actually exists and functions today. 