from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_roles
from app.db.database import get_db
from app.db.models import (
    Appointment,
    AppointmentStatus,
    Service,
    User,
    UserRole,
)
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    StaffAppointmentResponse,
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

@router.get(
    "/staff/all",
    response_model=list[StaffAppointmentResponse],
)
def get_all_appointments_for_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.STAFF, UserRole.ADMIN)
    ),
):
    appointments = (
        db.query(Appointment, User, Service)
        .join(User, Appointment.user_id == User.id)
        .join(Service, Appointment.service_id == Service.id)
        .order_by(Appointment.start_time.asc())
        .all()
    )

    return [
        StaffAppointmentResponse(
            id=appointment.id,
            user_id=user.id,
            user_name=user.name,
            user_email=user.email,
            service_id=service.id,
            service_name=service.name,
            start_time=appointment.start_time,
            end_time=appointment.end_time,
            status=appointment.status,
            created_at=appointment.created_at,
        )
        for appointment, user, service in appointments
    ]

@router.patch(
    "/{appointment_id}/complete",
    response_model=AppointmentResponse,
)
def complete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.STAFF, UserRole.ADMIN)
    ),
):
    appointment = db.get(Appointment, appointment_id)

    if appointment is None:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found",
        )

    if appointment.status != AppointmentStatus.BOOKED:
        raise HTTPException(
            status_code=400,
            detail="Only booked appointments can be completed",
        )

    appointment.status = AppointmentStatus.COMPLETED

    db.commit()
    db.refresh(appointment)

    return appointment


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