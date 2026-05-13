import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getRecentGames } from '../services/backendApi'
import './Dashboard.css'

// Map NBA team abbreviations → NBA CDN team IDs for logo URLs
const TEAM_LOGO_IDS = {
  ATL: '1610612737', BOS: '1610612738', BKN: '1610612751', CHA: '1610612766',
  CHI: '1610612741', CLE: '1610612739', DAL: '1610612742', DEN: '1610612743',
  DET: '1610612765', GSW: '1610612744', HOU: '1610612745', IND: '1610612754',
  LAC: '1610612746', LAL: '1610612747', MEM: '1610612763', MIA: '1610612748',
  MIL: '1610612749', MIN: '1610612750', NOP: '1610612740', NYK: '1610612752',
  OKC: '1610612760', ORL: '1610612753', PHI: '1610612755', PHX: '1610612756',
  POR: '1610612757', SAC: '1610612758', SAS: '1610612759', TOR: '1610612761',
  UTA: '1610612762', WAS: '1610612764',
}

function teamLogo(abbr) {
  const id = TEAM_LOGO_IDS[abbr]
  return id ? `https://cdn.nba.com/logos/nba/${id}/primary/L/logo.svg` : null
}

function TeamLogo({ abbr, size = 40 }) {
  const src = teamLogo(abbr)
  if (!src) return <div className="db-logo-fallback" style={{ width: size, height: size }}>{abbr}</div>
  return <img src={src} alt={abbr} className="db-team-logo" style={{ width: size, height: size }} />
}

