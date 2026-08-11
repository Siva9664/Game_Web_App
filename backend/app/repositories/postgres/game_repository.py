from typing import Optional, List
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.game import GameSession
from app.models.draw_guess import DrawGuessGame

class PostgresGameRepository(BaseRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, id: str) -> Optional[GameSession]:
        return self.db.query(GameSession).filter(GameSession.id == id).first()

    def list_all(self, limit: int = 100) -> List[GameSession]:
        return self.db.query(GameSession).limit(limit).all()

    def get_user_history(self, user_id: str, limit: int = 50) -> List[GameSession]:
        return self.db.query(GameSession).filter(
            GameSession.user_id == user_id
        ).order_by(GameSession.started_at.desc()).limit(limit).all()

    def create_session(self, session: GameSession) -> GameSession:
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def create_draw_guess(self, dg_game: DrawGuessGame) -> DrawGuessGame:
        self.db.add(dg_game)
        self.db.commit()
        self.db.refresh(dg_game)
        return dg_game

    def get_draw_guess_by_id(self, id: str) -> Optional[DrawGuessGame]:
        return self.db.query(DrawGuessGame).filter(DrawGuessGame.id == id).first()

    def update_draw_guess(self, dg_game: DrawGuessGame) -> DrawGuessGame:
        self.db.commit()
        self.db.refresh(dg_game)
        return dg_game
