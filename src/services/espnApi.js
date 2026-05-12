/**
 * ESPN NBA API Service
 * Base URLs:
 * - v2: https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/
 * - v3: https://sports.core.api.espn.com/v3/sports/basketball/leagues/nba/
 * - Site API: https://site.api.espn.com/apis/site/v2/sports/basketball/nba/
 */

const BASE_V2 = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba'
const BASE_V3 = 'https://sports.core.api.espn.com/v3/sports/basketball/leagues/nba'
const SITE_API = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba'

async function espnFetch(url) {
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ESPN ${res.status}: ${text || res.statusText}`)
  }
  return res.json()
}

// ────────────────────────────────────────────────────────────────────────────────
// SCOREBOARD & GAMES
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Get NBA scoreboard for a specific date (or today's games)
 * Returns detailed game data including scores, stats, player leaders, headshots
 * @param {string} [date] - Format: YYYYMMDD (e.g., '20260512') or omit for today
 */
export async function getScoreboard(date) {
  const url = date
    ? `${SITE_API}/scoreboard?dates=${date}`
    : `${SITE_API}/scoreboard`
  return espnFetch(url)
}

/**
 * Get all NBA events/games
 * @param {number} [limit=50] - Max number of events to return
 */
export async function getEvents(limit = 50) {
  return espnFetch(`${BASE_V2}/events?limit=${limit}`)
}

/**
 * Get details for a specific game/event
 * @param {string} eventId - ESPN event ID (e.g., '401871336')
 */
export async function getEvent(eventId) {
  return espnFetch(`${BASE_V2}/events/${eventId}`)
}

/**
 * Get boxscore details for a specific game
 * @param {string} eventId - ESPN event ID
 */
export async function getBoxscore(eventId) {
  return espnFetch(`${BASE_V2}/events/${eventId}/competitions/${eventId}/boxscore`)
}

// ────────────────────────────────────────────────────────────────────────────────
// TEAMS
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Get all NBA teams for a season
 * @param {number} [season=2026] - NBA season year
 */
export async function getTeams(season = 2026) {
  return espnFetch(`${BASE_V2}/seasons/${season}/teams?limit=30`)
}

/**
 * Get detailed information for a specific team
 * @param {string} teamId - ESPN team ID (e.g., '5' for Cleveland Cavaliers)
 * @param {number} [season=2026] - NBA season year
 */
export async function getTeam(teamId, season = 2026) {
  return espnFetch(`${BASE_V2}/seasons/${season}/teams/${teamId}`)
}

/**
 * Get team roster
 * @param {string} teamId - ESPN team ID
 * @param {number} [season=2026] - NBA season year
 */
export async function getTeamRoster(teamId, season = 2026) {
  return espnFetch(`${BASE_V2}/seasons/${season}/teams/${teamId}/athletes`)
}

/**
 * Get team statistics
 * @param {string} teamId - ESPN team ID
 * @param {number} [season=2026] - NBA season year
 */
export async function getTeamStats(teamId, season = 2026) {
  return espnFetch(`${BASE_V2}/seasons/${season}/teams/${teamId}/statistics`)
}

/**
 * Get team schedule
 * @param {string} teamId - ESPN team ID
 * @param {number} [season=2026] - NBA season year
 */
export async function getTeamSchedule(teamId, season = 2026) {
  return espnFetch(`${BASE_V2}/seasons/${season}/teams/${teamId}/events`)
}

// ────────────────────────────────────────────────────────────────────────────────
// PLAYERS / ATHLETES
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Get all NBA athletes/players
 * @param {number} [limit=100] - Max number of players to return
 * @param {number} [season=2026] - NBA season year
 */
export async function getAthletes(limit = 100, season = 2026) {
  return espnFetch(`${BASE_V2}/seasons/${season}/athletes?limit=${limit}`)
}

/**
 * Get detailed information for a specific player/athlete
 * @param {string} athleteId - ESPN athlete ID (e.g., '3908809' for Donovan Mitchell)
 */
export async function getAthlete(athleteId) {
  return espnFetch(`${BASE_V2}/athletes/${athleteId}`)
}

/**
 * Get player statistics
 * @param {string} athleteId - ESPN athlete ID
 */
export async function getAthleteStats(athleteId) {
  return espnFetch(`${BASE_V2}/athletes/${athleteId}/statistics`)
}

/**
 * Get player headshot URL
 * @param {string} athleteId - ESPN athlete ID
 * @returns {string} Direct URL to player headshot image
 */
export function getAthleteHeadshot(athleteId) {
  return `https://a.espncdn.com/i/headshots/nba/players/full/${athleteId}.png`
}

