from beanie import Document
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, List, Dict

class Issue(BaseModel):
    file_path: str
    line_number: Optional[int] = None
    severity: str  # critical, warning, info
    category: str  # security, quality, performance, bug
    description: str
    code_snippet: Optional[str] = None
    suggestion: Optional[str] = None

class Report(Document):
    project_id: str
    overall_score: int
    summary: str
    metrics: Dict[str, int]  # {"security": 90, "quality": 85, "performance": 80, "maintainability": 95}
    issues: List[Issue]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "reports"