function Dashboard() {
  const [games, setGames] = useState([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [gamesError, setGamesError] = useState(null)

  const fetchGames = () => {
    setGamesLoading(true)
    setGamesError(null)
    getRecentGames(8)
      .then(data => {
        setGames(data.data || [])
        setGamesLoading(false)
      })
      .catch(err => {
        setGamesError(err.message)
        setGamesLoading(false)
      })
  }

  useEffect(() => { fetchGames() }, [])

  // Top scoring teams derived from games
  const topTeams = (() => {
    const map = {}
    games.forEach(g => {
      ['home', 'visitor'].forEach(side => {
        const team = g[`${side}_team`]
        const score = g[`${side}_team_score`]
        if (score) {
          const k = team.abbreviation
          if (!map[k]) map[k] = { name: team.full_name, abbr: k, total: 0, count: 0 }
          map[k].total += score
          map[k].count++
        }
      })
    })
    return Object.values(map)
      .map(t => ({ ...t, avg: (t.total / t.count).toFixed(1) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
  })()
  const maxAvg = parseFloat(topTeams[0]?.avg) || 1

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <Layout>
      {/* ── Page header ── */}
      <div className="db-page-header">
        <div className="db-breadcrumb">
          <span className="db-breadcrumb-root">Stats Home</span>
          <span className="db-breadcrumb-sep">/</span>
          <span className="db-breadcrumb-current">Dashboard</span>
        </div>
        <div className="db-header-row">
          <h1 className="db-title">LEAGUE STATS</h1>
          <span className="db-season-badge">2025-26 SEASON</span>
        </div>
        <p className="db-date">{today}</p>
      </div>

      {/* ── Scoreboard ── */}
      <section className="db-section">
        <div className="db-section-header">
          <h2 className="db-section-title">SCOREBOARD</h2>
          {gamesError && (
            <button className="db-retry-btn" onClick={fetchGames}>↻ Retry</button>
          )}
        </div>

        {gamesLoading && (
          <div className="db-loading-row">
            {[...Array(4)].map((_, i) => <div key={i} className="db-skeleton-card" />)}
          </div>
        )}
        {gamesError && !gamesLoading && (
          <div className="db-error-msg">{gamesError}</div>
        )}
        {!gamesLoading && !gamesError && games.length === 0 && (
          <div className="db-empty-msg">No recent games found.</div>
        )}

        <div className="db-scoreboard-grid">
          {games.map(g => {
            const homeScore = g.home_team_score ?? null
            const visScore = g.visitor_team_score ?? null
            const homeWon = homeScore !== null && visScore !== null && homeScore > visScore
            const visWon = homeScore !== null && visScore !== null && visScore > homeScore
            const gameDone = homeScore !== null && visScore !== null
            return (
              <div key={g.id} className="db-score-card">
                <div className="db-score-card-header">
                  <span className="db-game-status">{gameDone ? 'Final' : g.status}</span>
                  <span className="db-game-date">{g.date?.split('T')[0]}</span>
                </div>
                <div className={`db-score-row ${homeWon ? 'db-score-winner' : ''}`}>
                  <TeamLogo abbr={g.home_team.abbreviation} size={32} />
                  <div className="db-score-team-info">
                    <span className="db-score-abbr">{g.home_team.abbreviation}</span>
                    <span className="db-score-city">{g.home_team.city}</span>
                  </div>
                  <span className={`db-score-num ${homeWon ? 'db-score-num--win' : ''}`}>
                    {homeScore ?? '–'}
                  </span>
                </div>
                <div className="db-score-divider" />
                <div className={`db-score-row ${visWon ? 'db-score-winner' : ''}`}>
                  <TeamLogo abbr={g.visitor_team.abbreviation} size={32} />
                  <div className="db-score-team-info">
                    <span className="db-score-abbr">{g.visitor_team.abbreviation}</span>
                    <span className="db-score-city">{g.visitor_team.city}</span>
                  </div>
                  <span className={`db-score-num ${visWon ? 'db-score-num--win' : ''}`}>
                    {visScore ?? '–'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Leaders + Chart ── */}
      <div className="db-bottom-row">
        {/* Points Per Game Leaders */}
        <section className="db-section">
          <div className="db-section-header">
            <h2 className="db-section-title">POINTS PER GAME</h2>
            <span className="db-section-sub">TOP SCORING TEAMS</span>
          </div>
          {gamesLoading && <div className="db-loading-text">Loading…</div>}
          {!gamesLoading && (
            <table className="db-leaders-table">
              <thead>
                <tr>
                  <th className="db-th-rank">RK</th>
                  <th className="db-th-team">TEAM</th>
                  <th className="db-th-stat">PPG</th>
                  <th className="db-th-bar" />
                </tr>
              </thead>
              <tbody>
                {topTeams.map((t, i) => (
                  <tr key={t.abbr} className="db-leader-row">
                    <td className="db-td-rank">{i + 1}</td>
                    <td className="db-td-team">
                      <TeamLogo abbr={t.abbr} size={28} />
                      <div className="db-td-team-names">
                        <span className="db-td-abbr">{t.abbr}</span>
                        <span className="db-td-full">{t.name}</span>
                      </div>
                    </td>
                    <td className="db-td-stat">{t.avg}</td>
                    <td className="db-td-bar">
                      <div className="db-bar-track">
                        <div className="db-bar-fill" style={{ width: `${(parseFloat(t.avg) / maxAvg) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Score Chart */}
        <section className="db-section">
          <div className="db-section-header">
            <h2 className="db-section-title">RECENT SCORES</h2>
            <span className="db-section-sub">HOME TEAM PTS</span>
          </div>
          {gamesLoading && <div className="db-loading-text">Loading…</div>}
          {!gamesLoading && (
            <div className="db-chart-wrap">
              {games.slice(0, 8).map(g => {
                const score = g.home_team_score || 0
                const maxScore = Math.max(...games.slice(0, 8).map(x => x.home_team_score || 0), 1)
                const pct = Math.round((score / maxScore) * 100)
                return (
                  <div key={g.id} className="db-chart-col">
                    <span className="db-chart-val">{score || '–'}</span>
                    <div className="db-chart-bar-wrap">
                      <div className="db-chart-bar" style={{ height: `${pct}%` }}
                        title={`${g.home_team.abbreviation}: ${score}`} />
                    </div>
                    <TeamLogo abbr={g.home_team.abbreviation} size={22} />
                    <span className="db-chart-abbr">{g.home_team.abbreviation}</span>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}

export default Dashboard
