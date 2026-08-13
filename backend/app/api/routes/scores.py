from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.score import ScoreCreate, ScoreResponse, LeaderboardEntry
from app.repositories.factory import get_score_repository
from app.models.score import Score

router = APIRouter(prefix="/scores", tags=["Scores"])

@router.get("/leaderboard", response_model=List[LeaderboardEntry])
def get_leaderboard(game: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    repo = get_score_repository(db)
    scores = repo.get_leaderboard(game_type=game, limit=limit)
    return [
        LeaderboardEntry(
            id=s.id,
            player_name=s.player_name or "Player",
            game_type=s.game_type,
            score=s.score,
            created_at=s.created_at
        ) for s in scores
    ]

@router.post("", response_model=ScoreResponse)
def submit_score(req: ScoreCreate, db: Session = Depends(get_db)):
    repo = get_score_repository(db)
    score_entry = Score(
        game_type=req.game_type,
        score=req.score,
        player_name=req.player_name or "Guest"
    )
    saved = repo.create(score_entry)
    return saved
