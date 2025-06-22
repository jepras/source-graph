# Graph Services Architecture

This module provides a modular architecture for managing influence graph data in Neo4j database. The original monolithic `GraphService` has been refactored into specialized services that follow the Single Responsibility Principle.

## Architecture Overview

```
graph/
├── __init__.py              # Module exports and backward compatibility
├── base_service.py          # Common utilities and base class
├── item_service.py          # Item CRUD operations
├── creator_service.py       # Creator operations
├── influence_service.py     # Influence relationship management
├── graph_query_service.py   # Graph queries and expansions
├── conflict_service.py      # Conflict resolution and merging
├── bulk_service.py          # Bulk data operations
├── graph_service.py         # Main orchestrator (replaces original)
└── graph_service_original.py # Backup of original monolithic service
```

## Service Responsibilities

### BaseGraphService
- **Purpose**: Common utilities and base functionality
- **Responsibilities**:
  - ID generation
  - Database connection management
  - Category management

### ItemService
- **Purpose**: Item entity management
- **Responsibilities**:
  - Create, read, update, delete items
  - Search items by name
  - Find similar items for conflict detection
  - Merge and delete items

### CreatorService
- **Purpose**: Creator entity management
- **Responsibilities**:
  - Create or get existing creators
  - Link creators to items

### InfluenceService
- **Purpose**: Influence relationship management
- **Responsibilities**:
  - Create influence relationships between items
  - Manage relationship properties (confidence, type, explanation, etc.)

### GraphQueryService
- **Purpose**: Complex graph queries and data retrieval
- **Responsibilities**:
  - Get item influences with filtering
  - Get expanded graph data
  - Count expansion possibilities
  - Retrieve graph relationships

### ConflictService
- **Purpose**: Conflict resolution and merging
- **Responsibilities**:
  - Find conflicts between new and existing data
  - Generate merge previews
  - Add influences to existing items

### BulkService
- **Purpose**: Bulk data operations
- **Responsibilities**:
  - Save complete structured influence data
  - Process multiple influences at once

### GraphService (Main Orchestrator)
- **Purpose**: Unified interface and coordination
- **Responsibilities**:
  - Coordinate all specialized services
  - Maintain backward compatibility
  - Provide unified API

## Usage

### Backward Compatibility
The main `GraphService` maintains the same public API as the original, so existing code continues to work:

```python
from app.services.graph import graph_service

# All existing methods work the same way
item = graph_service.create_item("Example Item", "movie", 2020)
influences = graph_service.get_influences(item.id)
```

### Using Individual Services
You can also use individual services directly for more focused operations:

```python
from app.services.graph import ItemService, CreatorService

# Use specific services
item_service = ItemService()
creator_service = CreatorService()

item = item_service.create_item("Example Item", "movie", 2020)
creator = creator_service.create_creator("John Doe", "director")
creator_service.link_creator_to_item(item.id, creator.id, "director")
```

### Service Dependencies
Services can be initialized with dependencies for better integration:

```python
from app.services.graph import ItemService, GraphQueryService

# GraphQueryService can use ItemService for item retrieval
item_service = ItemService()
graph_query_service = GraphQueryService(item_service=item_service)

# This will use the ItemService for item lookups
influences = graph_query_service.get_influences(item_id)
```

## Benefits of the New Architecture

1. **Single Responsibility**: Each service has a clear, focused purpose
2. **Maintainability**: Smaller files are easier to understand and modify
3. **Testability**: Individual services can be unit tested in isolation
4. **Reusability**: Services can be used independently or composed together
5. **Backward Compatibility**: Existing code continues to work without changes
6. **Modularity**: Changes to one area don't affect others

## Migration Guide

### For Existing Code
No changes required! The main `GraphService` maintains the same API.

### For New Code
Consider using individual services for more focused operations:

```python
# Instead of using the main service for everything
from app.services.graph import graph_service

# Consider using specific services
from app.services.graph import ItemService, GraphQueryService
```

### For Testing
Individual services can be tested in isolation:

```python
from app.services.graph import ItemService
from unittest.mock import Mock

# Test ItemService independently
item_service = ItemService()
# Mock dependencies as needed
```

## File Sizes Comparison

- **Original**: 1,088 lines (45KB)
- **New Modular**: 
  - `graph_service.py`: 156 lines (7.3KB) - Main orchestrator
  - `item_service.py`: 231 lines (9.0KB) - Item operations
  - `graph_query_service.py`: 439 lines (18KB) - Graph queries
  - `conflict_service.py`: 289 lines (11KB) - Conflict resolution
  - `bulk_service.py`: 107 lines (4.0KB) - Bulk operations
  - `creator_service.py`: 61 lines (2.0KB) - Creator operations
  - `influence_service.py`: 61 lines (2.2KB) - Influence operations
  - `base_service.py`: 43 lines (1.6KB) - Base utilities

Total: ~1,387 lines but much better organized and maintainable. 