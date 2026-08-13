import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class DrawGuessGame(Base):
    __tablename__ = "draw_guess_games"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    game_session_id = Column(String, ForeignKey("game_sessions.id"), nullable=False, index=True)
    target_word = Column(String(100), nullable=False)
    difficulty = Column(String(20), default="EASY") # EASY, MEDIUM, HARD
    ai_guess = Column(String(100), nullable=True)
    confidence = Column(Float, default=0.0)
    attempts = Column(Integer, default=0)
    duration_seconds = Column(Integer, default=0)
    score = Column(Integer, default=0)
    status = Column(String(20), default="in_progress") # in_progress, won, lost
    created_at = Column(DateTime(timezone=True), default=utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    game_session = relationship("GameSession", back_populates="draw_guess_games")
