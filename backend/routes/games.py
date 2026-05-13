"""
Game endpoints - recent games, schedules, team games
"""
from fastapi import APIRouter, Query, HTTPException
from datetime import datetime, timedelta
from typing import Optional
import logging
import requests
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from cache import cache_manager
from config import CACHE_TTL
from models import GameList, ErrorResponse
from utils import retry_with_backoff, APIError, RateLimitError, log_cache_hit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/games", tags=["games"])

# Store for stale cache fallback
stale_cache = {}


def _as_int(value):
    """Convert API numeric values without turning missing scores into zero."""
    if value is None or value == "":
        return None
    try:
        if value != value:  # NaN
            return None
    except TypeError:
        pass
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _team_from_scoreboard_row(row) -> dict:
    city = row.get("teamCity") or row.get("TEAM_CITY_NAME") or ""
    name = row.get("teamName") or row.get("TEAM_NAME") or ""
    return {
        "id": _as_int(row.get("teamId") or row.get("TEAM_ID")) or 0,
        "abbreviation": row.get("teamTricode") or row.get("TEAM_ABBREVIATION") or "N/A",
        "full_name": f"{city} {name}".strip(),
        "city": city,
        "conference": "Unknown",
        "division": "Unknown"
    }


def _team_from_espn_competitor(competitor) -> dict:
    team = competitor.get("team", {})
    return {
        "id": _as_int(team.get("id")) or 0,
        "abbreviation": team.get("abbreviation") or "N/A",
        "full_name": team.get("displayName") or team.get("name") or "",
        "city": team.get("location") or "",
        "conference": "Unknown",
        "division": "Unknown"
    }


def transform_espn_game(event) -> Optional[dict]:
    """Transform one ESPN scoreboard event to the app's game shape."""
    competitions = event.get("competitions") or []
    if not competitions:
        return None

    competition = competitions[0]
    competitors = competition.get("competitors") or []
    home = next((item for item in competitors if item.get("homeAway") == "home"), None)
    away = next((item for item in competitors if item.get("homeAway") == "away"), None)

    if not home or not away:
        return None

    status = event.get("status", {}).get("type", {})
    show_score = status.get("state") != "pre"
    return {
        "id": str(event.get("id", "")),
        "date": event.get("date", ""),
        "status": status.get("shortDetail") or status.get("description") or status.get("name") or "Scheduled",
        "home_team": _team_from_espn_competitor(home),
        "visitor_team": _team_from_espn_competitor(away),
        "home_team_score": _as_int(home.get("score")) if show_score else None,
        "visitor_team_score": _as_int(away.get("score")) if show_score else None,
        "venue": (competition.get("venue") or {}).get("fullName")
    }


def transform_scoreboard_v3_game(header, line_scores) -> Optional[dict]:
    """Transform one ScoreboardV3 game plus its two line-score rows."""
    game_id = str(header.get("gameId", ""))
    game_code = header.get("gameCode", "") or ""
    game_lines = line_scores[line_scores["gameId"].astype(str) == game_id].to_dict("records")
    if len(game_lines) < 2:
        return None

    teams_by_abbr = {
        str(row.get("teamTricode", "")).upper(): row
        for row in game_lines
        if row.get("teamTricode")
    }

    matchup = game_code.split("/")[-1].upper()
    away_abbr = matchup[:3] if len(matchup) >= 6 else None
    home_abbr = matchup[3:6] if len(matchup) >= 6 else None

    away_row = teams_by_abbr.get(away_abbr) if away_abbr else None
    home_row = teams_by_abbr.get(home_abbr) if home_abbr else None

    # ScoreboardV3 line scores are keyed by game but do not expose home/away
    # directly. gameCode normally carries AWAYHOME tricodes; preserve a stable
    # fallback if that code is unavailable.
    if not home_row or not away_row:
        away_row, home_row = game_lines[0], game_lines[1]

    game_status = _as_int(header.get("gameStatus"))
    show_score = game_status != 1

    return {
        "id": game_id,
        "date": header.get("gameTimeUTC") or header.get("gameEt") or "",
        "status": header.get("gameStatusText") or ("Final" if game_status == 3 else "Scheduled"),
        "home_team": _team_from_scoreboard_row(home_row),
        "visitor_team": _team_from_scoreboard_row(away_row),
        "home_team_score": _as_int(home_row.get("score")) if show_score else None,
        "visitor_team_score": _as_int(away_row.get("score")) if show_score else None,
    }