// ────────────────────────────────────────────────────────────────────────────────
// STANDINGS
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Get NBA standings for a season type
 * @param {number} [season=2026] - NBA season year
 * @param {number} [type=2] - Season type: 1=Preseason, 2=Regular, 3=Postseason, 4=Off, 5=Play-In
 */
export async function getStandings(season = 2026, type = 2) {
  return espnFetch(`${BASE_V2}/seasons/${season}/types/${type}/standings`)
}

/**
 * Get groups (divisions/conferences) with standings
 * @param {number} [season=2026] - NBA season year
 * @param {number} [type=2] - Season type
 */
export async function getGroups(season = 2026, type = 2) {
  return espnFetch(`${BASE_V2}/seasons/${season}/types/${type}/groups`)
}

// ────────────────────────────────────────────────────────────────────────────────
// STATS & LEADERS
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Get statistical leaders (scoring, rebounds, assists, etc.)
 * @param {number} [season=2026] - NBA season year
 * @param {number} [type=2] - Season type
 */
export async function getLeaders(season = 2026, type = 2) {
  return espnFetch(`${BASE_V2}/seasons/${season}/types/${type}/leaders`)
}

/**
 * Get league-wide leaders
 */
export async function getLeagueLeaders() {
  return espnFetch(`${BASE_V2}/leaders`)
}

// ────────────────────────────────────────────────────────────────────────────────
// RANKINGS & POWER INDEX
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Get team rankings
 */
export async function getRankings() {
  return espnFetch(`${BASE_V2}/rankings`)
}

/**
 * Get power index (team performance metrics)
 * @param {number} [season=2026] - NBA season year
 */
export async function getPowerIndex(season = 2026) {
  return espnFetch(`${BASE_V2}/seasons/${season}/powerindex`)
}

// ────────────────────────────────────────────────────────────────────────────────
// TRANSACTIONS & NEWS
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Get NBA transactions (trades, signings, releases)
 * @param {number} [limit=20] - Max number of transactions
 */
export async function getTransactions(limit = 20) {
  return espnFetch(`${BASE_V2}/transactions?limit=${limit}`)
}

/**
 * Get NBA news articles
 * @param {number} [limit=10] - Max number of articles
 */
export async function getNews(limit = 10) {
  return espnFetch(`${BASE_V2}/news?limit=${limit}`)
}

// ────────────────────────────────────────────────────────────────────────────────
// SEASON & CALENDAR
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Get NBA calendar (all game dates for the season)
 */
export async function getCalendar() {
  return espnFetch(`${BASE_V2}/calendar`)
}

/**
 * Get season information
 * @param {number} [season=2026] - NBA season year
 */
export async function getSeason(season = 2026) {
  return espnFetch(`${BASE_V2}/seasons/${season}`)
}

/**
 * Get all available seasons
 */
export async function getSeasons() {
  return espnFetch(`${BASE_V2}/seasons`)
}

// ────────────────────────────────────────────────────────────────────────────────
// COACHES & AWARDS
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Get coaches for a season
 * @param {number} [season=2026] - NBA season year
 */
export async function getCoaches(season = 2026) {
  return espnFetch(`${BASE_V2}/seasons/${season}/coaches`)
}

/**
 * Get awards for a season
 * @param {number} [season=2026] - NBA season year
 */
export async function getAwards(season = 2026) {
  return espnFetch(`${BASE_V2}/seasons/${season}/awards`)
}

/**
 * Get draft information
 * @param {number} [season=2026] - NBA season year
 */
export async function getDraft(season = 2026) {
  return espnFetch(`${BASE_V2}/seasons/${season}/draft`)
}
