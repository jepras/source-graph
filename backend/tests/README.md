# Test Documentation

This document describes the testing strategy and test suite for the Influence Graph backend.

## Overview

Our test suite is organized into two main categories:
- **Unit Tests** (`tests/unit/`) - Fast, isolated tests with mocked dependencies
- **Integration Tests** (`tests/integration/`) - Tests with real dependencies (database, AI API)

## Test Organization

```
backend/tests/
├── README.md                    # This file
├── conftest.py                  # Shared test fixtures and configuration
├── unit/                        # Unit tests (fast, mocked dependencies)
│   └── test_proposal_agent.py   # AI agent response parsing tests
└── integration/                 # Integration tests (real dependencies)
    └── test_graph_service.py    # Database operations tests
```

## Running Tests

### Quick Commands

```bash
# Run all tests
pytest tests/ -v

# Run only unit tests (fast feedback, ~30 seconds)
pytest tests/unit/ -v

# Run only integration tests (slower, ~2-5 minutes)
pytest tests/integration/ -v

# Run specific test file
pytest tests/unit/test_proposal_agent.py -v

# Run specific test method
pytest tests/unit/test_proposal_agent.py::TestProposalAgent::test_proposal_response_structure_song -v

# Run tests matching a pattern
pytest tests/ -k "test_ai" -v

# Run with coverage report
pytest tests/ --cov=app --cov-report=html

# Run only failed tests from last run
pytest --lf
```

### Development Workflow

1. **During development**: Run unit tests frequently
   ```bash
   pytest tests/unit/ -v
   ```

2. **Before committing**: Run all tests
   ```bash
   pytest tests/ -v
   ```

3. **When debugging**: Run specific failing test
   ```bash
   pytest tests/unit/test_proposal_agent.py::TestProposalAgent::test_edge_case_item_names -v -s
   ```

## Unit Tests (`tests/unit/`)

### `test_proposal_agent.py` - AI Agent Response Validation

Tests the AI agent's ability to generate valid influence proposals and handle edge cases.

**Dependencies**: OpenAI API (real calls, ~6-8 calls per full run)  
**Speed**: ~2-3 minutes  
**Purpose**: Ensures AI generates valid data structures and handles edge cases

#### Test Methods:

##### `test_proposal_response_structure_song()`
**What it tests**: AI generates valid InfluenceProposal objects for songs  
**Why important**: Core functionality - most users will research songs  
**Validates**:
- Response contains ProposalResponse with correct structure
- All three scope levels (macro/micro/nano) have proposals
- Each proposal has required fields (name, category, scope, confidence, explanation)
- Confidence scores are between 0.0 and 1.0
- Years are reasonable (1800-2025) when present

**OpenAI calls**: 1  
**Example failure**: "AssertionError: proposal.scope not in ['macro', 'micro', 'nano']"

##### `test_proposal_response_structure_movie()`
**What it tests**: AI generates valid proposals for movies (different content type)  
**Why important**: Ensures AI adapts to different media types  
**Validates**:
- Same structure validation as songs
- Movie-specific influence patterns (directors, film techniques, etc.)
- At least some proposals have creator information

**OpenAI calls**: 1  
**Example failure**: "AssertionError: No proposals have creators for movie"

##### `test_chronological_logic()`
**What it tests**: Influences predate the main item chronologically  
**Why important**: Prevents impossible influence relationships  
**Validates**:
- When main item has a year, all influences have earlier or same year
- Catches AI claiming something from 2020 influenced something from 2010

**OpenAI calls**: 1  
**Example failure**: "AssertionError: Influence 'Modern Song' (2020) cannot be after main item (2010)"

##### `test_edge_case_item_names()`
**What it tests**: AI handles unusual item names gracefully  
**Why important**: Real-world items have quotes, special characters, emojis  
**Validates**:
- Items with quotes, parentheses, dashes, underscores don't crash AI
- Unicode characters and emojis are handled
- Still returns valid proposals

**OpenAI calls**: 3 (one per edge case)  
**Example failure**: "AssertionError: AI failed on item name with special characters"

##### `test_confidence_score_distribution()`
**What it tests**: Confidence scores show reasonable variation  
**Why important**: Prevents AI from giving everything the same confidence  
**Validates**:
- Not all confidence scores are identical
- Most scores are in reasonable range (>=0.5)
- Shows AI is actually evaluating confidence

**OpenAI calls**: 1  
**Example failure**: "AssertionError: All confidence scores are identical"

##### `test_category_generation()`
**What it tests**: AI generates meaningful, specific categories  
**Why important**: Categories are used for graph organization and filtering  
**Validates**:
- Multiple different categories generated
- Categories aren't generic ("other", "misc", "general")
- Categories have actual content

**OpenAI calls**: 1  
**Example failure**: "AssertionError: Category 'other' is too generic"

##### `test_scope_distribution()`
**What it tests**: AI properly distributes proposals across macro/micro/nano scopes  
**Why important**: Scope levels provide different granularity of influences  
**Validates**:
- All three scope levels have at least one proposal
- Macro proposals tend to use broader terms (genre, movement, style)
- Nano proposals tend to use specific terms (technique, sound, sample)

