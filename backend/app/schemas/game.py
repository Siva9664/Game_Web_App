from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class GameSessionBase(BaseModel):
    game_type: str

class GameSessionCreate(GameSessionBase):
    user_id: Optional[str] = None

class GameSessionResponse(GameSessionBase):
    id: str
    user_id: Optional[str]
    status: str
    score: int
    started_at: datetime
    completed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class GameInfo(BaseModel):
    id: str
    name: str
    description: str
    category: str
    tags: List[str]
    icon: str
    featured: bool = False
    route: str
