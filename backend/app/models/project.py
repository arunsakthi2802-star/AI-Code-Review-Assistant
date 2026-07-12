from beanie import Document
from pydantic import Field
from datetime import datetime, timezone
from typing import Optional, List

class Project(Document):
    name: str
    description: Optional[str] = None
    owner_id: str
    repository_url: Optional[str] = None
    files_count: int = 0
    language: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Settings:
        name = "projects"
