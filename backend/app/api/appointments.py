from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import (
    Appointment,
    AppointmentStatus,
    Service,
    User,
)
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
)


router = APIRouter(
    prefix="/appointments",
    tags=["Appointments"],
)


@router.post(
    "/",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = db.get(Service, appointment.service_id)

    if not service or not service.active:
        raise HTTPException(
            status_code=404,
            detail="Service not found",
        )

    end_time = appointment.start_time + timedelta(
        minutes=service.duration_minutes
    )

    conflicting_appointment = (
        db.query(Appointment)
        .filter(
            Appointment.service_id == appointment.service_id,
            Appointment.status == AppointmentStatus.BOOKED,
            Appointment.start_time < end_time,
            Appointment.end_time > appointment.start_time,
        )
        .first()
    )

    if conflicting_appointment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time slot is already booked",
        )

    new_appointment = Appointment(
        user_id=current_user.id,
        service_id=service.id,
        start_time=appointment.start_time,
        end_time=end_time,
    )

    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)

    return new_appointment


@router.get(
    "/",
    response_model=list[AppointmentResponse],
)
def get_my_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Appointment)
        .filter(Appointment.user_id == current_user.id)
        .order_by(Appointment.start_time)
        .all()
    )

@router.patch(
    "/{appointment_id}/cancel",
    response_model=AppointmentResponse,
)
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appointment = db.get(Appointment, appointment_id)

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found",
        )

    if appointment.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot modify this appointment",
        )

    if appointment.status != AppointmentStatus.BOOKED:
        raise HTTPException(
            status_code=400,
            detail="Appointment cannot be cancelled",
        )

    appointment.status = AppointmentStatus.CANCELLED

    db.commit()
    db.refresh(appointment)

    return appointment