**OpenAI calls**: 1  
**Example failure**: "AssertionError: Scope levels don't reflect broad vs specific influences"

## Integration Tests (`tests/integration/`)

### `test_graph_service.py` - Database Operations

Tests the core database operations with real Neo4j database connections.

**Dependencies**: Neo4j database (uses your actual database)  
**Speed**: ~1-2 minutes  
**Purpose**: Ensures database operations work correctly and data integrity is maintained

#### Test Methods:

##### `test_create_and_retrieve_item()`
**What it tests**: Basic item creation and retrieval cycle  
**Why important**: Core database functionality that everything else depends on  
**Validates**:
- Items can be created with all properties
- Items can be retrieved by ID
- Properties are preserved correctly
- Cleanup works (item can be deleted)

**Database operations**: CREATE, MATCH, DELETE  
**Example failure**: "AssertionError: retrieved_item.name != item.name"

##### `test_save_structured_influences_complete_flow()`
**What it tests**: The complete flow users take when saving AI proposals  
**Why important**: This is the main pathway from AI proposals to database  
**Validates**:
- Main item is created with correct properties
- All influences are created and linked
- Categories are captured
- Scopes (macro/micro/nano) are preserved
- Clusters are saved correctly
- Relationships have all required properties

**Database operations**: Complex multi-node creation with relationships  
**Example failure**: "AssertionError: Expected 2 influences, got 1"

##### `test_find_similar_items_conflict_detection()`
**What it tests**: Conflict detection when saving items that might already exist  
**Why important**: Prevents duplicate items and enables smart merging  
**Validates**:
- Exact name matches get 100% similarity score
- Partial name matches are found
- Creator matching works
- Non-matches correctly return empty results

**Database operations**: Complex MATCH with similarity scoring  
**Example failure**: "AssertionError: Exact match should have similarity_score=100"

##### `test_influence_relationship_creation_with_all_properties()`
**What it tests**: Influence relationships preserve all metadata  
**Why important**: Ensures no data loss when creating influence links  
**Validates**:
- All relationship properties are saved (confidence, influence_type, explanation, category, scope, source, clusters)
- Properties can be retrieved correctly
- Complex data types (arrays) work correctly

**Database operations**: CREATE relationship with complex properties  
**Example failure**: "AssertionError: influence.clusters != ['hip-hop', 'west-coast', 'classic']"

##### `test_scope_filtering()`
**What it tests**: Filtering influences by scope level (macro/micro/nano)  
**Why important**: Users need to view influences at different granularity levels  
**Validates**:
- Single scope filtering returns only that scope
- Multi-scope filtering works correctly
- No scope filter returns all influences
- Available scopes are correctly reported

**Database operations**: MATCH with WHERE clauses on scope  
**Example failure**: "AssertionError: Filtered for 'macro' but got 'micro' influences"

##### `test_merge_operations()`
**What it tests**: Merging duplicate items and transferring relationships  
**Why important**: Essential for cleaning up duplicate data  
**Validates**:
- Source item is deleted after merge
- All relationships are transferred to target item
- No data is lost during merge
- Target item has all expected influences after merge

**Database operations**: Complex relationship transfer with DELETE  
**Example failure**: "AssertionError: Source item still exists after merge"

##### `test_year_validation_logic()`
**What it tests**: Database accepts chronological data correctly  
**Why important**: Ensures database layer supports year-based influence relationships  
**Validates**:
- Year properties are stored correctly
- Year-based queries work
- Database schema supports chronological data

**Database operations**: CREATE with year properties, MATCH with year filtering  
**Example failure**: "AssertionError: Year property not preserved"

##### `test_search_functionality()`
**What it tests**: Item search by name works correctly  
**Why important**: Users need to find existing items before adding new ones  
**Validates**:
- Search finds items by partial name match
- Search returns all matching items
- Search handles case insensitivity
- Search results contain correct item data

**Database operations**: MATCH with CONTAINS clauses  
**Example failure**: "AssertionError: Search didn't find expected item"

## Test Data and Fixtures

### `conftest.py` - Shared Test Configuration

**Fixtures available to all tests:**

- `setup_test_database`: Establishes Neo4j connection for integration tests
- `graph_service`: Provides configured GraphService instance
- `sample_test_items`: Provides test data for different content types (songs, movies, books)
- `sample_structured_output`: Provides complete StructuredOutput for testing save operations

## Understanding Test Failures

### Common Failure Patterns:

#### AI Agent Failures (Unit Tests)
```
AssertionError: proposal.scope not in ['macro', 'micro', 'nano']
```
**Cause**: AI generated invalid scope value  
**Fix**: Check AI prompt, may need to adjust system message

```
JSONDecodeError: Expecting ',' delimiter
```
**Cause**: AI generated malformed JSON  
**Fix**: AI parsing logic needs improvement, check JSON cleaning code

