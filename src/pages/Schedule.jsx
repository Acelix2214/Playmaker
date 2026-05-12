import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getScheduleGames } from '../services/bdlApi'
import './Schedule.css'

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
      <h1 className="page-title">Schedule</h1>

      {/* Week navigation */}
      <div className="sched-nav">
        <button className="sched-nav-btn" onClick={prevWeek}>← Prev week</button>
        <span className="sched-week-label">{weekLabel()}</span>
        <button className="sched-nav-btn" onClick={goToday}>Today</button>
        <button className="sched-nav-btn" onClick={nextWeek}>Next week →</button>
      </div>

      {loading && <p className="page-status loading">Loading schedule…</p>}
      {error   && <p className="page-status error">{error}</p>}

      {!loading && (
        <div className="sched-days">
          {days.map(day => (
            <div key={day} className={`sched-day${day === todayStr ? ' today' : ''}`}>
              <div className="sched-day-header">
                <span className="sched-day-label">{labelDay(day)}</span>
                {day === todayStr && <span className="today-badge">Today</span>}
              </div>

              {(byDate[day] || []).length === 0 ? (
                <p className="sched-no-games">No games</p>
              ) : (
                (byDate[day] || []).map(g => {
                  const isFinal = g.status === 'Final' || g.status === 'Final/OT'
                  const homeWon = isFinal && g.home_team_score > g.visitor_team_score
                  const awayWon = isFinal && g.visitor_team_score > g.home_team_score
                  return (
                    <div key={g.id} className="sched-game">
                      <div className={`sched-team-row${homeWon ? ' winner' : ''}`}>
                        <span className="sched-team-abbr">{g.home_team.abbreviation}</span>
                        <span className="sched-team-name">{g.home_team.full_name}</span>
                        {isFinal && <span className="sched-score">{g.home_team_score}</span>}
                      </div>
                      <div className={`sched-team-row${awayWon ? ' winner' : ''}`}>
                        <span className="sched-team-abbr">{g.visitor_team.abbreviation}</span>
                        <span className="sched-team-name">{g.visitor_team.full_name}</span>
                        {isFinal && <span className="sched-score">{g.visitor_team_score}</span>}
                      </div>
                      <div className="sched-game-footer">
                        <span className={`pill ${isFinal ? 'pill-green' : 'pill-purple'}`}>{g.status}</span>
                        {g.postseason && <span className="pill pill-red">Playoffs</span>}
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
