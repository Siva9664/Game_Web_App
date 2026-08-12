from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.game import GameInfo
from app.services.game_service import GameService

router = APIRouter(prefix="/games", tags=["Games"])

@router.get("", response_model=List[GameInfo])
def get_all_games(db: Session = Depends(get_db)):
    service = GameService(db)
    return service.list_games()

@router.get("/{game_id}", response_model=GameInfo)
def get_game_by_id(game_id: str, db: Session = Depends(get_db)):
    service = GameService(db)
    game = service.get_game_info(game_id)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "INVALID_GAME", "message": f"Game '{game_id}' does not exist."}
        )
    return game