#### Database Failures (Integration Tests)
```
AssertionError: Expected 2 influences, got 1
```
**Cause**: Database save operation failed or duplicate detection prevented save  
**Fix**: Check database constraints, look for duplicate detection logic

```
neo4j.exceptions.ServiceUnavailable
```
**Cause**: Neo4j database not running  
**Fix**: Start Neo4j Desktop or check connection settings

### Debugging Tips:

1. **Add `-s` flag to see print statements**:
   ```bash
   pytest tests/unit/test_proposal_agent.py::test_edge_case_item_names -v -s
   ```

2. **Run single test method to isolate issues**:
   ```bash
   pytest tests/integration/test_graph_service.py::TestGraphServiceIntegration::test_scope_filtering -v
   ```

3. **Check test database state**: Use Neo4j Browser to inspect data after failed tests

4. **View coverage to find untested code**:
   ```bash
   pytest tests/ --cov=app --cov-report=html
   open htmlcov/index.html
   ```

## Test Maintenance

### When to Update Tests:

- **API changes**: Update integration tests when endpoints change
- **AI prompt changes**: Update unit tests when AI behavior changes  
- **New features**: Add tests for new functionality
- **Bug fixes**: Add regression tests for fixed bugs

### Adding New Tests:

1. **Unit tests**: Add to appropriate test class in `tests/unit/`
2. **Integration tests**: Add to appropriate test class in `tests/integration/`
3. **New test files**: Follow naming convention `test_*.py`
4. **New fixtures**: Add to `conftest.py` if used by multiple tests

## Performance Expectations

### Unit Tests (`tests/unit/`)
- **Total runtime**: ~2-3 minutes
- **OpenAI API calls**: ~6-8 calls
- **Cost**: ~$0.30 per full run
- **When to run**: Every few code changes

### Integration Tests (`tests/integration/`)
- **Total runtime**: ~1-2 minutes  
- **Database operations**: ~20-30 queries
- **Cost**: Free (uses your database)
- **When to run**: Before committing code

### Full Test Suite
- **Total runtime**: ~3-5 minutes
- **When to run**: Before merging, weekly cleanup

## Next Additions to Tests

### High Priority (Next 2-4 weeks)

- **API Endpoint Tests** (`tests/integration/test_api_endpoints.py`)
  - Test all FastAPI routes with real requests
  - Validate request/response schemas match TypeScript interfaces
  - Test error handling (404s, 500s, validation errors)
  - Test conflict resolution workflows (proposals → conflicts → merge)

- **Pydantic Model Validation** (`tests/unit/test_models.py`)
  - Test all Pydantic models validate correctly
  - Test edge cases for required vs optional fields
  - Test field validation rules (confidence 0.0-1.0, valid years, etc.)
  - Test serialization/deserialization

- **Question/Answer Flow Tests** (`tests/integration/test_question_flow.py`)
  - Test unified question endpoint with real AI calls
  - Test drill-down vs discovery question types
  - Test question → proposals → save workflow
  - Test follow-up question chains

### Medium Priority (Next 1-2 months)

- **Frontend Unit Tests** (`frontend/tests/unit/`)
  - Test `useGraphOperations` hook logic
  - Test `graphUtils.ts` positioning algorithms
  - Test TypeScript interfaces match API responses
  - Test graph state management and accumulation

- **Conflict Resolution Tests** (`tests/integration/test_conflict_resolution.py`)
  - Test comprehensive conflict detection
  - Test influence-level conflict resolution
  - Test merge strategies (main item vs influence conflicts)
  - Test preview data generation

- **Data Quality Tests** (`tests/integration/test_data_quality.py`)
  - Test clustering algorithm generates meaningful clusters
  - Test category normalization and deduplication
  - Test influence relationship quality metrics
  - Test orphaned data cleanup

### Low Priority (When time allows)

- **Performance Tests** (`tests/performance/`)
  - Test graph queries with large datasets (1000+ nodes)
  - Test AI response time under load
  - Test database query optimization
  - Memory usage tests for large graphs

- **End-to-End Tests** (`e2e/tests/`)
  - Full user workflows with Playwright
  - Research → proposals → conflicts → save → visualize
  - Graph expansion and navigation
  - Search and discovery flows

- **Error Recovery Tests** (`tests/integration/test_error_recovery.py`)
  - Test behavior when OpenAI API is down
  - Test behavior when Neo4j is unavailable
  - Test partial save recovery
  - Test data corruption scenarios

### Testing Infrastructure Improvements

- **Separate Test Database**: Create isolated test database instead of using main database
- **Test Data Factory**: Create helper functions for generating realistic test data
- **Continuous Integration**: Set up GitHub Actions to run tests automatically
- **Test Coverage Goals**: Aim for 80% coverage on core business logic
- **Performance Benchmarks**: Track test execution time and set performance budgets

### Regression Test Candidates

When bugs are found, add tests for:
- Items with missing or invalid years
- Influences that reference non-existent items
- Malformed AI responses that crash parsing
- Database constraint violations
- Frontend state corruption scenarios