import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { getPlayers } from '../services/bdlApi'
import './Players.css'

const POSITIONS = ['All', 'G', 'F', 'C', 'G-F', 'F-C', 'F-G', 'C-F']

export default function Players() {
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [posFilter, setPosFilter] = useState('All')
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [nextCursor, setNextCursor] = useState(null)
  const [prevCursors, setPrevCursors] = useState([])

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(t)
  }, [search])

  const fetchPlayers = useCallback((cursor = null) => {
    setLoading(true)
    setError(null)
    getPlayers(debouncedSearch, 24, cursor)
      .then(data => {
        setPlayers(data.data || [])
        setNextCursor(data.meta?.next_cursor || null)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [debouncedSearch])

  useEffect(() => {
    setPrevCursors([])
    fetchPlayers(null)
  }, [fetchPlayers])

  function goNext() {
    if (!nextCursor) return
    setPrevCursors(p => [...p, null]) // store current position placeholder
    fetchPlayers(nextCursor)
  }

  function goPrev() {
    const prev = prevCursors[prevCursors.length - 2] ?? null
    setPrevCursors(p => p.slice(0, -1))
    fetchPlayers(prev)
  }

  const filtered = posFilter === 'All'
    ? players
    : players.filter(p => p.position === posFilter)

  return (
    <Layout>
      <h1 className="page-title">Players</h1>

      {/* Controls */}
      <div className="players-controls">
        <div className="players-search">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="players-pos-filters">
          {POSITIONS.map(pos => (
            <button
              key={pos}
              className={`pos-btn${posFilter === pos ? ' active' : ''}`}
              onClick={() => setPosFilter(pos)}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      {loading && <p className="page-status loading">Loading players…</p>}
      {error   && <p className="page-status error">{error}</p>}

      {/* Grid */}
      {!loading && (
        <div className="players-grid">
          {filtered.map(p => (
            <div
              key={p.id}
              className={`player-card${highlightId === String(p.id) ? ' highlighted' : ''}`}
            >
              <div className="player-avatar">
                {p.first_name?.[0]}{p.last_name?.[0]}
              </div>
              <div className="player-info">
                <span className="player-name">{p.first_name} {p.last_name}</span>
                {p.jersey_number && (
                  <span className="player-jersey">#{p.jersey_number}</span>
                )}
              </div>
              <div className="player-meta">
                <span className="pill pill-purple">{p.position || '—'}</span>
                <span className="player-team">{p.team?.abbreviation || '—'}</span>
              </div>
              <div className="player-details">
                {p.height && <span>{p.height}</span>}
                {p.weight && <span>{p.weight} lbs</span>}
                {p.college && <span className="player-college">{p.college}</span>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <p className="page-status">No players found.</p>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="players-pagination">
        <button
          className="page-btn"
          onClick={goPrev}
          disabled={prevCursors.length === 0}
        >
          ← Prev
        </button>
        <button
          className="page-btn"
          onClick={goNext}
          disabled={!nextCursor}
        >
          Next →
        </button>
      </div>
    </Layout>
  )
}
