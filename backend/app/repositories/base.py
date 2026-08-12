from abc import ABC, abstractmethod
from typing import List, Optional, Any

class BaseRepository(ABC):
    @abstractmethod
    def get_by_id(self, id: str) -> Optional[Any]:
        pass

    @abstractmethod
    def list_all(self, limit: int = 100) -> List[Any]:
        pass
