from datetime import datetime

from pydantic import BaseModel


class ServiceCreate(BaseModel):
    name: str
    description: str | None = None
    duration_minutes: int
    price: float


class ServiceResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    description: str | None
    duration_minutes: int
    price: float
    active: bool
    created_at: datetime