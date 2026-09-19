from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_roles
from app.db.database import get_db
from app.db.models import Organization, Service, User, UserRole
from app.schemas.service import ServiceCreate, ServiceResponse


router = APIRouter(tags=["Services"])


@router.post(
    "/organizations/{organization_id}/services",
    response_model=ServiceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_service(
    organization_id: int,
    service: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.STAFF, UserRole.ADMIN)
    ),
):
    organization = db.get(Organization, organization_id)

    if not organization:
        raise HTTPException(
            status_code=404,
            detail="Organization not found",
        )

    new_service = Service(
        organization_id=organization_id,
        name=service.name,
        description=service.description,
        duration_minutes=service.duration_minutes,
        price=service.price,
    )

    db.add(new_service)
    db.commit()
    db.refresh(new_service)

    return new_service


@router.get(
    "/organizations/{organization_id}/services",
    response_model=list[ServiceResponse],
)
def get_services(
    organization_id: int,
    db: Session = Depends(get_db),
):
    return (
        db.query(Service)
        .filter(
            Service.organization_id == organization_id,
            Service.active.is_(True),
        )
        .all()
    )


@router.get(
    "/services/{service_id}",
    response_model=ServiceResponse,
)
def get_service(
    service_id: int,
    db: Session = Depends(get_db),
):
    service = db.get(Service, service_id)

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found",
        )

    return service


@router.delete(
    "/services/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def deactivate_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.STAFF, UserRole.ADMIN)
    ),
):
    service = db.get(Service, service_id)

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found",
        )

    service.active = False
    db.commit()