from sqlalchemy.orm import Session
from app.core.config import settings
from app.repositories.postgres.user_repository import PostgresUserRepository
from app.repositories.postgres.game_repository import PostgresGameRepository
from app.repositories.postgres.score_repository import PostgresScoreRepository
from app.repositories.mongodb.game_repository import MongoGameRepository

def get_user_repository(db: Session):
    if settings.DATABASE_PROVIDER == "mongodb":
        # Returns MongoDB implementation when active
        return None
    return PostgresUserRepository(db)

def get_game_repository(db: Session):
    if settings.DATABASE_PROVIDER == "mongodb":
        return MongoGameRepository()
    return PostgresGameRepository(db)

def get_score_repository(db: Session):
    if settings.DATABASE_PROVIDER == "mongodb":
        return None
    return PostgresScoreRepository(db)
