import os
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "Game Web App"
    APP_ENV: str = "development"
    DEBUG: bool = True
    
    DATABASE_PROVIDER: Literal["postgres", "mongodb"] = "postgres"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/game_web_app"
    
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "game_web_app"
    
    SECRET_KEY: str = "super-secret-key-change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    FRONTEND_URL: str = "http://localhost:5173"
    
    AI_API_KEY: str = ""
    AI_MODEL: str = "gpt-4o-mini"
    VISION_MODEL: str = "gpt-4o-mini"
    
    PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
