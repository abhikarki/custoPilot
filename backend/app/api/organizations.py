from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from slugify import slugify
import re

from app.db import get_db, Organization, Department, User
from app.schemas import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse,
    DepartmentCreate, DepartmentResponse
)
from app.core.security import get_current_user, require_admin

router = APIRouter(redirect_slashes=False)


def create_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug


def get_user_id(current_user: dict) -> UUID:
    user_id = current_user.get("sub")
    if isinstance(user_id, str):
        return UUID(user_id)
    return user_id


@router.post("/", response_model=OrganizationResponse)
async def create_organization(
    org_data: OrganizationCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    slug = create_slug(org_data.name)
    
    result = await db.execute(select(Organization).where(Organization.slug == slug))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization with similar name already exists"
        )
    
    org = Organization(
        name=org_data.name,
        slug=slug,
        description=org_data.description,
        settings=org_data.settings or {},
    )
    db.add(org)
    
    user_id = get_user_id(current_user)
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user:
        org.users.append(user)
    
    await db.commit()
    await db.refresh(org)
    
    return OrganizationResponse.model_validate(org)


@router.get("/", response_model=List[OrganizationResponse])
async def list_organizations(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = get_user_id(current_user)
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if current_user.get("role") == "admin":
        result = await db.execute(select(Organization).where(Organization.is_active == True))
        orgs = result.scalars().all()
    else:
        await db.refresh(user, ["organizations"])
        orgs = user.organizations
    
    return [OrganizationResponse.model_validate(org) for org in orgs]


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return OrganizationResponse.model_validate(org)


@router.put("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: UUID,
    org_data: OrganizationUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    if org_data.name:
        org.name = org_data.name
        org.slug = create_slug(org_data.name)
    if org_data.description is not None:
        org.description = org_data.description
    if org_data.settings is not None:
        org.settings = org_data.settings
    
    await db.commit()
    await db.refresh(org)
    
    return OrganizationResponse.model_validate(org)


@router.delete("/{org_id}")
async def delete_organization(
    org_id: UUID,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    org.is_active = False
    await db.commit()
    
    return {"message": "Organization deleted successfully"}



@router.post("/{org_id}/departments", response_model=DepartmentResponse)
async def create_department(
    org_id: UUID,
    dept_data: DepartmentCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    dept = Department(
        organization_id=org.id,
        name=dept_data.name,
        slug=create_slug(dept_data.name),
        description=dept_data.description,
        settings=dept_data.settings or {},
    )
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    
    return DepartmentResponse.model_validate(dept)


@router.get("/{org_id}/departments", response_model=List[DepartmentResponse])
async def list_departments(
    org_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Department).where(Department.organization_id == org_id)
    )
    departments = result.scalars().all()
    
    return [DepartmentResponse.model_validate(dept) for dept in departments]


@router.delete("/{org_id}/departments/{dept_id}")
async def delete_department(
    org_id: UUID,
    dept_id: UUID,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Department).where(
            Department.id == dept_id,
            Department.organization_id == org_id
        )
    )
    dept = result.scalar_one_or_none()
    
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    await db.delete(dept)
    await db.commit()
    
    return {"message": "Department deleted successfully"}
