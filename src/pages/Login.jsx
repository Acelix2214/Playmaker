import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signup, login } from '../services/backendApi'
import './Login.css'

const LOGO_URL = 'https://res.cloudinary.com/dv3eeuy4b/image/upload/v1778557328/LOGO_umlvbk.png'

function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        // Validation
        if (!form.name || !form.email || !form.password || !form.confirm) {
          setError('Please fill in all fields.')
          setLoading(false)
          return
        }
        if (form.password !== form.confirm) {
          setError('Passwords do not match.')
          setLoading(false)
          return
        }
        if (form.password.length < 6) {
          setError('Password must be at least 6 characters.')
          setLoading(false)
          return
        }

        // Call signup API
        await signup(form.email, form.name, form.password)
        navigate('/dashboard')
      } else {
        // Validation
        if (!form.email || !form.password) {
          setError('Please fill in all fields.')
          setLoading(false)
          return
        }

        // Call login API
        await login(form.email, form.password)
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.')
      setLoading(false)
    }
  }

  function switchMode(m) {
    setMode(m)
    setError('')
    setForm({ name: '', email: '', password: '', confirm: '' })
  }

  return (
    <>
      {/* Same navbar as Home */}
      <nav className="navbar">
        <div className="nav-brand">Playmaker</div>
        <ul className="nav-links">
          <li><a href="/">Home</a></li>
          <li><a href="#">About Us</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
      </nav>

      {/* Same hero background */}
      <main className="login-hero">
        <div className="login-hero-bg">
          <img src={LOGO_URL} className="login-bg-hoop" alt="" aria-hidden="true" />
          <div className="login-bg-glow" />
        </div>

        {/* Card */}
        <div className="login-card">
          {/* Toggle */}
          <div className="login-toggle">
            <button
              className={`login-toggle-btn${mode === 'login' ? ' active' : ''}`}
              onClick={() => switchMode('login')}
              disabled={loading}
            >
              Login
            </button>
            <button
              className={`login-toggle-btn${mode === 'signup' ? ' active' : ''}`}
              onClick={() => switchMode('signup')}
              disabled={loading}
            >
              Sign Up
            </button>
            <div className={`login-toggle-slider${mode === 'signup' ? ' right' : ''}`} />
          </div>

          <h2 className="login-card-title">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="login-card-sub">
            {mode === 'login'
              ? 'Sign in to access NBA stats & analytics'
              : 'Join Playmaker and explore NBA data'}
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="login-field">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Juan Dela Cruz"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  disabled={loading}
                />
              </div>
            )}

            <div className="login-field">
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="you@email.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="login-field">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                disabled={loading}
              />
            </div>

            {mode === 'signup' && (
              <div className="login-field">
                <label>Confirm Password</label>
                <input
                  type="password"
                  name="confirm"
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            )}

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Loading...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
              <span className="login-submit-arrow">›</span>
            </button>
          </form>

          <p className="login-switch-text">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              className="login-switch-link"
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </main>
    </>
  )
}

export default Login
