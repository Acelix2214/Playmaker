"""
Team endpoints - all teams, individual team details
"""
from fastapi import APIRouter, HTTPException
import logging
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from cache import cache_manager
from config import CACHE_TTL
from models import TeamList, Team
from utils import retry_with_backoff, APIError, RateLimitError, log_cache_hit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/teams", tags=["teams"])

# Store for stale cache fallback
stale_cache = {}

# Team metadata
TEAM_DATA = {
    1: {"abbreviation": "ATL", "name": "Hawks", "city": "Atlanta", "conference": "East", "division": "Southeast"},
    2: {"abbreviation": "BOS", "name": "Celtics", "city": "Boston", "conference": "East", "division": "Atlantic"},
    3: {"abbreviation": "BKN", "name": "Nets", "city": "Brooklyn", "conference": "East", "division": "Atlantic"},
    4: {"abbreviation": "CHA", "name": "Hornets", "city": "Charlotte", "conference": "East", "division": "Southeast"},
    5: {"abbreviation": "CHI", "name": "Bulls", "city": "Chicago", "conference": "East", "division": "Central"},
    6: {"abbreviation": "CLE", "name": "Cavaliers", "city": "Cleveland", "conference": "East", "division": "Central"},
    7: {"abbreviation": "DAL", "name": "Mavericks", "city": "Dallas", "conference": "West", "division": "Southwest"},
    8: {"abbreviation": "DEN", "name": "Nuggets", "city": "Denver", "conference": "West", "division": "Northwest"},
    9: {"abbreviation": "DET", "name": "Pistons", "city": "Detroit", "conference": "East", "division": "Central"},
    10: {"abbreviation": "GSW", "name": "Warriors", "city": "Golden State", "conference": "West", "division": "Pacific"},
    11: {"abbreviation": "HOU", "name": "Rockets", "city": "Houston", "conference": "West", "division": "Southwest"},
    12: {"abbreviation": "IND", "name": "Pacers", "city": "Indiana", "conference": "East", "division": "Central"},
    13: {"abbreviation": "LAC", "name": "Clippers", "city": "Los Angeles", "conference": "West", "division": "Pacific"},
    14: {"abbreviation": "LAL", "name": "Lakers", "city": "Los Angeles", "conference": "West", "division": "Pacific"},
    15: {"abbreviation": "MEM", "name": "Grizzlies", "city": "Memphis", "conference": "West", "division": "Southwest"},
    16: {"abbreviation": "MIA", "name": "Heat", "city": "Miami", "conference": "East", "division": "Southeast"},
    17: {"abbreviation": "MIL", "name": "Bucks", "city": "Milwaukee", "conference": "East", "division": "Central"},
    18: {"abbreviation": "MIN", "name": "Timberwolves", "city": "Minnesota", "conference": "West", "division": "Northwest"},
    19: {"abbreviation": "NOP", "name": "Pelicans", "city": "New Orleans", "conference": "West", "division": "Southwest"},
    20: {"abbreviation": "NYK", "name": "Knicks", "city": "New York", "conference": "East", "division": "Atlantic"},
    21: {"abbreviation": "OKC", "name": "Thunder", "city": "Oklahoma City", "conference": "West", "division": "Southwest"},
    22: {"abbreviation": "ORL", "name": "Magic", "city": "Orlando", "conference": "East", "division": "Southeast"},
    23: {"abbreviation": "PHI", "name": "76ers", "city": "Philadelphia", "conference": "East", "division": "Atlantic"},
    24: {"abbreviation": "PHX", "name": "Suns", "city": "Phoenix", "conference": "West", "division": "Pacific"},
    25: {"abbreviation": "POR", "name": "Trail Blazers", "city": "Portland", "conference": "West", "division": "Northwest"},
    26: {"abbreviation": "SAC", "name": "Kings", "city": "Sacramento", "conference": "West", "division": "Pacific"},
    27: {"abbreviation": "SAS", "name": "Spurs", "city": "San Antonio", "conference": "West", "division": "Southwest"},
    28: {"abbreviation": "TOR", "name": "Raptors", "city": "Toronto", "conference": "East", "division": "Atlantic"},
    29: {"abbreviation": "UTA", "name": "Jazz", "city": "Utah", "conference": "West", "division": "Northwest"},
    30: {"abbreviation": "WAS", "name": "Wizards", "city": "Washington", "conference": "East", "division": "Southeast"},
}


def get_team_logo_url(team_id: int) -> str:
    """Get NBA team logo URL from CDN"""
    return f"https://cdn.nba.com/logos/nba/{1610612736 + team_id}/primary/L/logo.svg"


def format_team(team_id: int) -> Team:
    """Format team data with metadata"""
    data = TEAM_DATA.get(team_id, {})
    return {
        "id": team_id,
        "abbreviation": data.get("abbreviation", "N/A"),
        "full_name": f"{data.get('city', '')} {data.get('name', '')}".strip(),
        "city": data.get("city", ""),
        "conference": data.get("conference", "Unknown"),
        "division": data.get("division", "Unknown"),
        "logo_url": get_team_logo_url(team_id)
    }


@retry_with_backoff()
async def fetch_teams_from_api():
    """Fetch all teams from nba_api"""
    try:
        from nba_api.stats.static import teams
        
        teams_data = teams.get_teams()
        formatted = []
        for team in teams_data:
            formatted.append(format_team(team["id"]))
        
        return formatted
    except RateLimitError:
        raise
    except APIError:
        raise
    except Exception as e:
        raise APIError(f"Failed to fetch teams: {str(e)}")


@router.get("", response_model=TeamList)
async def get_all_teams():
    """Get all NBA teams (cached for 1 hour)"""
    endpoint = "teams:all"
    
    # Check cache
    cached = cache_manager.get(endpoint)
    if cached:
        log_cache_hit(endpoint, True)
        return {"data": cached, "total": len(cached)}
    
    log_cache_hit(endpoint, False)
    
    try:
        teams_list = await fetch_teams_from_api()
        
        # Store in cache
        cache_manager.set(endpoint, teams_list, CACHE_TTL["teams"])
        stale_cache[endpoint] = teams_list
        
        return {"data": teams_list, "total": len(teams_list)}
    
    except (APIError, RateLimitError) as e:
        logger.error(f"Error fetching teams: {str(e)}")
        
        # Try to return stale cache
        if endpoint in stale_cache:
            return {"data": stale_cache[endpoint], "total": len(stale_cache[endpoint])}
        
        # Fallback to hardcoded teams
        fallback_teams = [format_team(i) for i in range(1, 31)]
        cache_manager.set(endpoint, fallback_teams, CACHE_TTL["teams"])
        return {"data": fallback_teams, "total": len(fallback_teams)}


@router.get("/{team_id}")
async def get_team_details(team_id: int):
    """Get details for a specific team"""
    if team_id < 1 or team_id > 30:
        raise HTTPException(status_code=404, detail="Team not found")
    
    endpoint = f"teams:{team_id}"
    
    # Check cache
    cached = cache_manager.get(endpoint)
    if cached:
        log_cache_hit(endpoint, True)
        return cached
    
    log_cache_hit(endpoint, False)
    
    # Get team data (always available locally)
    team = format_team(team_id)
    cache_manager.set(endpoint, team, CACHE_TTL["teams"])
    
    return team
