from datetime import datetime

from pydantic import BaseModel
from app.db.models import AppointmentStatus

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

class StaffAppointmentResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    service_id: int
    service_name: str
    start_time: datetime
    end_time: datetime
    status: AppointmentStatus
    created_at: datetime