import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { searchPlayers } from '../services/bdlApi'
import './Layout.css'

const LOGO_URL = 'https://res.cloudinary.com/dv3eeuy4b/image/upload/v1778557328/LOGO_umlvbk.png'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [players, setPlayers] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Debounced global player search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setPlayers([])
      setShowDropdown(false)
      return
    }
    const timer = setTimeout(() => {
      setSearchLoading(true)
      searchPlayers(searchQuery, 8)
        .then(data => {
          setPlayers(data.data || [])
          setShowDropdown(true)
          setSearchLoading(false)
        })
        .catch(() => setSearchLoading(false))
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handlePlayerClick(player) {
    setShowDropdown(false)
    setSearchQuery('')
    navigate(`/players?highlight=${player.id}`)
  }

  return (
    <div className="layout-wrap">
      {/* ── Sidebar ── */}
      <aside className="layout-sidebar">
        <div className="layout-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src={LOGO_URL} alt="Playmaker" className="layout-logo-img" />
        </div>
        <nav className="layout-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `layout-nav-item${isActive ? ' active' : ''}`}>
            <span className="layout-nav-icon">⌂</span> Home
          </NavLink>
          <NavLink to="/players" className={({ isActive }) => `layout-nav-item${isActive ? ' active' : ''}`}>
            <span className="layout-nav-icon">👤</span> Players
          </NavLink>
          <NavLink to="/teams" className={({ isActive }) => `layout-nav-item${isActive ? ' active' : ''}`}>
            <span className="layout-nav-icon">🏆</span> Teams
          </NavLink>
          <NavLink to="/schedule" className={({ isActive }) => `layout-nav-item${isActive ? ' active' : ''}`}>
            <span className="layout-nav-icon">📅</span> Schedule
          </NavLink>
          <NavLink to="/compare" className={({ isActive }) => `layout-nav-item${isActive ? ' active' : ''}`}>
            <span className="layout-nav-icon">⇄</span> Compare
          </NavLink>
        </nav>
      </aside>

      {/* ── Main ── */}
      <div className="layout-main">
        <header className="layout-topbar">
          <div className="layout-search-wrap" ref={dropdownRef}>
            <div className="layout-search">
              <span className="layout-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search players…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => players.length > 0 && setShowDropdown(true)}
              />
              {searchLoading && <span className="layout-spinner" />}
            </div>
            {showDropdown && players.length > 0 && (
              <div className="layout-dropdown">
                {players.map(p => (
                  <div
                    key={p.id}
                    className="layout-dropdown-item"
                    onMouseDown={() => handlePlayerClick(p)}
                  >
                    <div className="layout-dd-avatar">{p.first_name?.[0]}{p.last_name?.[0]}</div>
                    <div className="layout-dd-info">
                      <span className="layout-dd-name">{p.first_name} {p.last_name}</span>
                      <span className="layout-dd-meta">
                        {p.position || '—'} · #{p.jersey_number || '?'} · {p.team?.abbreviation || '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="layout-user">
            <div className="layout-avatar">👤</div>
          </div>
        </header>

        <div className="layout-content">
          {children}
        </div>
      </div>
    </div>
  )
}
