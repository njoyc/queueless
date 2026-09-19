from datetime import datetime

from pydantic import BaseModel


class QueueJoinRequest(BaseModel):
    service_id: int


class QueueEntryResponse(BaseModel):
    id: int
    service_id: int
    user_id: int
    token_number: int
    status: str
    joined_at: datetime
    called_at: datetime | None
    completed_at: datetime | None


class QueueStatusResponse(BaseModel):
    service_id: int
    waiting_count: int
    current_token: int | None
    current_entry_id: int | None
    my_token: int | None
    my_position: int | None