def transform_nba_game(game) -> dict:
    """Transform nba_api game response to our format"""
    return {
        "id": str(game.get("game_id", "")),
        "date": game.get("game_datetime", ""),
        "status": "Final" if game.get("game_status", 0) == 3 else "Scheduled",
        "home_team": {
            "id": game.get("home_team_id", 0),
            "abbreviation": game.get("home_team_abbreviation", "N/A"),
            "full_name": game.get("home_team_name", ""),
            "city": "",
            "conference": "Unknown",
            "division": "Unknown"
        },
        "visitor_team": {
            "id": game.get("visitor_team_id", 0),
            "abbreviation": game.get("visitor_team_abbreviation", "N/A"),
            "full_name": game.get("visitor_team_name", ""),
            "city": "",
            "conference": "Unknown",
            "division": "Unknown"
        },
        "home_team_score": game.get("pts_home", None),
        "visitor_team_score": game.get("pts_away", None)
    }


@retry_with_backoff(max_retries=1)
async def fetch_recent_games_from_api(limit: int = 6):
    """Fetch recent games from nba_api"""
    try:
        from nba_api.stats.endpoints import ScoreboardV3

        games = []
        today = datetime.utcnow().date()

        for day_offset in range(14):
            game_date = (today - timedelta(days=day_offset)).strftime("%Y-%m-%d")
            scoreboard = ScoreboardV3(game_date=game_date, timeout=10)
            game_headers = scoreboard.game_header.get_data_frame()
            line_scores = scoreboard.line_score.get_data_frame()

            if game_headers.empty or line_scores.empty:
                continue

            for _, header in game_headers.iterrows():
                game = transform_scoreboard_v3_game(header.to_dict(), line_scores)
                if game:
                    games.append(game)
                if len(games) >= limit:
                    return games
        
        return games
    except RateLimitError:
        raise
    except APIError:
        raise
    except Exception as e:
        raise APIError(f"Failed to fetch recent games: {str(e)}")


async def fetch_recent_games_from_espn(limit: int = 6):
    """Fetch recent games from ESPN as a secondary source."""
    try:
        games = []
        today = datetime.utcnow().date()

        for day_offset in range(14):
            game_date = (today - timedelta(days=day_offset)).strftime("%Y%m%d")
            response = requests.get(
                "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
                params={"dates": game_date},
                timeout=10
            )

            if response.status_code == 429:
                raise RateLimitError("ESPN rate limit exceeded")
            if response.status_code >= 400:
                raise APIError(f"ESPN scoreboard error ({response.status_code}): {response.text[:200]}")

            payload = response.json()
            for event in payload.get("events", []):
                game = transform_espn_game(event)
                if game:
                    games.append(game)
                if len(games) >= limit:
                    return games

        return games
    except (RateLimitError, APIError):
        raise
    except Exception as e:
        raise APIError(f"Failed to fetch ESPN recent games: {str(e)}")


async def fetch_schedule_games_from_api(start_date: str, end_date: str, limit: int = 40):
    """Fetch schedule games from nba_api"""
    try:
        from nba_api.stats.endpoints import ScoreboardV3

        games = []
        current_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()

        while current_date <= end_date_obj and len(games) < limit:
            date_string = current_date.strftime("%Y-%m-%d")
            scoreboard = ScoreboardV3(game_date=date_string, timeout=10)
            game_headers = scoreboard.game_header.get_data_frame()
            line_scores = scoreboard.line_score.get_data_frame()

            if not game_headers.empty and not line_scores.empty:
                for _, header in game_headers.iterrows():
                    if len(games) >= limit:
                        break
                    game = transform_scoreboard_v3_game(header.to_dict(), line_scores)
                    if game:
                        games.append(game)

            current_date += timedelta(days=1)

        return games
    except Exception as e:
        raise APIError(f"Failed to fetch schedule from nba_api: {str(e)}")


async def fetch_schedule_games_from_espn(start_date: str, end_date: str, limit: int = 40):
    """Fetch schedule games from ESPN as a secondary source."""
    try:
        games = []
        current_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()

        while current_date <= end_date_obj and len(games) < limit:
            game_date = current_date.strftime("%Y%m%d")
            response = requests.get(
                "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
                params={"dates": game_date},
                timeout=10
            )

            if response.status_code == 429:
                raise RateLimitError("ESPN rate limit exceeded")
            if response.status_code >= 400:
                raise APIError(f"ESPN scoreboard error ({response.status_code}): {response.text[:200]}")

            payload = response.json()
            for event in payload.get("events", []):
                if len(games) >= limit:
                    break
                game = transform_espn_game(event)
                if game:
                    games.append(game)

            current_date += timedelta(days=1)

        return games
    except (RateLimitError, APIError):
        raise
    except Exception as e:
        raise APIError(f"Failed to fetch ESPN schedule games: {str(e)}")


