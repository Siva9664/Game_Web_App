from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.schemas.game import GameSessionResponse
from app.repositories.factory import get_user_repository
from app.services.game_service import GameService
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.models.user import User

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/signup", response_model=Token)
def signup(req: UserCreate, db: Session = Depends(get_db)):
    repo = get_user_repository(db)
    if repo.get_by_email(req.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if repo.get_by_username(req.username):
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_pwd = get_password_hash(req.password)
    user = User(
        username=req.username,
        email=req.email,
        hashed_password=hashed_pwd,
        avatar=req.avatar or "🦊"
    )
    user = repo.create(user)

    token = create_access_token({"sub": user.id, "email": user.email})
    return Token(access_token=token, user=UserResponse.model_validate(user))

@router.post("/login", response_model=Token)
def login(req: UserLogin, db: Session = Depends(get_db)):
    repo = get_user_repository(db)
    user = repo.get_by_email(req.email)
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.id, "email": user.email})
    return Token(access_token=token, user=UserResponse.model_validate(user))

@router.get("/me", response_model=UserResponse)
def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    repo = get_user_repository(db)
    user = repo.get_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse.model_validate(user)

@router.get("/me/history", response_model=List[GameSessionResponse])
def get_user_game_history(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    game_service = GameService(db)
    history = game_service.get_user_history(payload["sub"])
    return [GameSessionResponse.model_validate(h) for h in history]
