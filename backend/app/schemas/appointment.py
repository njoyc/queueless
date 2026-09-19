from datetime import datetime

from pydantic import BaseModel


class AppointmentCreate(BaseModel):
    service_id: int
    start_time: datetime


class AppointmentResponse(BaseModel):
    id: int
    user_id: int
    service_id: int
    start_time: datetime
    end_time: datetime
    status: str
    created_at: datetime