import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getScheduleGames } from '../services/backendApi'
import './Schedule.css'

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

function TeamLogo({ abbr, size = 20 }) {
  const id = TEAM_LOGO_IDS[abbr]
  if (!id) return <span className="sc-abbr-text">{abbr}</span>
  return <img src={`https://cdn.nba.com/logos/nba/${id}/primary/L/logo.svg`} alt={abbr} style={{width:size,height:size,objectFit:'contain',flexShrink:0}} />
}

function weekOf(date) {
  const d = new Date(date)
  // Start of week (Monday)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return { mon, sun }
}

function fmt(d) { return d.toISOString().split('T')[0] }

function labelDay(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Schedule() {
  const [weekStart, setWeekStart] = useState(() => weekOf(new Date()).mon)
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const { mon, sun } = weekOf(weekStart)
    getScheduleGames(fmt(mon), fmt(sun), 40)
      .then(data => {
        setGames(data.data || [])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [weekStart])

  function prevWeek() {
    setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d })
  }

  function nextWeek() {
    setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d })
  }

  function goToday() { setWeekStart(weekOf(new Date()).mon) }

  // Group games by date string
  const byDate = games.reduce((acc, g) => {
    const day = g.date?.split('T')[0]
    if (!day) return acc
    if (!acc[day]) acc[day] = []
    acc[day].push(g)
    return acc
  }, {})

  // Build 7 day slots for the week
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    days.push(fmt(d))
  }

  const weekLabel = () => {
    const { mon, sun } = weekOf(weekStart)
    return `${mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const todayStr = fmt(new Date())

  return (
    <Layout>
      <div className="sc-page-header">
        <div className="sc-breadcrumb">
          <span className="sc-bc-root">Stats Home</span>
          <span className="sc-bc-sep">/</span>
          <span className="sc-bc-cur">Schedule</span>
        </div>
        <div className="sc-header-row">
          <h1 className="sc-title">SCHEDULE</h1>
          <span className="sc-season-badge">2025-26 SEASON</span>
        </div>
      </div>

      {/* Week nav */}
      <div className="sc-nav">
        <button className="sc-nav-btn" onClick={prevWeek}>← Prev</button>
        <span className="sc-week-label">{weekLabel()}</span>
        <button className="sc-nav-btn sc-nav-today" onClick={goToday}>Today</button>
        <button className="sc-nav-btn" onClick={nextWeek}>Next →</button>
      </div>

      {loading && <div className="sc-loading-row">{[...Array(7)].map((_,i)=><div key={i} className="sc-skeleton" />)}</div>}
      {error   && <div className="sc-error">{error}</div>}

      {!loading && (
        <div className="sc-days">
          {days.map(day => (
            <div key={day} className={`sc-day${day === todayStr ? ' today' : ''}`}>
              <div className="sc-day-header">
                <span className="sc-day-label">{labelDay(day)}</span>
                {day === todayStr && <span className="sc-today-badge">TODAY</span>}
              </div>

              {(byDate[day]||[]).length === 0 ? (
                <div className="sc-no-games">No games</div>
              ) : (
                (byDate[day]||[]).map(g => {
                  const isFinal = g.status === 'Final' || g.status === 'Final/OT'
                  const homeWon = isFinal && g.home_team_score > g.visitor_team_score
                  const awayWon = isFinal && g.visitor_team_score > g.home_team_score
                  return (
                    <div key={g.id} className="sc-game">
                      <div className={`sc-team-row${homeWon ? ' winner' : ''}`}>
                        <TeamLogo abbr={g.home_team.abbreviation} size={18} />
                        <span className="sc-team-abbr">{g.home_team.abbreviation}</span>
                        <span className="sc-team-name">{g.home_team.city}</span>
                        {isFinal && <span className={`sc-score${homeWon?' sc-score-win':''}`}>{g.home_team_score}</span>}
                      </div>
                      <div className={`sc-team-row${awayWon ? ' winner' : ''}`}>
                        <TeamLogo abbr={g.visitor_team.abbreviation} size={18} />
                        <span className="sc-team-abbr">{g.visitor_team.abbreviation}</span>
                        <span className="sc-team-name">{g.visitor_team.city}</span>
                        {isFinal && <span className={`sc-score${awayWon?' sc-score-win':''}`}>{g.visitor_team_score}</span>}
                      </div>
                      <div className="sc-game-footer">
                        <span className={`sc-status-tag${isFinal?' final':''}`}>{g.status}</span>
                        {g.postseason && <span className="sc-playoff-tag">Playoffs</span>}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
