from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.db.models import UserRole


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    created_at: datetime