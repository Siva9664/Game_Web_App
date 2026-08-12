from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class ScoreCreate(BaseModel):
    game_type: str
    score: int
    player_name: Optional[str] = "Guest"

class ScoreResponse(ScoreCreate):
    id: str
    user_id: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class LeaderboardEntry(BaseModel):
    id: str
    player_name: str
    game_type: str
    score: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
