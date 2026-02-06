from typing import Optional
from uuid import UUID
import uuid
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.db import get_db, Conversation, Message, Organization, Chatbot, ConversationStatus
from app.schemas import ChatMessage, ChatResponse, ConversationResponse, MessageResponse
from app.core.security import get_current_user
from app.core.rate_limiter import chat_rate_limit
from app.services.chat_service import ChatService

router = APIRouter()


class WidgetMessage(BaseModel):
    chatbot_id: UUID
    session_id: str
    content: str


@router.post("/widget-message")
async def widget_send_message(
    message: WidgetMessage,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _rate_limit: None = Depends(chat_rate_limit)
):
    result = await db.execute(
        select(Chatbot).where(Chatbot.id == message.chatbot_id, Chatbot.is_active == True)
    )
    chatbot = result.scalar_one_or_none()
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not found or inactive")
    
    organization_id = chatbot.organization_id
    
    result = await db.execute(
        select(Conversation).where(
            Conversation.chatbot_id == message.chatbot_id,
            Conversation.session_id == message.session_id,
            Conversation.status == ConversationStatus.ACTIVE
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        conversation = Conversation(
            organization_id=organization_id,
            chatbot_id=message.chatbot_id,
            session_id=message.session_id,
            status=ConversationStatus.ACTIVE,
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
    
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=message.content,
    )
    db.add(user_msg)
    await db.commit()
    
    chat_service = ChatService(db)
    response = await chat_service.process_message(
        conversation=conversation,
        user_message=message.content,
        organization_id=str(organization_id),
        chatbot=chatbot,
    )
    
    return {
        "conversation_id": str(conversation.id),
        "message_id": str(response.message_id),
        "content": response.content,
        "confidence_score": response.confidence_score,
    }


@router.post("/message", response_model=ChatResponse)
async def send_message(
    organization_id: UUID,
    message: ChatMessage,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Organization).where(Organization.id == organization_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    session_id = message.session_id or str(uuid.uuid4())
    
    result = await db.execute(
        select(Conversation).where(
            Conversation.organization_id == organization_id,
            Conversation.session_id == session_id,
            Conversation.status == ConversationStatus.ACTIVE
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        conversation = Conversation(
            organization_id=organization_id,
            session_id=session_id,
            status=ConversationStatus.ACTIVE,
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
    
    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=message.content,
    )
    db.add(user_message)
    await db.commit()
    
    chat_service = ChatService(db)
    response = await chat_service.process_message(
        conversation=conversation,
        user_message=message.content,
        organization_id=str(organization_id)
    )
    
    return response


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    organization_id: UUID,
    status: Optional[ConversationStatus] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Conversation).where(
        Conversation.organization_id == organization_id
    )
    
    if status:
        query = query.where(Conversation.status == status)
    
    query = query.order_by(Conversation.updated_at.desc())
    
    result = await db.execute(query)
    conversations = result.scalars().all()
    
    return [ConversationResponse.model_validate(conv) for conv in conversations]


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    msg_result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()
    
    conv_response = ConversationResponse.model_validate(conversation)
    conv_response.messages = [MessageResponse.model_validate(msg) for msg in messages]
    
    return conv_response


@router.get("/conversations/session/{session_id}", response_model=ConversationResponse)
async def get_conversation_by_session(
    session_id: str,
    organization_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.organization_id == organization_id,
            Conversation.session_id == session_id
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    msg_result = await db.execute(
        select(Message).where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()
    
    conv_response = ConversationResponse.model_validate(conversation)
    conv_response.messages = [MessageResponse.model_validate(msg) for msg in messages]
    
    return conv_response


@router.post("/conversations/{conversation_id}/close")
async def close_conversation(
    conversation_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation.status = ConversationStatus.CLOSED
    await db.commit()
    
    return {"message": "Conversation closed"}


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
    
    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
    
    async def send_message(self, message: dict, session_id: str):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(message)


manager = ConnectionManager()


@router.websocket("/ws/{organization_id}/{session_id}")
async def websocket_chat(
    websocket: WebSocket,
    organization_id: str,
    session_id: str
):
    await manager.connect(websocket, session_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            response = {
                "type": "message",
                "content": f"Received: {data.get('content', '')}",
                "session_id": session_id,
            }
            
            await manager.send_message(response, session_id)
            
    except WebSocketDisconnect:
        manager.disconnect(session_id)
