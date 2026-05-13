"""
Player endpoints - player list, search, stats
"""
from fastapi import APIRouter, Query, HTTPException
import logging
from typing import Optional
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from cache import cache_manager
from config import CACHE_TTL
from models import PlayerList, Player
from utils import retry_with_backoff, APIError, RateLimitError, log_cache_hit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/players", tags=["players"])

# Store for stale cache fallback
stale_cache = {}


def player_image_url(player_id) -> str:
    """Official NBA CDN headshot URL generated from the nba_api player ID."""
    return f"https://cdn.nba.com/headshots/nba/latest/1040x760/{player_id}.png"


def split_player_name(full_name: str) -> tuple[str, str]:
    parts = (full_name or "").strip().split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def clean_optional(value):
    if value is None or value == "" or value == "None":
        return None
    try:
        if value != value:  # NaN
            return None
    except TypeError:
        pass
    text = str(value).strip()
    if not text:
        return None
    if text.endswith(".0") and text[:-2].isdigit():
        return text[:-2]
    return text


def clean_int(value):
    cleaned = clean_optional(value)
    if cleaned is None:
        return None
    try:
        return int(float(cleaned))
    except (TypeError, ValueError):
        return None


def format_static_player(player_data) -> Player:
    """Format player data from nba_api static fallback."""
    player_id = str(player_data.get("id", ""))
    return {
        "id": player_id,
        "first_name": player_data.get("first_name", ""),
        "last_name": player_data.get("last_name", ""),
        "position": player_data.get("position", "N/A"),
        "team": {
            "id": player_data.get("team_id", 0),
            "abbreviation": player_data.get("team_abbreviation", "N/A"),
            "full_name": player_data.get("team_name", ""),
            "city": "",
            "conference": "Unknown",
            "division": "Unknown"
        },
        "height": player_data.get("height", None),
        "weight": player_data.get("weight", None),
        "jersey_number": None,
        "college": None,
        "country": None,
        "draft_year": None,
        "draft_round": None,
        "draft_number": None,
        "image_url": player_image_url(player_id) if player_id else None
    }


def format_player_index(player_data) -> Player:
    """Format PlayerIndex rows from nba_api."""
    player_id = str(player_data.get("PERSON_ID", ""))
    first_name = player_data.get("PLAYER_FIRST_NAME") or ""
    last_name = player_data.get("PLAYER_LAST_NAME") or ""
    team_city = player_data.get("TEAM_CITY") or ""
    team_name = player_data.get("TEAM_NAME") or ""

    return {
        "id": player_id,
        "first_name": first_name,
        "last_name": last_name,
        "position": player_data.get("POSITION") or "N/A",
        "team": {
            "id": player_data.get("TEAM_ID", 0) or 0,
            "abbreviation": player_data.get("TEAM_ABBREVIATION") or "N/A",
            "full_name": f"{team_city} {team_name}".strip(),
            "city": team_city,
            "conference": "Unknown",
            "division": "Unknown"
        },
        "height": clean_optional(player_data.get("HEIGHT")),
        "weight": clean_int(player_data.get("WEIGHT")),
        "jersey_number": clean_optional(player_data.get("JERSEY_NUMBER")),
        "college": clean_optional(player_data.get("COLLEGE")),
        "country": clean_optional(player_data.get("COUNTRY")),
        "draft_year": clean_optional(player_data.get("DRAFT_YEAR")),
        "draft_round": clean_optional(player_data.get("DRAFT_ROUND")),
        "draft_number": clean_optional(player_data.get("DRAFT_NUMBER")),
        "image_url": player_image_url(player_id) if player_id else None
    }


def format_common_player(player_data) -> Player:
    """Format CommonAllPlayers rows from nba_api fallback."""
    player_id = str(player_data.get("PERSON_ID", ""))
    first_name, last_name = split_player_name(player_data.get("DISPLAY_FIRST_LAST", ""))
    team_city = player_data.get("TEAM_CITY") or ""
    team_name = player_data.get("TEAM_NAME") or ""

    return {
        "id": player_id,
        "first_name": first_name,
        "last_name": last_name,
        "position": "N/A",
        "team": {
            "id": player_data.get("TEAM_ID", 0) or 0,
            "abbreviation": player_data.get("TEAM_ABBREVIATION") or "N/A",
            "full_name": f"{team_city} {team_name}".strip(),
            "city": team_city,
            "conference": "Unknown",
            "division": "Unknown"
        },
        "height": None,
        "weight": None,
        "jersey_number": None,
        "college": None,
        "country": None,
        "draft_year": None,
        "draft_round": None,
        "draft_number": None,
        "image_url": player_image_url(player_id) if player_id else None
    }


