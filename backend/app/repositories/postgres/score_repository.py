from typing import Optional, List
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.score import Score

class PostgresScoreRepository(BaseRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, id: str) -> Optional[Score]:
        return self.db.query(Score).filter(Score.id == id).first()

    def list_all(self, limit: int = 100) -> List[Score]:
        return self.db.query(Score).limit(limit).all()

    def get_leaderboard(self, game_type: Optional[str] = None, limit: int = 50) -> List[Score]:
        query = self.db.query(Score)
        if game_type:
            query = query.filter(Score.game_type == game_type)
        return query.order_by(Score.score.desc()).limit(limit).all()

    def create(self, score: Score) -> Score:
        self.db.add(score)
        self.db.commit()
        self.db.refresh(score)
        return score
