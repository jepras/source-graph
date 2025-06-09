# Universal Influence Knowledge Graph

This project aims to create a universal influence tracking system that generates timeline-based knowledge graphs to trace causal influences of various items using AI agents and data sources.

## Setup

Refer to TASKS.md and PLANNING.md for detailed setup instructions and project plans. 

## How to use this
- Test frontend: cd frontend npm run dev
- Start & open database from Neo4j Desktop. Run queries through the browser: http://localhost:7474/browser/
- Test FastAPI: cd backend python run.py
    - Go to http://localhost:8000/docs
    - To kill whatever is on 8000: lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9

## Security stuff to fix
CORS
Avoid pycache to be pushed