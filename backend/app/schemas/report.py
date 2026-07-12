from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

class IssueResponse(BaseModel):
    file_path: str
    line_number: Optional[int] = None
    severity: str
    category: str
    description: str
    code_snippet: Optional[str] = None
    suggestion: Optional[str] = None

class ReportResponse(BaseModel):
    id: str
    project_id: str
    overall_score: int
    summary: str
    metrics: Dict[str, int]
    issues: List[IssueResponse]
    created_at: datetime
