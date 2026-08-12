import random
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.repositories.factory import get_game_repository, get_score_repository
from app.models.game import GameSession
from app.models.draw_guess import DrawGuessGame
from app.models.score import Score
from app.services.ai.vision_service import VisionService
from app.services.scoring_service import ScoringService
from app.schemas.draw_guess import DrawGuessResultResponse

WORD_BANK = {
    "EASY": [
        "Apple", "Cat", "Dog", "House", "Tree",
        "Car", "Sun", "Star", "Ball", "Fish"
    ],
    "MEDIUM": [
        "Rocket", "Robot", "Airplane", "Bicycle", "Guitar",
        "Camera", "Computer", "Umbrella", "Helicopter"
    ],
    "HARD": [
        "Astronaut", "Volcano", "Castle", "Treasure",
        "Dragon", "Time Machine", "Adventure"
    ]
}

def utcnow():
    return datetime.now(timezone.utc)

class DrawGuessService:
    def __init__(self, db: Session):
        self.db = db
        self.game_repo = get_game_repository(db)
        self.score_repo = get_score_repository(db)
        self.vision_service = VisionService()

    def start_game(self, difficulty: str = "EASY", user_id: Optional[str] = None) -> DrawGuessGame:
        diff_upper = difficulty.upper()
        words = WORD_BANK.get(diff_upper, WORD_BANK["EASY"])
        target_word = random.choice(words)

        # 1. Create parent GameSession
        session = GameSession(
            user_id=user_id,
            game_type="draw-guess",
            status="active"
        )
        session = self.game_repo.create_session(session)

        # 2. Create DrawGuessGame record
        dg_game = DrawGuessGame(
            game_session_id=session.id,
            target_word=target_word,
            difficulty=diff_upper,
            status="in_progress"
        )
        return self.game_repo.create_draw_guess(dg_game)

    def get_game(self, game_id: str) -> Optional[DrawGuessGame]:
        return self.game_repo.get_draw_guess_by_id(game_id)

    async def evaluate_guess(self, game_id: str, image_base64: str) -> DrawGuessResultResponse:
        dg_game = self.game_repo.get_draw_guess_by_id(game_id)
        if not dg_game:
            raise ValueError("Game not found")

        dg_game.attempts += 1
        
        # Call Vision Service
        ai_res = await self.vision_service.identify_drawing(image_base64, dg_game.target_word)
        
        dg_game.ai_guess = ai_res.guess
        dg_game.confidence = ai_res.confidence

        is_correct = (
            ai_res.guess.strip().lower() == dg_game.target_word.strip().lower() or
            dg_game.target_word.strip().lower() in [alt.strip().lower() for alt in ai_res.alternatives]
        )

        if is_correct:
            dg_game.status = "won"
            dg_game.completed_at = utcnow()
            
            duration = int((dg_game.completed_at - dg_game.created_at).total_seconds())
            dg_game.duration_seconds = max(1, duration)

            # Score calculation via ScoringService
            score_val = ScoringService.calculate_draw_guess_score(
                difficulty=dg_game.difficulty,
                confidence=dg_game.confidence,
                duration_seconds=dg_game.duration_seconds,
                attempts=dg_game.attempts
            )
            dg_game.score = score_val

            # Update parent session
            if dg_game.game_session:
                dg_game.game_session.status = "completed"
                dg_game.game_session.score = score_val
                dg_game.game_session.completed_at = dg_game.completed_at

            # Add to leaderboard/scores table
            score_entry = Score(
                user_id=dg_game.game_session.user_id if dg_game.game_session else None,
                game_type="draw-guess",
                score=score_val,
                player_name="Player"
            )
            self.score_repo.create(score_entry)
        
        self.game_repo.update_draw_guess(dg_game)

        return DrawGuessResultResponse(
            game_id=dg_game.id,
            target_word=dg_game.target_word,
            ai_guess=dg_game.ai_guess or "",
            confidence=dg_game.confidence,
            is_correct=is_correct,
            score=dg_game.score,
            attempts=dg_game.attempts,
            status=dg_game.status,
            completed_at=dg_game.completed_at or utcnow()
        )
