# Playmaker NBA API Backend

Fast, scalable NBA analytics backend with intelligent caching, rate limiting, and dual API integration.

## Features

- ✅ **In-Memory Caching** with TTL-based expiration
  - Standings: 10 minutes
  - Player stats: 1 hour
  - Schedules: 30 minutes
  - Recent games: 15 minutes
  - Historical data: 24 hours

- ✅ **Dual API Sources** (Fallback support)
  - NBA Official API (nba_api) - Primary source
  - ESPN Public API - Fallback source
  - No API keys required

- ✅ **Smart Error Handling**
  - Returns stale cached data if APIs fail
  - Exponential backoff retry logic
  - Rate limit detection and handling (429)

- ✅ **Performance Optimized**
  - Request deduplication via cache keys
  - Async/await for non-blocking operations
  - Response time tracking middleware

## Setup

### Prerequisites

- Python 3.8+
- pip (Python package manager)

### Installation

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment (optional but recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file (optional):
```bash
cp .env.example .env
# Edit .env if needed (defaults are provided)
```

### Running the Backend

**Development mode (with auto-reload):**
```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Production mode:**
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at: `http://localhost:8000`

- Documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

## API Endpoints

### Games
- `GET /api/games/recent?limit=6` - Recent NBA games
- `GET /api/games/schedule?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` - Games in date range
- `GET /api/games/team/{team_id}?limit=8` - Team's recent games

### Teams
- `GET /api/teams` - All NBA teams
- `GET /api/teams/{team_id}` - Single team details

### Players
- `GET /api/players?limit=24&page=0` - Paginated player list
- `GET /api/players?search=query&limit=6` - Search players
- `GET /api/players/{player_id}/stats` - Player statistics

### Utility
- `GET /api/health` - Health check with cache statistics
- `GET /` - API info

## Cache Configuration

Cache TTLs can be modified in `config.py`:

```python
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
```

## Running Backend + Frontend Together

From the root directory:
```bash
npm run dev:all
```

This will start:
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

## Monitoring

Check cache performance via health endpoint:
```bash
curl http://localhost:8000/api/health
```

Response includes:
- Cache hit statistics
- Memory usage
- Breakdown by endpoint
- Available API sources

## Troubleshooting

### "ModuleNotFoundError: No module named 'nba_api'"
```bash
pip install nba-api
```

### "Address already in use" on port 8000
```bash
# Use a different port
python -m uvicorn main:app --reload --port 8001
```

### CORS errors in frontend
Ensure `ALLOWED_ORIGINS` in `config.py` includes your frontend URL (defaults to localhost:5173)

### API rate limit errors
Backend automatically retries with exponential backoff. Check logs for details.

## Environment Variables

- `DEBUG` - Enable debug logging (False by default)
- `LOG_LEVEL` - Logging level (INFO, DEBUG, WARNING, ERROR)
- `BASE_URL` - Backend base URL (for documentation)

## Performance Tips

1. **Cache Hits** - Monitor via `/api/health` endpoint
2. **Stale Data** - Backend returns cached data if API fails
3. **Pagination** - Use `limit` and `page` for large datasets
4. **Search** - Debounced on frontend (500ms delay)

## API Response Format

All endpoints return standardized JSON:

```json
{
  "data": [],
  "total": 0,
  "next_cursor": null
}
```

Error responses:
```json
{
  "error": "Error message",
  "fallback_data": null,
  "offline_mode": false
}
```

## License

MIT - See root LICENSE file
