from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import items, ai, influences, canvas, enhancement


app = FastAPI(
    title="Influence Graph API",
    description="API for exploring influence relationships",
    version="1.0.0",
)

# CORS middleware - more permissive for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(items.router, prefix="/api")
app.include_router(ai.router, prefix="/api")  # Add AI routes
app.include_router(influences.router, prefix="/api")  # Add influences routes
app.include_router(canvas.router, prefix="/api")
app.include_router(enhancement.router)  # Add enhancement routes


@app.get("/")
async def root():
    return {"message": "Influence Graph API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
