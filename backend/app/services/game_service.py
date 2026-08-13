from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.factory import get_game_repository
from app.models.game import GameSession
from app.schemas.game import GameInfo

class GameService:
    GAMES_REGISTRY = [
        GameInfo(
            id="draw-guess",
            name="Draw & Guess",
            description="Draw the word on canvas and let AI test its vision skills!",
            category="Creative",
            tags=["AI", "Creative", "Solo/Party", "New"],
            icon="🎨",
            featured=True,
            route="/games/draw-guess"
        ),
        GameInfo(
            id="snakes",
            name="Snake & Ladder",
            description="2–4 players, AI opponents, power-ups, animated SVG snakes & ladders.",
            category="Board",
            tags=["2-4 Players", "AI", "Power-ups"],
            icon="🐍",
            featured=True,
            route="/games/snakes"
        ),
        GameInfo(
            id="tictactoe",
            name="Tic-Tac-Toe",
            description="Classic 3×3 strategy. Play a friend or face an unbeatable AI.",
            category="Board",
            tags=["2 Players", "AI"],
            icon="❌",
            route="/games/tictactoe"
        ),
        GameInfo(
            id="memory",
            name="Memory Match",
            description="Flip cards, find pairs. Test your memory against the clock.",
            category="Puzzle",
            tags=["Solo", "Timer"],
            icon="🃏",
            route="/games/memory"
        ),
        GameInfo(
            id="snake",
            name="Classic Snake",
            description="The legendary arcade snake. Eat, grow, survive. Beat your high score.",
            category="Arcade",
            tags=["Solo", "Arcade"],
            icon="🕹️",
            route="/games/snake"
        ),
        GameInfo(
            id="puzzle2048",
            name="2048",
            description="Slide tiles, merge numbers, reach 2048. Deceptively deep strategy.",
            category="Puzzle",
            tags=["Solo", "Puzzle"],
            icon="🔢",
            route="/games/puzzle2048"
        )
    ]

    def __init__(self, db: Session):
        self.repo = get_game_repository(db)

    def list_games(self) -> List[GameInfo]:
        return self.GAMES_REGISTRY

    def get_game_info(self, game_id: str) -> Optional[GameInfo]:
        return next((g for g in self.GAMES_REGISTRY if g.id == game_id), None)

    def get_user_history(self, user_id: str) -> List[GameSession]:
        return self.repo.get_user_history(user_id)
