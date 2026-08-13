"""
settings.py
Global constants used throughout the game: tile grid size, screen
dimensions, colors, and gameplay tuning values. Keeping these in one
place makes it easy to re-balance the game without hunting through code.
"""

import os

# --- Grid / screen -------------------------------------------------------
TILE_SIZE = 64                 # every lane / obstacle / player cell is 64x64 px
GRID_COLS = 13                 # how many tiles fit across the screen
GRID_ROWS = 9                  # how many tiles fit down the screen
SCREEN_WIDTH = TILE_SIZE * GRID_COLS
SCREEN_HEIGHT = TILE_SIZE * GRID_ROWS
FPS = 60

# --- Colors ----------------------------------------------------------------
WHITE = (255, 255, 255)
BLACK = (20, 20, 20)
GRASS_GREEN = (108, 191, 74)
GRASS_GREEN_DARK = (94, 173, 63)
ROAD_GRAY = (70, 70, 78)
ROAD_LINE = (230, 200, 60)
RIVER_BLUE = (64, 138, 214)
RIVER_BLUE_DARK = (52, 120, 191)
LOG_BROWN = (133, 94, 66)
LOG_BROWN_DARK = (110, 76, 52)
CAR_COLORS = [(214, 73, 51), (51, 122, 214), (214, 178, 51),
              (155, 78, 214), (51, 214, 158)]
PLAYER_COLORS = {
    "white": (250, 250, 250),
    "blue": (70, 140, 240),
    "yellow": (250, 210, 60),
    "pink": (240, 110, 170),
}
PLAYER_OUTLINE = (40, 40, 40)
UI_TEXT = (255, 255, 255)
UI_SHADOW = (0, 0, 0)
MENU_BG = (30, 34, 40)

# --- Gameplay tuning ---------------------------------------------------------
HOP_DURATION = 0.11             # seconds for one grid hop animation
SAFE_START_ROWS = 4             # number of guaranteed-safe grass rows at the start

BASE_CAMERA_CREEP = 26          # px/sec the camera always creeps forward (up)
CAMERA_CREEP_PER_SCORE = 0.12   # how much creep speed grows with score
CAMERA_CATCHUP_OFFSET = TILE_SIZE * 5  # how far ahead of camera the player may roam

BASE_CAR_SPEED = 90             # px/sec
BASE_LOG_SPEED = 70
DIFFICULTY_ROW_SCALE = 0.01     # how quickly difficulty ramps with distance travelled

HIGHSCORE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "highscore.json")
