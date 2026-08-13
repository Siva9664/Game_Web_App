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
```
