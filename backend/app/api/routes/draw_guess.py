from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.draw_guess import (
    DrawGuessStartRequest,
    DrawGuessStartResponse,
    GuessSubmissionRequest,
    DrawGuessResultResponse
)
from app.services.draw_guess_service import DrawGuessService

router = APIRouter(prefix="/draw-guess", tags=["Draw & Guess"])

@router.post("/start", response_model=DrawGuessStartResponse)
def start_draw_guess_game(req: DrawGuessStartRequest, db: Session = Depends(get_db)):
    service = DrawGuessService(db)
    dg_game = service.start_game(difficulty=req.difficulty, user_id=req.user_id)
    return DrawGuessStartResponse(
        game_id=dg_game.id,
        target_word=dg_game.target_word,
        difficulty=dg_game.difficulty
    )

@router.get("/{game_id}")
def get_draw_guess_game(game_id: str, db: Session = Depends(get_db)):
    service = DrawGuessService(db)
    dg_game = service.get_game(game_id)
    if not dg_game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "GAME_NOT_FOUND", "message": "Draw & Guess game session not found."}
        )
    return {
        "game_id": dg_game.id,
        "target_word": dg_game.target_word,
        "difficulty": dg_game.difficulty,
        "status": dg_game.status,
        "attempts": dg_game.attempts,
        "score": dg_game.score
    }

@router.post("/{game_id}/guess", response_model=DrawGuessResultResponse)
async def submit_guess(game_id: str, req: GuessSubmissionRequest, db: Session = Depends(get_db)):
    service = DrawGuessService(db)
    try:
        res = await service.evaluate_guess(game_id, req.image_base64)
        return res
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "INVALID_SESSION", "message": str(e)}
        )
