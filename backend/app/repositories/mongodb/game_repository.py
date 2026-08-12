"""
MongoDB Repository stub for future database provider migration.
Activated when DATABASE_PROVIDER=mongodb.
"""
from typing import Optional, List
from app.repositories.base import BaseRepository

class MongoGameRepository(BaseRepository):
    def __init__(self, mongo_client=None):
        self.client = mongo_client

    def get_by_id(self, id: str) -> Optional[dict]:
        raise NotImplementedError("MongoDB repository is configured for future provider support.")

    def list_all(self, limit: int = 100) -> List[dict]:
        raise NotImplementedError("MongoDB repository is configured for future provider support.")
