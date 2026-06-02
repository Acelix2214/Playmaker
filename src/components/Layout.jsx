import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { searchPlayers, getCurrentUser, logout } from '../services/backendApi'
import './Layout.css'

const LOGO_URL = 'https://res.cloudinary.com/dv3eeuy4b/image/upload/v1778557328/LOGO_umlvbk.png'

function playerAvatarUrl(player, size = 64) {
  if (player?.image_url) return player.image_url
  const name = encodeURIComponent(`${player?.first_name || ''} ${player?.last_name || ''}`)
  return `https://ui-avatars.com/api/?name=${name}&background=3d1f6e&color=c4a8ff&bold=true&size=${size}&font-size=0.38`
}

function handleAvatarError(e, player, size = 64) {
  e.currentTarget.onerror = null
  const name = encodeURIComponent(`${player?.first_name || ''} ${player?.last_name || ''}`)
  e.currentTarget.src = `https://ui-avatars.com/api/?name=${name}&background=3d1f6e&color=c4a8ff&bold=true&size=${size}&font-size=0.38`
}

function userAvatarUrl(fullName, size = 48) {
  const name = encodeURIComponent(fullName || 'User')
  return `https://ui-avatars.com/api/?name=${name}&background=1d42ba&color=fff&bold=true&size=${size}`
}

export default function Layout({ children }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [players, setPlayers] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [user, setUser] = useState(null)
  const dropdownRef = useRef(null)
  const userMenuRef = useRef(null)

  // Get user info on mount
  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
  }, [])

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
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
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

  function handleLogout() {
    logout()
    setShowUserMenu(false)
    navigate('/login')
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
          <NavLink to="/about" className={({ isActive }) => `layout-nav-item${isActive ? ' active' : ''}`}>
            <span className="layout-nav-icon">ℹ️</span> About Us
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
                    <div className="layout-dd-avatar" style={{padding:0,overflow:'hidden'}}>
                      <img
                        src={playerAvatarUrl(p, 64)}
                        alt=""
                        style={{width:'100%',height:'100%',display:'block',objectFit:'cover'}}
                        onError={e => handleAvatarError(e, p, 64)}
                      />
                    </div>
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
          <div className="layout-user" ref={userMenuRef}>
            {user && (
              <>
                <div 
                  className="layout-user-info"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <img 
                    src={userAvatarUrl(user.fullName)} 
                    alt="User avatar"
                    className="layout-avatar"
                    style={{ width: 40, height: 40, borderRadius: '50%', cursor: 'pointer' }}
                  />
                  <span style={{ color: '#c8d4e8', fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.fullName}
                  </span>
                </div>
                {showUserMenu && (
                  <div 
                    className="layout-user-dropdown"
                    style={{
                      position: 'absolute',
                      top: '60px',
                      right: '20px',
                      background: 'rgba(13, 27, 42, 0.95)',
                      border: '1px solid rgba(29, 66, 186, 0.3)',
                      borderRadius: '8px',
                      minWidth: '160px',
                      zIndex: 1000,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        color: '#ff6b6b',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '14px',
                        transition: 'background-color 0.2s ease',
                        borderRadius: '8px'
                      }}
                      onMouseEnter={e => e.target.style.backgroundColor = 'rgba(255, 107, 107, 0.1)'}
                      onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </header>

        <div className="layout-content">
          {children}
        </div>
      </div>
    </div>
  )
}
