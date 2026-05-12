import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getRecentGames } from '../services/bdlApi'
import './Dashboard.css'

function Dashboard() {
  // ── Games state ───────────────────────────────
  const [games, setGames] = useState([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [gamesError, setGamesError] = useState(null)

  // ── Fetch recent games on mount ───────────────
  useEffect(() => {
    setGamesLoading(true)
    getRecentGames(6)
      .then(data => {
        setGames(data.data || [])
        setGamesLoading(false)
      })
      .catch(err => {
        setGamesError(err.message)
        setGamesLoading(false)
      })
  }, [])

  // ── Derive top scoring teams from games ───────
  const topTeams = (() => {
    const map = {}
    games.forEach(g => {
      if (g.home_team_score) {
        const k = g.home_team.abbreviation
        if (!map[k]) map[k] = { name: g.home_team.full_name, abbr: k, total: 0, count: 0 }
        map[k].total += g.home_team_score
        map[k].count++
      }
      if (g.visitor_team_score) {
        const k = g.visitor_team.abbreviation
        if (!map[k]) map[k] = { name: g.visitor_team.full_name, abbr: k, total: 0, count: 0 }
        map[k].total += g.visitor_team_score
        map[k].count++
      }
    })
    return Object.values(map)
      .map(t => ({ ...t, avg: Math.round(t.total / t.count) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
  })()
  const maxAvg = topTeams[0]?.avg || 1

  // ── Chart: home scores from recent games ──────
  const chartGames = games.slice(0, 7)
  const maxScore = chartGames.reduce((m, g) => Math.max(m, g.home_team_score || 0, g.visitor_team_score || 0), 1)

  return (
    <Layout>
      <h1 className="db-title">Dashboard</h1>

      {/* Latest Results */}
      <section className="db-section">
        <h2 className="db-section-title">Latest Results</h2>
        {gamesLoading && <div className="db-status-msg db-loading">Loading games…</div>}
        {gamesError && <div className="db-status-msg db-error">{gamesError}</div>}
        {!gamesLoading && !gamesError && games.length === 0 && (
          <div className="db-status-msg">No recent games found.</div>
        )}
        <div className="db-results-grid">
          {games.map(g => {
            const homeWon = (g.home_team_score || 0) > (g.visitor_team_score || 0)
            return (
              <div key={g.id} className="db-result-card">
                <div className={`db-result-team-row ${homeWon ? 'db-winner' : ''}`}>
                  <div className="db-team-badge">{g.home_team.abbreviation}</div>
                  <span className="db-team-full">{g.home_team.full_name}</span>
                  <span className="db-team-score">{g.home_team_score ?? '–'}</span>
                </div>
                <div className={`db-result-team-row ${!homeWon ? 'db-winner' : ''}`}>
                  <div className="db-team-badge">{g.visitor_team.abbreviation}</div>
                  <span className="db-team-full">{g.visitor_team.full_name}</span>
                  <span className="db-team-score">{g.visitor_team_score ?? '–'}</span>
                </div>
                <div className="db-result-footer">
                  <span className="db-result-status">{g.status}</span>
                  <span className="db-result-date">{g.date?.split('T')[0]}</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Bottom row */}
      <div className="db-bottom-row">
        {/* Top Scoring Teams */}
        <section className="db-section db-scorers">
          <h2 className="db-section-title">Top Scoring Teams</h2>
          {gamesLoading && <div className="db-status-msg db-loading">Loading…</div>}
          <ul className="db-scorers-list">
            {topTeams.map((t, i) => (
              <li key={t.abbr} className="db-scorer-item">
                <span className="db-scorer-rank">#{i + 1}</span>
                <div className="db-scorer-info">
                  <span className="db-scorer-name">{t.abbr}</span>
                  <span className="db-scorer-pts">{t.avg} PPG</span>
                </div>
                <div className="db-scorer-bar-wrap">
                  <div className="db-bar-track">
                    <div className="db-bar-fill" style={{ width: `${(t.avg / maxAvg) * 100}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Score Chart */}
        <section className="db-section db-chart-section">
          <h2 className="db-section-title">Recent Scores</h2>
          {gamesLoading && <div className="db-status-msg db-loading">Loading…</div>}
          <div className="db-chart-area">
            {chartGames.map(g => (
              <div key={g.id} className="db-chart-col">
                <div
                  className="db-bar"
                  style={{ height: `${Math.round(((g.home_team_score || 0) / maxScore) * 96)}px` }}
                  title={`${g.home_team.abbreviation}: ${g.home_team_score}`}
                />
                <span className="db-chart-label">{g.home_team.abbreviation}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  )
}

export default Dashboard
