import Layout from '../components/Layout'
import './About.css'

const DEVELOPERS = [
  {
    id: 1,
    name: 'Jomari Nicoli Colesio',
    image: 'https://res.cloudinary.com/dc3erz7jd/image/upload/v1779760991/jommm_eyjlzw.jpg',
    course: 'BS in Computer Science',
    year: '3rd Year',
    age: '21 y/o',
    role: 'Full Stack Developer'
  },
  {
    id: 2,
    name: 'Byron Ace Rivera',
    image: 'https://res.cloudinary.com/dc3erz7jd/image/upload/v1779760991/bytos_k1chvg.jpg',
    course: 'BS in Computer Science in Computer Science',
    year: '3rd Year',
    age: '21 y/o',
    role: 'Backend Developer'
  },
  {
    id: 3,
    name: 'Chester Ian Sanpedro',
    image: 'https://res.cloudinary.com/dc3erz7jd/image/upload/v1779760992/chester_dduwjq.jpg',
    course: 'BS in Computer Science in Computer Science',
    year: '3rd Year',
    age: '21 y/o',
    role: 'Frontend Developer'
  },
  {
    id: 4,
    name: 'Angel Jan Katigbak',
    image: 'https://res.cloudinary.com/dc3erz7jd/image/upload/v1779760991/aj_ykuesy.jpg',
    course: 'BS in Computer Science',
    year: '3rd Year',
    age: '21 y/o',
    role: 'Full stack Developer'
  },
  {
    id: 5,
    name: 'Hanz Lorenzo',
    image: 'https://res.cloudinary.com/dc3erz7jd/image/upload/v1779760991/hanz_ok6m7v.jpg',
    course: 'BS in Computer Science',
    year: '3rd Year',
    age: '21 y/o',
    role: 'Database Engineer'
  }
]

export default function About() {
  return (
    <Layout>
      <div className="about-page">
        {/* Header */}
        <div className="about-header">
          <div className="about-breadcrumb">
            <span className="about-bc-root">Stats Home</span>
            <span className="about-bc-sep">/</span>
            <span className="about-bc-cur">About Us</span>
          </div>
          <div className="about-title-section">
            <h1 className="about-title">ABOUT PLAYMAKER</h1>
            <p className="about-subtitle">NBA Data Explorer System</p>
          </div>
        </div>

        {/* Description */}
        <div className="about-description">
          <p>
            Playmaker is a comprehensive NBA statistics and analytics platform designed to provide fans, analysts, and enthusiasts with real-time data about NBA teams, players, and games. Our mission is to make NBA data accessible and engaging for everyone.
          </p>
          <p>
            Built with modern web technologies, Playmaker combines frontend excellence with robust backend infrastructure to deliver a seamless user experience in exploring NBA statistics.
          </p>
        </div>

        {/* Team Section */}
        <div className="about-team-section">
          <h2 className="about-team-title">OUR DEVELOPMENT TEAM</h2>
          <div className="about-developers-grid">
            {DEVELOPERS.map(dev => (
              <div key={dev.id} className="about-dev-card">
                <div className="about-dev-image-wrapper">
                  <img 
                    src={dev.image} 
                    alt={dev.name}
                    className="about-dev-image"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(dev.name)}&background=4d72f0&color=fff&bold=true&size=200`
                    }}
                  />
                </div>
                <div className="about-dev-info">
                  <h3 className="about-dev-name">{dev.name}</h3>
                  <p className="about-dev-role">{dev.role}</p>
                  <div className="about-dev-details">
                    <div className="about-dev-detail">
                      <span className="about-detail-label">Course:</span>
                      <span className="about-detail-value">{dev.course}</span>
                    </div>
                    <div className="about-dev-detail">
                      <span className="about-detail-label">Year:</span>
                      <span className="about-detail-value">{dev.year}</span>
                    </div>
                    <div className="about-dev-detail">
                      <span className="about-detail-label">Age:</span>
                      <span className="about-detail-value">{dev.age}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="about-tech-section">
          <h2 className="about-tech-title">TECHNOLOGY STACK</h2>
          <div className="about-tech-grid">
            <div className="about-tech-card">
              <h4>Frontend</h4>
              <p>React 19.2.6</p>
              <p>Vite 8.0.12</p>
              <p>React Router 7.15.0</p>
            </div>
            <div className="about-tech-card">
              <h4>Backend</h4>
              <p>FastAPI</p>
              <p>Uvicorn</p>
              <p>Python 3.14.5</p>
            </div>
            <div className="about-tech-card">
              <h4>Data Source</h4>
              <p>nba_api Library</p>
              <p>NBA Stats Endpoints</p>
              <p>Real-time Data</p>
            </div>
            <div className="about-tech-card">
              <h4>Features</h4>
              <p>Live Standings</p>
              <p>Player Comparison</p>
              <p>Game Schedule</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
