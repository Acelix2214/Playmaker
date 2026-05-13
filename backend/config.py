"""
Backend configuration and constants
"""
import os

# API Configuration
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# Cache TTL Configuration (in seconds)
CACHE_TTL = {
    "standings": 10 * 60,          # 10 minutes
    "player_stats": 60 * 60,       # 1 hour
    "player_list": 30 * 60,        # 30 minutes
    "schedules": 30 * 60,          # 30 minutes
    "recent_games": 15 * 60,       # 15 minutes
    "team_games": 30 * 60,         # 30 minutes
    "teams": 60 * 60,              # 1 hour
    "search": 60 * 60,             # 1 hour
    "historical": 24 * 60 * 60,    # 24 hours
}

# Rate Limiting Configuration
RATE_LIMITS = {
    "player_search": {"requests": 30, "window": 60},      # 30 per minute
    "games": {"requests": 50, "window": 60},              # 50 per minute
    "teams": {"requests": 30, "window": 60},              # 30 per minute
    "players": {"requests": 40, "window": 60},            # 40 per minute
}

# NBA API Configuration
NBA_API_TIMEOUT = 10  # seconds

# Retry Configuration
RETRY_CONFIG = {
    "max_retries": 3,
    "initial_delay": 1,    # seconds
    "backoff_factor": 2,   # exponential backoff
    "max_delay": 30,       # max delay between retries
}

# CORS Configuration
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

# Logging Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
