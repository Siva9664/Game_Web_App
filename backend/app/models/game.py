import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    game_type = Column(String(50), nullable=False, index=True) # e.g. 'draw-guess', 'snakes', 'tictactoe', etc.
    status = Column(String(20), default="active") # active, completed, abandoned
    score = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), default=utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="game_sessions")
    draw_guess_games = relationship("DrawGuessGame", back_populates="game_session", cascade="all, delete-orphan")
