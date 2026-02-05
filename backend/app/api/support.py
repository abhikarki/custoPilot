from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import (
    get_db, Escalation, EscalationStatus, Conversation, 
    ConversationStatus, Message, User
)
from app.schemas import (
    EscalationResponse, EscalationResolve, EscalationAssign,
    ConversationResponse, MessageResponse
)
from app.core.security import get_current_user, require_support

router = APIRouter()


@router.get("/escalations", response_model=List[EscalationResponse])
async def list_escalations(
    organization_id: UUID,
    status: Optional[EscalationStatus] = None,
    assigned_to_me: bool = False,
    current_user: dict = Depends(require_support),
    db: AsyncSession = Depends(get_db)
):
    query = select(Escalation).join(Conversation).where(
        Conversation.organization_id == organization_id
    )
    
    if status:
        query = query.where(Escalation.status == status)
    
    if assigned_to_me:
        query = query.where(Escalation.assigned_to_id == current_user["sub"])
    
    query = query.order_by(Escalation.priority.desc(), Escalation.created_at)
    
    result = await db.execute(query)
    escalations = result.scalars().all()
    
    responses = []
    for esc in escalations:
        esc_response = EscalationResponse.model_validate(esc)
        
        conv_result = await db.execute(
            select(Conversation).where(Conversation.id == esc.conversation_id)
        )
        conv = conv_result.scalar_one_or_none()
        if conv:
            esc_response.conversation = ConversationResponse.model_validate(conv)
        
        responses.append(esc_response)
    
    return responses


@router.get("/escalations/{escalation_id}", response_model=EscalationResponse)
async def get_escalation(
    escalation_id: UUID,
    current_user: dict = Depends(require_support),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Escalation).where(Escalation.id == escalation_id)
    )
    escalation = result.scalar_one_or_none()
    
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == escalation.conversation_id)
    )
    conversation = conv_result.scalar_one_or_none()
    
    if conversation:
        msg_result = await db.execute(
            select(Message).where(Message.conversation_id == conversation.id)
            .order_by(Message.created_at)
        )
        messages = msg_result.scalars().all()
        
        conv_response = ConversationResponse.model_validate(conversation)
        conv_response.messages = [MessageResponse.model_validate(msg) for msg in messages]
    
    esc_response = EscalationResponse.model_validate(escalation)
    esc_response.conversation = conv_response
    
    return esc_response


@router.post("/escalations/{escalation_id}/assign")
async def assign_escalation(
    escalation_id: UUID,
    assignment: EscalationAssign,
    current_user: dict = Depends(require_support),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Escalation).where(Escalation.id == escalation_id)
    )
    escalation = result.scalar_one_or_none()
    
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    
    user_result = await db.execute(
        select(User).where(User.id == assignment.assigned_to_id)
    )
    assignee = user_result.scalar_one_or_none()
    
    if not assignee or assignee.role.value not in ["admin", "support"]:
        raise HTTPException(status_code=400, detail="Invalid assignee")
    
    escalation.assigned_to_id = assignment.assigned_to_id
    escalation.status = EscalationStatus.IN_REVIEW
    
    await db.commit()
    
    return {"message": "Escalation assigned successfully"}


@router.post("/escalations/{escalation_id}/resolve")
async def resolve_escalation(
    escalation_id: UUID,
    resolution: EscalationResolve,
    current_user: dict = Depends(require_support),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Escalation).where(Escalation.id == escalation_id)
    )
    escalation = result.scalar_one_or_none()
    
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    
    escalation.status = EscalationStatus.RESOLVED
    escalation.final_response = resolution.final_response
    escalation.resolution_notes = resolution.resolution_notes
    escalation.resolved_at = datetime.utcnow()
    
    message = Message(
        conversation_id=escalation.conversation_id,
        role="assistant",
        content=resolution.final_response,
        agent_name="human_support",
        confidence_score=1.0,
        edited_by_id=current_user["sub"],
    )
    db.add(message)
    
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == escalation.conversation_id)
    )
    conversation = conv_result.scalar_one_or_none()
    if conversation:
        conversation.status = ConversationStatus.RESOLVED
    
    await db.commit()
    
    return {"message": "Escalation resolved successfully"}


@router.post("/escalations/{escalation_id}/dismiss")
async def dismiss_escalation(
    escalation_id: UUID,
    reason: Optional[str] = None,
    current_user: dict = Depends(require_support),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Escalation).where(Escalation.id == escalation_id)
    )
    escalation = result.scalar_one_or_none()
    
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    
    escalation.status = EscalationStatus.DISMISSED
    escalation.resolution_notes = reason
    escalation.resolved_at = datetime.utcnow()
    
    await db.commit()
    
    return {"message": "Escalation dismissed"}


@router.post("/conversations/{conversation_id}/override")
async def override_message(
    conversation_id: UUID,
    message_id: UUID,
    new_content: str,
    current_user: dict = Depends(require_support),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Message).where(
            Message.id == message_id,
            Message.conversation_id == conversation_id
        )
    )
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    message.original_content = message.content
    message.content = new_content
    message.edited_by_id = current_user["sub"]
    
    await db.commit()
    
    return {"message": "Message updated successfully"}


@router.get("/queue/stats")
async def get_queue_stats(
    organization_id: UUID,
    current_user: dict = Depends(require_support),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import func
    
    stats_query = select(
        Escalation.status,
        func.count(Escalation.id)
    ).join(Conversation).where(
        Conversation.organization_id == organization_id
    ).group_by(Escalation.status)
    
    result = await db.execute(stats_query)
    status_counts = {str(row[0].value): row[1] for row in result.all()}
    
    priority_query = select(
        Escalation.priority,
        func.count(Escalation.id)
    ).join(Conversation).where(
        Conversation.organization_id == organization_id,
        Escalation.status == EscalationStatus.PENDING
    ).group_by(Escalation.priority)
    
    priority_result = await db.execute(priority_query)
    priority_counts = {f"priority_{row[0]}": row[1] for row in priority_result.all()}
    
    return {
        "by_status": status_counts,
        "by_priority": priority_counts,
        "total_pending": status_counts.get("pending", 0),
        "total_in_review": status_counts.get("in_review", 0),
    }