@router.get("/recent", response_model=GameList)
async def get_recent_games(limit: int = Query(6, ge=1, le=30)):
    """Get recent NBA games (cached for 15 minutes)"""
    endpoint = "games:recent"
    params = {"limit": limit}
    
    # Check cache
    cached = cache_manager.get(endpoint, params)
    if cached:
        log_cache_hit(endpoint, True)
        return {"data": cached, "total": len(cached)}
    
    log_cache_hit(endpoint, False)
    
    games = []
    primary_error = None
    fallback_error = None

    try:
        games = await fetch_recent_games_from_api(limit)
        if not games:
            primary_error = APIError("nba_api returned no recent games")
    except (APIError, RateLimitError) as e:
        primary_error = e
        logger.warning(f"nba_api recent games unavailable, trying ESPN fallback: {str(e)}")
    except Exception as e:
        primary_error = e
        logger.warning(f"nba_api recent games error, trying ESPN fallback: {str(e)}")

    if not games:
        try:
            games = await fetch_recent_games_from_espn(limit)
        except (APIError, RateLimitError) as e:
            fallback_error = e
            logger.error(f"ESPN fallback also failed: {str(e)}")
        except Exception as e:
            fallback_error = e
            logger.error(f"ESPN fallback also failed with error: {str(e)}")

    if games:
        cache_manager.set(endpoint, games, CACHE_TTL["recent_games"], params)
        stale_cache[endpoint] = games
        return {"data": games, "total": len(games)}

    # Try to return stale cache
    if endpoint in stale_cache:
        return {"data": stale_cache[endpoint], "total": len(stale_cache[endpoint])}

    detail = primary_error or fallback_error or APIError("No recent games found")
    raise HTTPException(status_code=503, detail=f"Service unavailable: {str(detail)}")


@router.get("/schedule")
async def get_schedule(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    limit: int = Query(40, ge=1, le=100)
):
    """Get games in date range (cached for 30 minutes)"""
    endpoint = "games:schedule"
    params = {"start_date": start_date, "end_date": end_date, "limit": limit}
    
    # Validate dates
    try:
        datetime.strptime(start_date, "%Y-%m-%d")
        datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format (use YYYY-MM-DD)")
    
    # Check cache
    cached = cache_manager.get(endpoint, params)
    if cached:
        log_cache_hit(endpoint, True)
        return {"data": cached, "total": len(cached)}
    
    log_cache_hit(endpoint, False)
    
    games = []
    primary_error = None
    fallback_error = None

    # Try nba_api first
    try:
        games = await fetch_schedule_games_from_api(start_date, end_date, limit)
        if not games:
            primary_error = APIError("nba_api returned no schedule games")
    except (APIError, RateLimitError) as e:
        primary_error = e
        logger.warning(f"nba_api schedule unavailable, trying ESPN fallback: {str(e)}")
    except Exception as e:
        primary_error = e
        logger.warning(f"nba_api schedule error, trying ESPN fallback: {str(e)}")

    # If nba_api failed or returned no games, try ESPN
    if not games:
        try:
            games = await fetch_schedule_games_from_espn(start_date, end_date, limit)
        except (APIError, RateLimitError) as e:
            fallback_error = e
            logger.error(f"ESPN fallback also failed: {str(e)}")
        except Exception as e:
            fallback_error = e
            logger.error(f"ESPN fallback also failed with error: {str(e)}")

    if games:
        cache_manager.set(endpoint, games, CACHE_TTL["schedules"], params)
        stale_cache[endpoint] = games
        return {"data": games, "total": len(games)}

    # Try to return stale cache
    if endpoint in stale_cache:
        return {"data": stale_cache[endpoint], "total": len(stale_cache[endpoint])}

    # Return empty list as last resort
    return {"data": [], "total": 0}


@router.get("/team/{team_id}")
async def get_team_games(
    team_id: int,
    limit: int = Query(8, ge=1, le=30)
):
    """Get recent games for a specific team (cached for 30 minutes)"""
    endpoint = f"games:team:{team_id}"
    params = {"team_id": team_id, "limit": limit}
    
    # Check cache
    cached = cache_manager.get(endpoint, params)
    if cached:
        log_cache_hit(endpoint, True)
        return {"data": cached, "total": len(cached)}
    
    log_cache_hit(endpoint, False)
    
    try:
        from nba_api.stats.endpoints import TeamGameLog
        
        game_log = TeamGameLog(team_id=team_id, season="2024")
        games_data = game_log.get_data_frames()[0]
        
        games = []
        for _, game in games_data.head(limit).iterrows():
            games.append(transform_nba_game(game.to_dict()))
        
        # Store in cache
        cache_manager.set(endpoint, games, CACHE_TTL["team_games"], params)
        stale_cache[endpoint] = games
        
        return {"data": games, "total": len(games)}
    
    except (APIError, RateLimitError) as e:
        logger.error(f"Error fetching team games: {str(e)}")
        
        # Try to return stale cache
        if endpoint in stale_cache:
            return {"data": stale_cache[endpoint], "total": len(stale_cache[endpoint])}
        
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")
