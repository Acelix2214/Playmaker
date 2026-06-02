/**
 * Backend API service - Frontend communicates only with backend
 * Backend handles all external API calls and caching
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000/api'
const BACKEND_ROOT = import.meta.env.VITE_BACKEND_URL?.replace('/api', '') || 'http://localhost:8000'

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

// Helper for auth endpoints (different base URL)
async function authFetch(path, options = {}) {
  const url = `${BACKEND_ROOT}${path}`
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
      throw new Error(`Auth ${res.status}: ${text || res.statusText}`)
    }

    return res.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * User signup - creates account and returns JWT token
 */
export async function signup(email, fullName, password) {
  try {
    const data = await authFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, username: fullName, password }),
    })
    
    // Store token and user info in localStorage
    if (data.access_token) {
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify({
        id: data.user_id,
        username: data.username,
        fullName: fullName,
        email: email,
      }))
    }
    
    return data
  } catch (err) {
    throw new Error(`Signup failed: ${err.message}`)
  }
}

/**
 * User login - returns JWT token
 */
export async function login(email, password) {
  try {
    const data = await authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    
    // Store token and user info in localStorage
    if (data.access_token) {
      localStorage.setItem('token', data.access_token)
      // Use username as full name since that's what was stored during signup
      localStorage.setItem('user', JSON.stringify({
        id: data.user_id,
        username: data.username,
        fullName: data.username,
        email: email,
      }))
    }
    
    return data
  } catch (err) {
    throw new Error(`Login failed: ${err.message}`)
  }
}

/**
 * Logout - clears stored token and user data
 */
export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!localStorage.getItem('token')
}

/**
 * Validate and restore session from localStorage
 */
export async function validateSession() {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      return null
    }
    
    // Try to fetch user profile to validate token
    const user = await getUserProfile()
    return user
  } catch (err) {
    // Token is invalid, clear it
    logout()
    return null
  }
}

/**
 * Get current logged-in user
 */
export function getCurrentUser() {
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
}

/**
 * Get auth token
 */
export function getToken() {
  return localStorage.getItem('token')
}

/**
 * Fetch current user profile from backend
 */
export async function getUserProfile() {
  try {
    const token = getToken()
    if (!token) {
      throw new Error('No authentication token found')
    }

    const data = await authFetch('/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    return data
  } catch (err) {
    throw new Error(`Failed to fetch profile: ${err.message}`)
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
 * Current NBA standings with detailed stats
 */
export async function getStandings() {
  try {
    const data = await backendFetch('/teams/standings/current')
    return {
      data: data.data || [],
      meta: { total: data.total || 0 },
    }
  } catch (err) {
    throw new Error(`Failed to fetch standings: ${err.message}`)
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
