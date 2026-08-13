"""
highscore.py
Tiny helper to persist the best score to a local JSON file so it survives
between game sessions.
"""
import json
import os
from settings import HIGHSCORE_FILE


def load_highscore():
    try:
        if os.path.exists(HIGHSCORE_FILE):
            with open(HIGHSCORE_FILE, "r") as f:
                data = json.load(f)
                return int(data.get("highscore", 0))
    except (json.JSONDecodeError, OSError, ValueError):
        pass
    return 0


def save_highscore(score):
    try:
        with open(HIGHSCORE_FILE, "w") as f:
            json.dump({"highscore": score}, f)
    except OSError:
        pass