@retry_with_backoff()
async def fetch_all_players():
    """Fetch all current NBA players from nba_api."""
    try:
        from nba_api.stats.endpoints import PlayerIndex

        player_index = PlayerIndex(active_nullable="1", timeout=60)
        players_data = player_index.player_index.get_data_frame()

        return [
            format_player_index(player)
            for player in players_data.to_dict("records")
            if player.get("PERSON_ID")
        ]
    except Exception as e:
        logger.warning(f"PlayerIndex failed, using CommonAllPlayers fallback: {str(e)}")

    try:
        from nba_api.stats.endpoints import CommonAllPlayers

        all_players = CommonAllPlayers(is_only_current_season=1, timeout=10)
        players_data = all_players.common_all_players.get_data_frame()

        formatted = [
            format_common_player(player)
            for player in players_data.to_dict("records")
            if player.get("PERSON_ID")
        ]

        return formatted
    except RateLimitError:
        raise
    except APIError:
        raise
    except Exception as e:
        logger.warning(f"CommonAllPlayers failed, using static player fallback: {str(e)}")
        try:
            from nba_api.stats.static import players
            return [format_static_player(player) for player in players.get_active_players()]
        except Exception as fallback_error:
            raise APIError(f"Failed to fetch players: {str(fallback_error)}")


@retry_with_backoff()
async def search_players_api(query: str, limit: int = 6):
    """Search players by name from nba_api"""
    try:
        all_players = await fetch_all_players()
        query_lower = query.lower()
        
        results = []
        for player in all_players:
            full_name = f"{player.get('first_name', '')} {player.get('last_name', '')}".lower()
            if query_lower in full_name:
                results.append(player)
                if len(results) >= limit:
                    break
        
        return results
    except RateLimitError:
        raise
    except APIError:
        raise
    except Exception as e:
        raise APIError(f"Failed to search players: {str(e)}")


@router.get("", response_model=PlayerList)
async def get_players(
    search: Optional[str] = Query(None, description="Search query"),
    limit: int = Query(24, ge=1, le=100),
    page: int = Query(0, ge=0)
):
    """Get paginated player list, optionally filtered by search (cached)"""
    
    if search and search.strip():
        # Search endpoint
        endpoint = "players:search"
        params = {"search": search.strip(), "limit": limit}
        
        # Check cache
        cached = cache_manager.get(endpoint, params)
        if cached:
            log_cache_hit(endpoint, True)
            if isinstance(cached, dict):
                return cached
            return {"data": cached, "total": len(cached)}
        
        log_cache_hit(endpoint, False)
        
        try:
            players_list = await search_players_api(search.strip(), limit)
            response = {"data": players_list, "total": len(players_list), "next_cursor": None}
            
            # Store in cache
            cache_manager.set(endpoint, response, CACHE_TTL["search"], params)
            stale_cache[endpoint] = response
            
            return response
        
        except (APIError, RateLimitError) as e:
            logger.error(f"Error searching players: {str(e)}")
            
            # Try to return stale cache
            if endpoint in stale_cache:
                return stale_cache[endpoint]
            
            raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")
    
    else:
        # Regular paginated list
        endpoint = "players:list"
        params = {"limit": limit, "page": page}
        
        # Check cache
        cached = cache_manager.get(endpoint, params)
        if cached:
            log_cache_hit(endpoint, True)
            if isinstance(cached, dict):
                return cached
            return {"data": cached, "total": len(cached)}
        
        log_cache_hit(endpoint, False)
        
        try:
            players_list = await fetch_all_players()
            
            # Apply pagination
            start = page * limit
            end = start + limit
            paginated = players_list[start:end]
            response = {
                "data": paginated,
                "total": len(players_list),
                "next_cursor": str(page + 1) if end < len(players_list) else None
            }
            
            # Store in cache
            cache_manager.set(endpoint, response, CACHE_TTL["player_list"], params)
            stale_cache[endpoint] = response
            
            return response
        
        except (APIError, RateLimitError) as e:
            logger.error(f"Error fetching players: {str(e)}")
            
            # Try to return stale cache
            if endpoint in stale_cache:
                return stale_cache[endpoint]
            
            raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")


@router.get("/{player_id}/stats")
async def get_player_stats(player_id: str):
    """Get individual player stats (cached for 1 hour)"""
    endpoint = f"players:stats:{player_id}"
    
    # Check cache
    cached = cache_manager.get(endpoint)
    if cached:
        log_cache_hit(endpoint, True)
        return cached
    
    log_cache_hit(endpoint, False)
    
    try:
        from nba_api.stats.endpoints import PlayerCareerStats
        
        # Convert player_id to int for API
        player_id_int = int(player_id)
        career = PlayerCareerStats(player_id=player_id_int)
        
        # Get season totals
        season_stats = career.get_data_frames()[0]
        
        if season_stats.empty:
            raise HTTPException(status_code=404, detail="Player stats not found")
        
        # Format stats
        stats_dict = season_stats.to_dict('records')[0]
        
        cache_manager.set(endpoint, stats_dict, CACHE_TTL["player_stats"])
        stale_cache[endpoint] = stats_dict
        
        return stats_dict
    
    except (APIError, RateLimitError) as e:
        logger.error(f"Error fetching player stats: {str(e)}")
        
        # Try to return stale cache
        if endpoint in stale_cache:
            return stale_cache[endpoint]
        
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid player ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")
