/**
 * Backend API service - Frontend communicates only with backend
 * Backend handles all external API calls and caching
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000/api'

// Request timeout
const TIMEOUT = 10000 // 10 seconds

async function backendFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Backend ${res.status}: ${text || res.statusText}`)
    }

    return res.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Recent NBA games — defaults to last 7 days
 */
export async function getRecentGames(perPage = 6) {
  try {
    const data = await backendFetch(`/games/recent?limit=${perPage}`)
    return {
      data: data.data || [],
      meta: { total: data.total || 0 },
    }
  } catch (err) {
    throw new Error(`Failed to fetch games: ${err.message}`)
  }
}

/**
 * Games in a date range for the schedule view
 */
export async function getScheduleGames(startDate, endDate, perPage = 40) {
  try {
    const data = await backendFetch(
      `/games/schedule?start_date=${startDate}&end_date=${endDate}&limit=${perPage}`
    )
    return {
      data: data.data || [],
      meta: { total: data.total || 0 },
    }
  } catch (err) {
    throw new Error(`Failed to fetch schedule: ${err.message}`)
  }
}

/**
 * Recent games for a specific team
 */
export async function getTeamGames(teamId, perPage = 8) {
  try {
    const data = await backendFetch(`/games/team/${teamId}?limit=${perPage}`)
    return {
      data: data.data || [],
      meta: { total: data.total || 0 },
    }
  } catch (err) {
    throw new Error(`Failed to fetch team games: ${err.message}`)
  }
}

/**
 * All NBA teams
 */
export async function getTeams() {
  try {
    const data = await backendFetch('/teams')
    return {
      data: data.data || [],
      meta: { total: data.total || 0 },
    }
  } catch (err) {
    throw new Error(`Failed to fetch teams: ${err.message}`)
  }
}

/**
 * Search players by name
 */
export async function searchPlayers(query, perPage = 6) {
  try {
    const encodedQuery = encodeURIComponent(query.trim())
    const data = await backendFetch(`/players?search=${encodedQuery}&limit=${perPage}`)
    return {
      data: data.data || [],
      meta: { total: data.total || 0 },
    }
  } catch (err) {
    throw new Error(`Failed to search players: ${err.message}`)
  }
}

/**
 * Paginated player list (optionally filtered by search)
 */
export async function getPlayers(search = '', perPage = 24, cursor = null) {
  try {
    const page = cursor ? parseInt(cursor) : 0
    let url = `/players?limit=${perPage}&page=${page}`

    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`
    }

    const data = await backendFetch(url)
    return {
      data: data.data || [],
      meta: {
        total: data.total || 0,
        next_cursor: data.next_cursor || null,
      },
    }
  } catch (err) {
    throw new Error(`Failed to fetch players: ${err.message}`)
  }
}

/**
 * Individual player stats
 */
export async function getPlayerStats(playerId) {
  try {
    const data = await backendFetch(`/players/${playerId}/stats`)
    return data
  } catch (err) {
    throw new Error(`Failed to fetch player stats: ${err.message}`)
  }
}

/**
 * Health check - returns cache statistics
 */
export async function getHealth() {
  try {
    const data = await backendFetch('/health')
    return data
  } catch (err) {
    console.error('Health check failed:', err.message)
    return null
  }
}
