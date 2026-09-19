from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import WebSocket, WebSocketDisconnect

from app.core.websocket_manager import manager
from app.core.dependencies import get_current_user, require_roles
from app.db.database import get_db
from app.db.models import (
    QueueEntry,
    QueueStatus,
    Service,
    User,
    UserRole,
)
from app.schemas.queue import (
    QueueEntryResponse,
    QueueJoinRequest,
    QueueStatusResponse,
)


router = APIRouter(
    prefix="/queue",
    tags=["Queue"],
)

async def broadcast_queue_state(
    service_id: int,
    db: Session,
):
    waiting_count = (
        db.query(QueueEntry)
        .filter(
            QueueEntry.service_id == service_id,
            QueueEntry.status == QueueStatus.WAITING,
        )
        .count()
    )

    current_entry = (
        db.query(QueueEntry)
        .filter(
            QueueEntry.service_id == service_id,
            QueueEntry.status == QueueStatus.SERVING,
        )
        .first()
    )

    await manager.broadcast(
        service_id,
        {
            "event": "queue_updated",
            "service_id": service_id,
            "waiting_count": waiting_count,
            "current_token": (
                current_entry.token_number
                if current_entry
                else None
            ),
        },
    )


@router.post(
    "/join",
    response_model=QueueEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def join_queue(
    request: QueueJoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = db.get(Service, request.service_id)

    if not service or not service.active:
        raise HTTPException(
            status_code=404,
            detail="Service not found",
        )

    existing_entry = (
        db.query(QueueEntry)
        .filter(
            QueueEntry.service_id == request.service_id,
            QueueEntry.user_id == current_user.id,
            QueueEntry.status.in_(
                [QueueStatus.WAITING, QueueStatus.SERVING]
            ),
        )
        .first()
    )

    if existing_entry:
        raise HTTPException(
            status_code=400,
            detail="You are already in this queue",
        )

    last_token = (
        db.query(func.max(QueueEntry.token_number))
        .filter(QueueEntry.service_id == service.id)
        .scalar()
    )

    next_token = (last_token or 0) + 1

    entry = QueueEntry(
        service_id=service.id,
        user_id=current_user.id,
        token_number=next_token,
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    await broadcast_queue_state(service.id, db)

    return entry

@router.get(
    "/{service_id}/status",
    response_model=QueueStatusResponse,
)
def queue_status(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    waiting_entries = (
        db.query(QueueEntry)
        .filter(
            QueueEntry.service_id == service_id,
            QueueEntry.status == QueueStatus.WAITING,
        )
        .order_by(QueueEntry.joined_at)
        .all()
    )

    serving_entry = (
        db.query(QueueEntry)
        .filter(
            QueueEntry.service_id == service_id,
            QueueEntry.status == QueueStatus.SERVING,
        )
        .first()
    )

    my_entry = (
        db.query(QueueEntry)
        .filter(
            QueueEntry.service_id == service_id,
            QueueEntry.user_id == current_user.id,
            QueueEntry.status.in_(
                [QueueStatus.WAITING, QueueStatus.SERVING]
            ),
        )
        .first()
    )

    position = None

    if my_entry and my_entry.status == QueueStatus.WAITING:
        position = next(
            (
                index + 1
                for index, entry in enumerate(waiting_entries)
                if entry.id == my_entry.id
            ),
            None,
        )

    return QueueStatusResponse(
        service_id=service_id,
        waiting_count=len(waiting_entries),
        current_token=(
            serving_entry.token_number
            if serving_entry
            else None
        ),
        my_token=(
            my_entry.token_number
            if my_entry
            else None
        ),
        my_position=position,
    )


@router.post(
    "/{service_id}/next",
    response_model=QueueEntryResponse,
)
async def call_next(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.STAFF, UserRole.ADMIN)
    ),
):
    current_serving = (
        db.query(QueueEntry)
        .filter(
            QueueEntry.service_id == service_id,
            QueueEntry.status == QueueStatus.SERVING,
        )
        .first()
    )

    if current_serving:
        raise HTTPException(
            status_code=400,
            detail="A customer is already being served",
        )

    next_entry = (
        db.query(QueueEntry)
        .filter(
            QueueEntry.service_id == service_id,
            QueueEntry.status == QueueStatus.WAITING,
        )
        .order_by(QueueEntry.joined_at)
        .with_for_update()
        .first()
    )

    if not next_entry:
        raise HTTPException(
            status_code=404,
            detail="Queue is empty",
        )

    next_entry.status = QueueStatus.SERVING
    next_entry.called_at = datetime.utcnow()

    db.commit()
    db.refresh(next_entry)

    await broadcast_queue_state(service_id, db)

    return next_entry


@router.post(
    "/entry/{entry_id}/complete",
    response_model=QueueEntryResponse,
)
async def complete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.STAFF, UserRole.ADMIN)
    ),
):
    entry = db.get(QueueEntry, entry_id)

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Queue entry not found",
        )

    if entry.status != QueueStatus.SERVING:
        raise HTTPException(
            status_code=400,
            detail="Customer is not currently being served",
        )

    entry.status = QueueStatus.COMPLETED
    entry.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(entry)

    service_id = entry.service_id

    await broadcast_queue_state(service_id, db)

    return entry

@router.websocket("/{service_id}/ws")
async def queue_websocket(
    websocket: WebSocket,
    service_id: int,
):
    await manager.connect(service_id, websocket)

    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect(service_id, websocket)