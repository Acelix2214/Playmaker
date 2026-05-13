"""
Simplified backend for testing - minimal dependencies
"""
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import logging

# Configure logging
logging.basicConfig(level="INFO")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Playmaker NBA API",
    description="Backend API for Playmaker NBA Data Explorer",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Playmaker NBA API Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "cache_stats": {
            "total_entries": 0,
            "total_hits": 0,
            "cache_size_mb": 0
        },
        "api_sources": ["nba_api", "espn"]
    }


# Mock endpoints for testing
@app.get("/api/games/recent")
async def get_recent_games(limit: int = Query(6, ge=1, le=30)):
    """Get recent NBA games"""
    return {
        "data": [],
        "total": 0
    }


@app.get("/api/teams")
async def get_all_teams():
    """Get all NBA teams"""
    return {
        "data": [],
        "total": 0
    }


@app.get("/api/players")
async def get_players(limit: int = Query(24, ge=1, le=100), page: int = Query(0, ge=0)):
    """Get paginated player list"""
    return {
        "data": [],
        "total": 0,
        "next_cursor": None
    }


if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting Playmaker backend...")
    uvicorn.run(
        "main_simple:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
