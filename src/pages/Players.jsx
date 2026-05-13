import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { getPlayers } from '../services/backendApi'
import './Players.css'

const POSITIONS = ['All', 'G', 'F', 'C', 'G-F', 'F-C', 'F-G', 'C-F']
const PLAYERS_PER_PAGE = 20

const TEAM_LOGO_IDS = {
  ATL:'1610612737',BOS:'1610612738',BKN:'1610612751',CHA:'1610612766',
  CHI:'1610612741',CLE:'1610612739',DAL:'1610612742',DEN:'1610612743',
  DET:'1610612765',GSW:'1610612744',HOU:'1610612745',IND:'1610612754',
  LAC:'1610612746',LAL:'1610612747',MEM:'1610612763',MIA:'1610612748',
  MIL:'1610612749',MIN:'1610612750',NOP:'1610612740',NYK:'1610612752',
  OKC:'1610612760',ORL:'1610612753',PHI:'1610612755',PHX:'1610612756',
  POR:'1610612757',SAC:'1610612758',SAS:'1610612759',TOR:'1610612761',
  UTA:'1610612762',WAS:'1610612764',
}

function playerAvatarUrl(p) {
  if (p.image_url) return p.image_url
  const name = encodeURIComponent(`${p.first_name} ${p.last_name}`)
  return `https://ui-avatars.com/api/?name=${name}&background=0d1228&color=4d72f0&bold=true&size=128&font-size=0.38`
}

function fallbackAvatarUrl(p) {
  const name = encodeURIComponent(`${p.first_name} ${p.last_name}`)
  return `https://ui-avatars.com/api/?name=${name}&background=0d1228&color=4d72f0&bold=true&size=128&font-size=0.38`
}

function handleAvatarError(e, p) {
  e.currentTarget.onerror = null
  e.currentTarget.src = fallbackAvatarUrl(p)
}

function TeamBadge({ abbr }) {
  const id = TEAM_LOGO_IDS[abbr]
  if (!id) return <span className="pl-team-badge">{abbr}</span>
  return <img src={`https://cdn.nba.com/logos/nba/${id}/primary/L/logo.svg`} alt={abbr} className="pl-team-logo" />
}

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
  const [page, setPage] = useState(0)
  const [totalPlayers, setTotalPlayers] = useState(0)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(t)
  }, [search])

  const fetchPlayers = useCallback((pageToLoad = 0) => {
    setLoading(true)
    setError(null)
    getPlayers(debouncedSearch, PLAYERS_PER_PAGE, pageToLoad)
      .then(data => {
        setPlayers(data.data || [])
        setNextCursor(data.meta?.next_cursor || null)
        setTotalPlayers(data.meta?.total || 0)
        setPage(pageToLoad)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [debouncedSearch])

  useEffect(() => {
    fetchPlayers(0)
  }, [fetchPlayers])

  function goNext() {
    if (!nextCursor) return
    fetchPlayers(page + 1)
  }

  function goPrev() {
    if (page === 0) return
    fetchPlayers(page - 1)
  }

  const filtered = posFilter === 'All'
    ? players
    : players.filter(p => p.position === posFilter)
  const prevCursors = { length: page }

  return (
    <Layout>
      {/* Page header */}
      <div className="pl-page-header">
        <div className="pl-breadcrumb">
          <span className="pl-bc-root">Stats Home</span>
          <span className="pl-bc-sep">/</span>
          <span className="pl-bc-cur">Players</span>
        </div>
        <div className="pl-header-row">
          <div className="pl-header-left">
            <h1 className="pl-title">PLAYERS</h1>
            <span className="pl-season-badge">2025-26 SEASON</span>
          </div>
          <div className="pl-search">
            <span className="pl-search-icon">⌕</span>
            <input
              type="text"
              placeholder="Search by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="pl-controls">
        <div className="pl-pos-filters">
          {POSITIONS.map(pos => (
            <button
              key={pos}
              className={`pl-pos-btn${posFilter === pos ? ' active' : ''}`}
              onClick={() => setPosFilter(pos)}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      {loading && <div className="pl-loading-row">{[...Array(20)].map((_,i)=><div key={i} className="pl-skeleton" />)}</div>}
      {error && <div className="pl-error">{error}</div>}

      {/* Grid */}
      {!loading && (
        <div className="pl-grid">
          {filtered.map(p => (
            <div
              key={p.id}
              className={`pl-card${highlightId === String(p.id) ? ' highlighted' : ''}`}
            >
              <div className="pl-avatar-wrap">
                <img
                  src={playerAvatarUrl(p)}
                  alt={`${p.first_name} ${p.last_name}`}
                  className="pl-avatar"
                  onError={e => handleAvatarError(e, p)}
                />
                {p.team?.abbreviation && (
                  <div className="pl-avatar-badge">
                    <TeamBadge abbr={p.team.abbreviation} />
                  </div>
                )}
              </div>
              <div className="pl-card-body">
                <div className="pl-name">{p.first_name} {p.last_name}</div>
                <div className="pl-sub-row">
                  {p.jersey_number && <span className="pl-jersey">#{p.jersey_number}</span>}
                  {p.position && <span className="pl-pos-tag">{p.position}</span>}
                  {p.team?.abbreviation && <span className="pl-team-abbr">{p.team.abbreviation}</span>}
                </div>
                <div className="pl-details">
                  {p.height && <span>{p.height}</span>}
                  {p.weight && <span>{p.weight} lbs</span>}
                  {p.college && <span className="pl-college">{p.college}</span>}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="pl-empty">No players found.</div>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="pl-pagination">
        <button className="pl-page-btn" onClick={goPrev} disabled={prevCursors.length === 0}>← Prev</button>
        <button className="pl-page-btn" onClick={goNext} disabled={!nextCursor}>Next →</button>
      </div>
    </Layout>
  )
}
