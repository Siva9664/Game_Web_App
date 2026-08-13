from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class DrawGuessStartRequest(BaseModel):
    difficulty: str = "EASY" # EASY, MEDIUM, HARD
    user_id: Optional[str] = None

class DrawGuessStartResponse(BaseModel):
    game_id: str
    target_word: str
    difficulty: str

class GuessSubmissionRequest(BaseModel):
    image_base64: str

class AIGuessResult(BaseModel):
    guess: str
    confidence: float
    alternatives: List[str] = []

class DrawGuessResultResponse(BaseModel):
    game_id: str
    target_word: str
    ai_guess: str
    confidence: float
    is_correct: bool
    score: int
    attempts: int
    status: str
    completed_at: datetime
