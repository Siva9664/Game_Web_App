from typing import Optional, List
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.user import User

class PostgresUserRepository(BaseRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, id: str) -> Optional[User]:
        return self.db.query(User).filter(User.id == id).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_by_username(self, username: str) -> Optional[User]:
        return self.db.query(User).filter(User.username == username).first()

    def list_all(self, limit: int = 100) -> List[User]:
        return self.db.query(User).limit(limit).all()

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
