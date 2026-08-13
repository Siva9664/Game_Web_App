<<<<<<< HEAD
# Crossy Road (Pygame Edition)

A 2D "Crossy Road"-style endless hopper built with Pygame.

## Run it

```bash
pip install -r requirements.txt
python main.py
```

## Controls

- **Arrow keys** or **WASD** — hop one tile at a time
- **Enter / Space** — start game / restart after game over
- **Tab** (on the start menu) — cycle player skin color

## How it works

- **grid & camera**: everything moves on a fixed 64x64 px tile grid. The
  camera scrolls upward continuously and also snaps to keep pace with your
  best progress — fall too far behind it and it's game over.
- **grass**: safe.
- **roads**: cars loop across the screen at varying speed; touching one ends
  the run.
- **rivers**: logs float across; you must ride one or you drown. Moving with
  a log (or off the edge of the world) can also end your run.
- **difficulty**: the further you climb, the faster/denser the traffic and
  rivers become, and the faster the camera creeps.
- **high score**: saved locally to `highscore.json` next to the game files.
- **sound**: hop/crash/splash/score sound effects are synthesized in code
  (no external audio assets required). Optional background music: drop a
  `music.ogg` file next to `main.py` and it will loop automatically.

## Project structure

```
main.py        - entry point / game loop
settings.py    - constants (tile size, colors, tuning values)
game.py        - state machine (menu/playing/game over), camera, HUD
player.py      - grid-hopping player character
lane.py        - Lane class + procedural LaneFactory
obstacle.py    - Car / Log moving obstacles
sound.py       - procedurally generated sound effects
highscore.py   - local JSON high score persistence
=======
# 🎮 Game Web App

A deployable, full-stack browser arcade platform featuring classic retro games and the flagship **🎨 Draw & Guess** game powered by FastAPI, PostgreSQL, and React.

---

## 🚀 Features

- **🎨 Draw & Guess**: Interactive canvas game supporting pointer/mouse/touch inputs, canvas tools (Pencil, Eraser, Color Palette, Undo/Redo, Size Slider), word banks (Easy, Medium, Hard), and real-time AI vision evaluation.
- **🐍 Retro Arcade Collection**: Preserved full-working browser games including Snake & Ladder, Tic-Tac-Toe, Memory Match, Classic Snake, and 2048.
- **🏆 Global Leaderboard**: Persistent high-score rankings stored in PostgreSQL.
- **🛡️ Secure Backend**: FastAPI with strict Pydantic schema validation, JWT auth, and server-side score calculation.
- **🔌 MongoDB Migration Ready**: Repository pattern abstraction (`app/repositories/factory.py`) allowing seamless switching between PostgreSQL and MongoDB via `DATABASE_PROVIDER=postgres|mongodb`.
- **🐳 Dockerized**: Production ready with Docker Compose (PostgreSQL, FastAPI Backend, React Frontend).

---

## 🏗️ Tech Stack & Layering Architecture

```text
Frontend (React + TS + Vite + Tailwind)
                  ↓
          REST API (/api/v1)
                  ↓
          FastAPI (Python 3.11)
                  ↓
     Schemas (Pydantic Validation)
                  ↓
          Services (Game, Scoring, Vision)
                  ↓
   Repository Factory Layer (Abstract Base)
        ├── PostgreSQL Repository (SQLAlchemy) [Default]
        └── MongoDB Repository Stub (Future Provider)
```

---

## 🛠️ Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.11+ (for local backend development)
- Node.js 18+ (for local frontend development)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/Siva9664/Game_Web_App.git
cd Game_Web_App

# Launch entire stack with Docker Compose
docker-compose up --build
```

Access the application at:
- **Frontend App**: `http://localhost`
- **Backend API**: `http://localhost:8000`
- **Swagger Docs**: `http://localhost:8000/docs`

---

## 🧪 Running Tests

### Backend Unit Tests
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pytest
```

---

## 📁 Project Structure

```text
Game_Web_App/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # Health, games, draw_guess, scores, users
│   │   ├── core/            # Config, security, logging
│   │   ├── db/              # SQLAlchemy engine & sessions
│   │   ├── models/          # User, GameSession, Score, DrawGuessGame
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── repositories/    # Factory + Postgres & MongoDB implementations
│   │   ├── services/        # Scoring, DrawGuess, Vision, Game services
│   │   └── main.py          # FastAPI application entry
│   ├── alembic/             # Migration files
│   ├── tests/               # Pytest suite
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, Footer, GameCard, Spinner, ErrorState
│   │   ├── pages/           # Home, Games, DrawGuess, Leaderboard, Profile
│   │   ├── services/        # API client modules
│   │   ├── types/           # TS interfaces
│   │   └── App.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
>>>>>>> c9133e7a067cbd1d8201f41cc07f84fe9fbfaa7e
```
