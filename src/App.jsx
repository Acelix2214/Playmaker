import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import BballLoader from './components/BballLoader.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Players   from './pages/Players.jsx'
import PlayerProfile from './pages/PlayerProfile.jsx'
import Teams     from './pages/Teams.jsx'
import Schedule  from './pages/Schedule.jsx'
import Compare   from './pages/Compare.jsx'
import Login from './pages/Login.jsx'
import About     from './pages/About.jsx'
import { isAuthenticated } from './services/backendApi'
import './App.css'

const LOGO_URL = 'https://res.cloudinary.com/dv3eeuy4b/image/upload/v1778557328/LOGO_umlvbk.png'

// Protected route component - redirects to login if not authenticated
function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />
}

function Home() {
  const navigate = useNavigate()
  const [launching, setLaunching] = useState(false)

  function handleTitleClick() {
    setLaunching(true)
    setTimeout(() => {
      if (isAuthenticated()) {
        navigate('/dashboard')
      } else {
        navigate('/login')
      }
    }, 900)
  }

  useEffect(() => {
    const handleScroll = () => {
      const aboutSection = document.getElementById('about')
      const homeNav = document.getElementById('nav-home')
      const aboutNav = document.getElementById('nav-about')
      if (!aboutSection) return
      if (window.scrollY >= aboutSection.offsetTop - 100) {
        homeNav.classList.remove('active')
        aboutNav.classList.add('active')
      } else {
        homeNav.classList.add('active')
        aboutNav.classList.remove('active')
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <nav className="navbar">
        <div className="nav-brand">Playmaker</div>
        <ul className="nav-links">
          <li id="nav-home" className="active"><a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Home</a></li>
          <li id="nav-about"><a href="#about" onClick={(e) => { e.preventDefault(); document.getElementById('about').scrollIntoView({ behavior: 'smooth' }) }}>About Us</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
      </nav>

      <main className="hero-section">
        <div className="hero-content">
          <img src={LOGO_URL} className="hoop-img" alt="Playmaker logo" />
          <div className="hero-text">
            <button
              className={`title-btn${launching ? ' launching' : ''}`}
              onClick={handleTitleClick}
              aria-label="Go to Dashboard"
            >
              <div className="title-row">
                <span className="play-text">PLAY</span>
                <span className="maker-text">MAKER</span>
              </div>
              <div className="title-arrow-row">
                <p className="subtitle">NBA Data Explorer System</p>
                <span className={`title-arrow${launching ? ' arrow-go' : ''}`}>
                  &#8250;
                </span>
              </div>
            </button>
          </div>
        </div>
        <div className="site-url">www.playmaker.com</div>
      </main>

      {/* ── About Section ── */}
      <section id="about" style={{
        padding: '80px 48px 60px',
        background: '#0e0812',
        backgroundImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(90, 20, 110, 0.35) 0%, transparent 70%), radial-gradient(circle, rgba(60, 20, 80, 0.9) 1px, transparent 1px)',
        backgroundSize: 'cover, 22px 22px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '0.04em', color: '#fff', margin: '0 0 8px' }}>
            ABOUT PLAYMAKER
          </h2>
          <p style={{ fontSize: 14, color: '#8899bb', margin: 0 }}>NBA Data Explorer System</p>
        </div>

        <div style={{
          background: 'rgba(29,66,186,0.08)', border: '1px solid rgba(29,66,186,0.2)',
          borderRadius: 8, padding: 24, maxWidth: 900, marginBottom: 48
        }}>
          <p style={{ color: '#c8d4e8', fontSize: 14, lineHeight: 1.8, margin: '0 0 12px' }}>
            Playmaker is a comprehensive NBA statistics and analytics platform designed to provide fans, analysts, and enthusiasts with real-time data about NBA teams, players, and games.
          </p>
          <p style={{ color: '#c8d4e8', fontSize: 14, lineHeight: 1.8, margin: 0 }}>
            Built with modern web technologies, Playmaker combines frontend excellence with robust backend infrastructure to deliver a seamless user experience in exploring NBA statistics.
          </p>
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.08em', color: '#fff', margin: '0 0 28px', borderBottom: '2px solid #1d42ba', paddingBottom: 12 }}>
          OUR DEVELOPMENT TEAM
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 48 }}>
          {[
            { name: 'Jomari Nicoli Colesio', image: 'https://res.cloudinary.com/dc3erz7jd/image/upload/v1779760991/jommm_eyjlzw.jpg', role: 'Full Stack Developer', course: 'BS Computer Science', year: '3rd Year', age: '21 y/o' },
            { name: 'Byron Ace Rivera', image: 'https://res.cloudinary.com/dc3erz7jd/image/upload/v1779760991/bytos_k1chvg.jpg', role: 'Backend Developer', course: 'BS Computer Science', year: '3rd Year', age: '21 y/o' },
            { name: 'Chester Ian Sanpedro', image: 'https://res.cloudinary.com/dc3erz7jd/image/upload/v1779760992/chester_dduwjq.jpg', role: 'Frontend Developer', course: 'BS Computer Science', year: '3rd Year', age: '21 y/o' },
            { name: 'Angel Jan Katigbak', image: 'https://res.cloudinary.com/dc3erz7jd/image/upload/v1779760991/aj_ykuesy.jpg', role: 'UI/UX Designer', course: 'BS Computer Science', year: '3rd Year', age: '21 y/o' },
            { name: 'Hanz Lorenzo', image: 'https://res.cloudinary.com/dc3erz7jd/image/upload/v1779760991/hanz_ok6m7v.jpg', role: 'Database Engineer', course: 'BS Computer Science', year: '3rd Year', age: '21 y/o' },
          ].map((dev, i) => (
            <div key={i} style={{
              background: 'linear-gradient(135deg, rgba(29,66,186,0.1), rgba(29,66,186,0.05))',
              border: '1px solid rgba(29,66,186,0.2)', borderRadius: 12, padding: 24, textAlign: 'center',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ width: 140, height: 140, margin: '0 auto 18px', borderRadius: 12, overflow: 'hidden', border: '3px solid #1d42ba' }}>
                <img src={dev.image} alt={dev.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(dev.name)}&background=1d42ba&color=fff&bold=true&size=200` }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#e0e8ff', margin: '0 0 4px' }}>{dev.name}</h3>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1d42ba', margin: '0 0 16px' }}>{dev.role}</p>
              <div style={{ borderTop: '1px solid rgba(29,66,186,0.2)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['Course', dev.course], ['Year', dev.year], ['Age', dev.age]].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#556080', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
                    <span style={{ color: '#8899bb', fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

    </>
  )
}

function RouteTransition({ children }) {
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const prevPath = useRef(location.pathname)

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname
      setLoading(true)
      const t = setTimeout(() => setLoading(false), 1000)
      return () => clearTimeout(t)
    }
  }, [location.pathname])

  return (
    <>
      {loading && <BballLoader />}
      {children}
    </>
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sessionChecked, setSessionChecked] = useState(false)

  // Check for existing session on app load
  useEffect(() => {
    const checkSession = async () => {
      try {
        // If user has token and is on login page, redirect to dashboard
        if (isAuthenticated() && location.pathname === '/login') {
          navigate('/dashboard', { replace: true })
        }
      } catch (err) {
        console.error('Session check error:', err)
      } finally {
        setSessionChecked(true)
      }
    }

    checkSession()
  }, [location.pathname, navigate])

  // Don't render until session is checked
  if (!sessionChecked) {
    return <BballLoader />
  }

  return (
    <RouteTransition>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/players" element={<ProtectedRoute><Players /></ProtectedRoute>} />
        <Route path="/players/:playerId" element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} />
        <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
        <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
        <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />
      </Routes>
    </RouteTransition>
  )
}

export default App



