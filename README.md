# Playmaker - NBA Stats & Analytics Dashboard

A full-stack web application for exploring NBA player stats, team information, game schedules, and comparing players in real-time.

## Features

- **Real-time Game Updates** - Live NBA game scores and schedules
- **Player Search & Filtering** - Search players by name, position, team
- **Team Information** - Browse all NBA teams and their rosters
- **Player Comparison** - Compare stats between multiple players side-by-side
- **Smart Caching** - Fast data retrieval with intelligent cache management
- **Responsive UI** - Modern, dark-themed dashboard with smooth interactions
- **Sticky Navigation** - Always-accessible sidebar for quick navigation

## Tech Stack

### Frontend
- **React 19** - UI framework
- **React Router** - Client-side routing
- **Vite** - Build tool & dev server (port 5173)
- **CSS3** - Responsive styling with dark theme

### Backend
- **FastAPI** - Python web framework (port 8000)
- **Uvicorn** - ASGI server with auto-reload
- **nba_api** - Primary NBA data source
- **ESPN API** - Fallback data source
- **Pydantic** - Data validation & models

### APIs
- **nba_api** - Official NBA statistics
- **ESPN Sports API** - Game schedules & scores

### Languages
- **JavaScript** - Frontend (React)
- **Python** - Backend (FastAPI)

## How It Works

```
┌─────────────────┐
│     Browser     │ (http://localhost:5173)
│   React App     │
└────────┬────────┘
         │ HTTP Requests
         ↓
┌─────────────────────────────────────┐
│   FastAPI Backend                   │ (http://localhost:8000)
│   - Request handling                │
│   - Data caching (30min TTL)        │
│   - Error handling & fallbacks      │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌─────────┐ ┌──────────┐
│ nba_api │ │ ESPN API │
│ Primary │ │ Fallback │
└─────────┘ └──────────┘
```

### Request Flow
1. **Frontend** makes API request to backend
2. **Backend** checks cache first (returns if available)
3. If cache miss:
   - **Tries nba_api** (primary source)
   - If fails, **falls back to ESPN API**
   - Caches result for future requests
4. **Returns data** to frontend with metadata
5. **Frontend** renders data in real-time

### Key Features

#### Caching Strategy
- 15 minutes for recent games
- 30 minutes for schedules & teams
- Stale cache fallback during API failures
- Cache statistics available at `/api/health`

#### Error Handling
- Network failures gracefully handled
- Automatic fallback between API sources
- Returns stale cache when both sources fail
- User-friendly error messages

## Getting Started

### Prerequisites
- Node.js 16+
- Python 3.9+
- Virtual environment (venv)

### Installation

```bash
# Install dependencies
npm install
pip install -r backend/requirements.txt
```

### Running Both Servers

```bash
# Start both frontend and backend simultaneously
npm run dev:all

# Or separately:
npm run dev:frontend      # Port 5173
npm run dev:backend       # Port 8000
```

## Deployment

**Frontend**: Vercel, Netlify, or static hosting  
**Backend**: Render, Railway, or Python hosting  
Set `VITE_BACKEND_URL` environment variable to production backend URL.

## Author

Acelix2214
