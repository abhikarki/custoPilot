from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter

from app.demo.service import demo_chat_service, demo_crm_service

router = APIRouter()


class DemoSessionInitResponse(BaseModel):
    session_id: str
    chatbot: Dict[str, Any]
    suggested_prompts: List[str]


class DemoMessageRequest(BaseModel):
    session_id: Optional[str] = None
    message: str = Field(min_length=1, max_length=2000)


class DemoMessageResponse(BaseModel):
    session_id: str
    content: str
    tool_calls: List[Dict[str, Any]]


@router.post("/session", response_model=DemoSessionInitResponse)
async def create_demo_session(session_id: Optional[str] = None):
    sid = demo_crm_service.ensure_session(session_id)
    snapshot = demo_crm_service.get_public_snapshot(sid)
    return DemoSessionInitResponse(
        session_id=sid,
        chatbot=snapshot["chatbot"],
        suggested_prompts=snapshot["suggested_prompts"],
    )


@router.get("/overview")
async def get_demo_overview(session_id: Optional[str] = None):
    sid = demo_crm_service.ensure_session(session_id)
    return demo_crm_service.get_public_snapshot(sid)


@router.get("/connector-schema")
async def get_demo_connector_schema(session_id: Optional[str] = None):
    sid = demo_crm_service.ensure_session(session_id)
    return {
        "session_id": sid,
        "connector_schema": demo_crm_service.get_connector_schema(sid),
    }


@router.get("/messages")
async def get_demo_messages(session_id: Optional[str] = None):
    sid = demo_crm_service.ensure_session(session_id)
    return {
        "session_id": sid,
        "messages": demo_crm_service.get_messages(sid),
    }


@router.post("/chat", response_model=DemoMessageResponse)
async def chat_with_demo_bot(payload: DemoMessageRequest):
    sid = demo_crm_service.ensure_session(payload.session_id)
    result = demo_chat_service.process(sid, payload.message)
    return DemoMessageResponse(
        session_id=sid,
        content=result["content"],
        tool_calls=result["tool_calls"],
    )
