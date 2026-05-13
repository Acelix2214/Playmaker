"""
Main FastAPI application with CORS, middleware, and route registration
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import time
import sys
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from config import ALLOWED_ORIGINS, LOG_LEVEL
from cache import cache_manager
from models import HealthResponse

# Configure logging
logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger(__name__)

# Import routes
from routes import games, teams, players


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    logger.info("🚀 Backend API starting up...")
    yield
    logger.info("🛑 Backend API shutting down...")
    cache_manager.clear()


app = FastAPI(
    title="Playmaker NBA API",
    description="Backend API for Playmaker NBA Data Explorer",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    """Add response time header"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.debug(f"{request.method} {request.url.path} - {process_time:.3f}s")
    return response


# Register routes
app.include_router(games.router)
app.include_router(teams.router)
app.include_router(players.router)


# Health check endpoint
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint with cache statistics"""
    stats = cache_manager.stats()
    
    return {
        "status": "healthy",
        "cache_stats": {
            "total_entries": stats["total_entries"],
            "total_hits": stats["total_hits"],
            "cache_size_mb": round(stats["cache_size_mb"], 2),
            "by_endpoint": stats["by_endpoint"]
        },
        "api_sources": ["nba_api", "espn"]
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Playmaker NBA API Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }


# Startup event
@app.on_event("startup")
async def startup():
    """On startup event"""
    logger.info("✅ Backend API is ready to serve requests")
    logger.info(f"📍 Allowed origins: {ALLOWED_ORIGINS}")


# Shutdown event
@app.on_event("shutdown")
async def shutdown():
    """On shutdown event"""
    logger.info("❌ Backend API is shutting down")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=LOG_LEVEL.lower()
    )
