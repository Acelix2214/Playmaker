import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getTeams, getTeamGames } from '../services/backendApi'
import './Teams.css'

const CONF_ORDER = ['East', 'West']

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

function TeamLogo({ abbr, size = 40 }) {
  const id = TEAM_LOGO_IDS[abbr]
  if (!id) return <div className="tm-logo-fallback" style={{width:size,height:size}}>{abbr}</div>
  return <img src={`https://cdn.nba.com/logos/nba/${id}/primary/L/logo.svg`} alt={abbr} style={{width:size,height:size,objectFit:'contain'}} />
}

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
      <div className="tm-page-header">
        <div className="tm-breadcrumb">
          <span className="tm-bc-root">Stats Home</span>
          <span className="tm-bc-sep">/</span>
          <span className="tm-bc-cur">Teams</span>
        </div>
        <div className="tm-header-row">
          <h1 className="tm-title">TEAMS</h1>
          <span className="tm-season-badge">2025-26 SEASON</span>
        </div>
      </div>

      {loading && <div className="tm-loading">Loading teams…</div>}
      {error && <div className="tm-error">{error}</div>}

      <div className="tm-confs">
        {CONF_ORDER.map(conf => (
          <div key={conf} className="tm-conf">
            <div className="tm-conf-header">
              <h2 className="tm-conf-title">{conf.toUpperCase()}ERN CONFERENCE</h2>
            </div>

            {['Atlantic','Central','Southeast','Northwest','Pacific','Southwest']
              .filter(div => (grouped[conf]||[]).some(t => t.division === div))
              .map(div => (
                <div key={div} className="tm-division">
                  <h3 className="tm-div-title">{div}</h3>
                  <div className="tm-list">
                    {(grouped[conf]||[]).filter(t => t.division === div).map(team => (
                      <div key={team.id} className="tm-row-wrap">
                        <div
                          className={`tm-row${expandedId === team.id ? ' expanded' : ''}`}
                          onClick={() => toggleTeam(team)}
                        >
                          <TeamLogo abbr={team.abbreviation} size={36} />
                          <div className="tm-row-info">
                            <span className="tm-row-name">{team.full_name}</span>
                            <span className="tm-row-city">{team.city}</span>
                          </div>
                          <span className="tm-row-abbr">{team.abbreviation}</span>
                          <span className="tm-chevron">{expandedId === team.id ? '▲' : '▼'}</span>
                        </div>

                        {expandedId === team.id && (
                          <div className="tm-games-panel">
                            {gamesLoading[team.id] && <div className="tm-games-loading">Loading recent games…</div>}
                            {!gamesLoading[team.id] && (teamGames[team.id]||[]).length === 0 && (
                              <div className="tm-games-empty">No recent games found.</div>
                            )}
                            <table className="tm-games-table">
                              <tbody>
                                {(teamGames[team.id]||[]).map(g => {
                                  const isHome = g.home_team.id === team.id
                                  const opp = isHome ? g.visitor_team : g.home_team
                                  const teamScore = isHome ? g.home_team_score : g.visitor_team_score
                                  const oppScore  = isHome ? g.visitor_team_score : g.home_team_score
                                  const won = (teamScore||0) > (oppScore||0)
                                  return (
                                    <tr key={g.id} className="tm-game-row">
                                      <td><span className={`tm-wl ${won?'win':'loss'}`}>{won?'W':'L'}</span></td>
                                      <td className="tm-g-vs">{isHome?'vs':'@'}</td>
                                      <td className="tm-g-opp">
                                        <TeamLogo abbr={opp.abbreviation} size={22} />
                                        <span>{opp.abbreviation}</span>
                                      </td>
                                      <td className="tm-g-score">{teamScore??'–'} – {oppScore??'–'}</td>
                                      <td className="tm-g-date">{g.date?.split('T')[0]}</td>
                                      <td className="tm-g-status">{g.status}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
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
