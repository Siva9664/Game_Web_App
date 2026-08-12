import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Score(Base):
    __tablename__ = "scores"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    player_name = Column(String(50), default="Guest")
    game_type = Column(String(50), nullable=False, index=True)
    score = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="scores")
