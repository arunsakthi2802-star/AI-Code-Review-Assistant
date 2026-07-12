from beanie import Document
from pydantic import EmailStr, Field
from datetime import datetime, timezone
from typing import Optional

class User(Document):
    email: EmailStr
    full_name: str
    hashed_password: str
    role: str = "user" # user or admin
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Settings:
        name = "users"
