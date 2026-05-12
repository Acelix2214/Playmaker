import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getTeams, getTeamGames } from '../services/bdlApi'
import './Teams.css'

const CONF_ORDER = ['East', 'West']

export default function Teams() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [teamGames, setTeamGames] = useState({})
  const [gamesLoading, setGamesLoading] = useState({})

  useEffect(() => {
    getTeams()
      .then(data => {
        setTeams(data.data || [])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  function toggleTeam(team) {
    if (expandedId === team.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(team.id)
    if (!teamGames[team.id]) {
      setGamesLoading(prev => ({ ...prev, [team.id]: true }))
      getTeamGames(team.id, 6)
        .then(data => {
          setTeamGames(prev => ({ ...prev, [team.id]: data.data || [] }))
          setGamesLoading(prev => ({ ...prev, [team.id]: false }))
        })
        .catch(() => setGamesLoading(prev => ({ ...prev, [team.id]: false })))
    }
  }

  const grouped = CONF_ORDER.reduce((acc, conf) => {
    acc[conf] = teams
      .filter(t => t.conference === conf)
      .sort((a, b) => a.division.localeCompare(b.division))
    return acc
  }, {})

  return (
    <Layout>
      <h1 className="page-title">Teams</h1>

      {loading && <p className="page-status loading">Loading teams…</p>}
      {error   && <p className="page-status error">{error}</p>}

      <div className="teams-confs">
        {CONF_ORDER.map(conf => (
          <div key={conf} className="teams-conf">
            <h2 className="teams-conf-title">
              <span className={`conf-badge ${conf.toLowerCase()}`}>{conf}ern Conference</span>
            </h2>

            {/* Group by division */}
            {['Atlantic', 'Central', 'Southeast', 'Northwest', 'Pacific', 'Southwest']
              .filter(div => (grouped[conf] || []).some(t => t.division === div))
              .map(div => (
                <div key={div} className="teams-division">
                  <h3 className="teams-div-title">{div}</h3>
                  <div className="teams-grid">
                    {(grouped[conf] || [])
                      .filter(t => t.division === div)
                      .map(team => (
                        <div key={team.id} className="team-card-wrap">
                          <div
                            className={`team-card${expandedId === team.id ? ' expanded' : ''}`}
                            onClick={() => toggleTeam(team)}
                          >
                            <div className="team-abbr">{team.abbreviation}</div>
                            <div className="team-info">
                              <span className="team-name">{team.full_name}</span>
                              <span className="team-city">{team.city}</span>
                            </div>
                            <span className="team-chevron">{expandedId === team.id ? '▲' : '▼'}</span>
                          </div>

                          {expandedId === team.id && (
                            <div className="team-games">
                              {gamesLoading[team.id] && (
                                <p className="page-status loading">Loading recent games…</p>
                              )}
                              {!gamesLoading[team.id] && (teamGames[team.id] || []).length === 0 && (
                                <p className="page-status">No recent games found.</p>
                              )}
                              {(teamGames[team.id] || []).map(g => {
                                const isHome = g.home_team.id === team.id
                                const opp = isHome ? g.visitor_team : g.home_team
                                const teamScore = isHome ? g.home_team_score : g.visitor_team_score
                                const oppScore = isHome ? g.visitor_team_score : g.home_team_score
                                const won = (teamScore || 0) > (oppScore || 0)
                                return (
                                  <div key={g.id} className="team-game-row">
                                    <span className={`tg-result ${won ? 'win' : 'loss'}`}>{won ? 'W' : 'L'}</span>
                                    <span className="tg-vs">{isHome ? 'vs' : '@'}</span>
                                    <span className="tg-opp">{opp.abbreviation}</span>
                                    <span className="tg-score">
                                      {teamScore ?? '–'} – {oppScore ?? '–'}
                                    </span>
                                    <span className="tg-date">{g.date?.split('T')[0]}</span>
                                    <span className="pill pill-gray tg-status">{g.status}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </Layout>
  )
}
