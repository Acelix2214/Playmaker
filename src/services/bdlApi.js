const BASE_URL = 'https://api.balldontlie.io/v1'

function headers() {
  return { Authorization: import.meta.env.VITE_BDL_API_KEY || '' }
}

async function bdlFetch(path, params = {}) {
  const query = new URLSearchParams(params).toString()
  const url = `${BASE_URL}${path}${query ? '?' + query : ''}`
  const res = await fetch(url, { headers: headers() })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`BDL ${res.status}: ${text || res.statusText}`)
  }
  return res.json()
}

/** Recent NBA games — defaults to last 30 days of the current season */
export async function getRecentGames(perPage = 6) {
  const end = new Date()
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  const fmt = d => d.toISOString().split('T')[0]
  return bdlFetch('/games', {
    start_date: fmt(start),
    end_date: fmt(end),
    per_page: perPage,
    'seasons[]': 2025,
  })
}

/** All NBA teams */
export async function getTeams() {
  return bdlFetch('/teams', { per_page: 30 })
}

/** Search players by name */
export async function searchPlayers(query, perPage = 6) {
  return bdlFetch('/players', { search: query, per_page: perPage })
}

/** Paginated player list (optionally filtered by search) */
export async function getPlayers(search = '', perPage = 24, cursor = null) {
  const params = { per_page: perPage }
  if (search.trim()) params.search = search.trim()
  if (cursor) params.cursor = cursor
  return bdlFetch('/players', params)
}

/** Games in a date range for the schedule view */
export async function getScheduleGames(startDate, endDate, perPage = 40) {
  return bdlFetch('/games', {
    start_date: startDate,
    end_date: endDate,
    per_page: perPage,
    'seasons[]': 2025,
  })
}

/** Recent games for a specific team */
export async function getTeamGames(teamId, perPage = 8) {
  const end = new Date()
  const start = new Date(end.getTime() - 60 * 24 * 60 * 60 * 1000)
  const fmt = d => d.toISOString().split('T')[0]
  return bdlFetch('/games', {
    'team_ids[]': teamId,
    start_date: fmt(start),
    end_date: fmt(end),
    per_page: perPage,
    'seasons[]': 2025,
  })
}
