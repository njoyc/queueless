from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Organization
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationResponse,
)


router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.post("/", response_model=OrganizationResponse)
def create_organization(
    organization: OrganizationCreate,
    db: Session = Depends(get_db),
):
    new_organization = Organization(
        name=organization.name,
        description=organization.description,
    )

    db.add(new_organization)
    db.commit()
    db.refresh(new_organization)

    return new_organization

@router.get("/", response_model=list[OrganizationResponse])
def get_organizations(db: Session = Depends(get_db)):
    organizations = db.query(Organization).all()
    return organizations