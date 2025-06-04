from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import items

app = FastAPI(
    title="Influence Graph API",
    description="API for exploring influence relationships",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(items.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Influence Graph API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
