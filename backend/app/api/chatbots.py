from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
import re

from app.db import get_db, Chatbot, Department, Organization, User
from app.core.security import get_current_user, require_admin

router = APIRouter(redirect_slashes=False)


class ChatbotCreate(BaseModel):
    name: str
    description: Optional[str] = None
    department_ids: List[UUID] = []
    document_ids: List[UUID] = [] 
    welcome_message: str = "Hi! How can I help you today?"
    system_prompt: Optional[str] = None
    model: str = "gpt-4-turbo-preview"
    temperature: float = 0.7
    confidence_threshold: float = 0.7
    primary_color: str = "#6366f1"


class ChatbotUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    department_ids: Optional[List[UUID]] = None
    document_ids: Optional[List[UUID]] = None
    welcome_message: Optional[str] = None
    system_prompt: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    confidence_threshold: Optional[float] = None
    primary_color: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentBrief(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    document_count: int = 0
    
    model_config = {"from_attributes": True}


class ChatbotResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    welcome_message: str
    system_prompt: Optional[str] = None
    model: str
    temperature: float
    confidence_threshold: float
    primary_color: str
    avatar_url: Optional[str] = None
    is_active: bool
    document_ids: List[UUID] = []
    departments: List[DepartmentBrief] = []
    
    model_config = {"from_attributes": True}


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


@router.post("", response_model=ChatbotResponse)
@router.post("/", response_model=ChatbotResponse, include_in_schema=False)
async def create_chatbot(
    data: ChatbotCreate,
    organization_id: UUID,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    org_result = await db.execute(select(Organization).where(Organization.id == organization_id))
    org = org_result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    slug = create_slug(data.name)
    
    existing = await db.execute(
        select(Chatbot).where(
            Chatbot.organization_id == organization_id,
            Chatbot.slug == slug
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Chatbot with similar name already exists")
    
    chatbot = Chatbot(
        organization_id=organization_id,
        name=data.name,
        slug=slug,
        description=data.description,
        welcome_message=data.welcome_message,
        system_prompt=data.system_prompt,
        model=data.model,
        temperature=data.temperature,
        confidence_threshold=data.confidence_threshold,
        primary_color=data.primary_color,
        document_ids=[str(d) for d in data.document_ids] if data.document_ids else [],
    )
    
    if data.department_ids:
        dept_result = await db.execute(
            select(Department).where(
                Department.id.in_(data.department_ids),
                Department.organization_id == organization_id
            )
        )
        departments = dept_result.scalars().all()
        chatbot.departments = list(departments)
    
    db.add(chatbot)
    await db.commit()
    await db.refresh(chatbot, ["departments"])
    
    return ChatbotResponse.model_validate(chatbot)


@router.get("", response_model=List[ChatbotResponse])
@router.get("/", response_model=List[ChatbotResponse], include_in_schema=False)
async def list_chatbots(
    organization_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Chatbot)
        .options(selectinload(Chatbot.departments))
        .where(Chatbot.organization_id == organization_id)
        .order_by(Chatbot.created_at.desc())
    )
    chatbots = result.scalars().all()
    return [ChatbotResponse.model_validate(cb) for cb in chatbots]


@router.get("/{chatbot_id}", response_model=ChatbotResponse)
async def get_chatbot(
    chatbot_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Chatbot)
        .options(selectinload(Chatbot.departments))
        .where(Chatbot.id == chatbot_id)
    )
    chatbot = result.scalar_one_or_none()
    
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not found")
    
    return ChatbotResponse.model_validate(chatbot)


@router.put("/{chatbot_id}", response_model=ChatbotResponse)
async def update_chatbot(
    chatbot_id: UUID,
    data: ChatbotUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Chatbot)
        .options(selectinload(Chatbot.departments))
        .where(Chatbot.id == chatbot_id)
    )
    chatbot = result.scalar_one_or_none()
    
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    department_ids = update_data.pop("department_ids", None)
    
    document_ids = update_data.pop("document_ids", None)
    
    for key, value in update_data.items():
        if key == "name" and value:
            chatbot.slug = create_slug(value)
        setattr(chatbot, key, value)
    
    if document_ids is not None:
        chatbot.document_ids = [str(d) for d in document_ids]
    
    if department_ids is not None:
        dept_result = await db.execute(
            select(Department).where(
                Department.id.in_(department_ids),
                Department.organization_id == chatbot.organization_id
            )
        )
        departments = dept_result.scalars().all()
        chatbot.departments = list(departments)
    
    await db.commit()
    await db.refresh(chatbot, ["departments"])
    
    return ChatbotResponse.model_validate(chatbot)


@router.delete("/{chatbot_id}")
async def delete_chatbot(
    chatbot_id: UUID,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Chatbot).where(Chatbot.id == chatbot_id))
    chatbot = result.scalar_one_or_none()
    
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not found")
    
    await db.delete(chatbot)
    await db.commit()
    
    return {"message": "Chatbot deleted successfully"}


@router.get("/{chatbot_id}/public-config")
async def get_public_config(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Chatbot).where(Chatbot.id == chatbot_id, Chatbot.is_active == True)
    )
    chatbot = result.scalar_one_or_none()
    
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not found or inactive")
    
    return {
        "id": str(chatbot.id),
        "name": chatbot.name,
        "welcome_message": chatbot.welcome_message,
        "primary_color": chatbot.primary_color,
        "avatar_url": chatbot.avatar_url,
    }


@router.get("/{chatbot_id}/embed-code")
async def get_embed_code(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    from app.core.config import settings
    
    result = await db.execute(select(Chatbot).where(Chatbot.id == chatbot_id))
    chatbot = result.scalar_one_or_none()
    
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not found")
    
    base_url = getattr(settings, 'BASE_URL', 'http://localhost:8080')
    
    embed_code = f'''<!-- CustoPilot Chatbot Widget -->
<script>
  window.CustoPilotConfig = {{
    chatbotId: "{chatbot_id}",
  }};
</script>
<script src="{base_url}/static/widget.js" async></script>'''
    
    return {
        "chatbot_id": str(chatbot_id),
        "embed_code": embed_code,
        "instructions": "Copy and paste this code before the closing </body> tag on your website."
    }
