from typing import Any, Dict, List, Optional
import structlog

from app.core.config import settings

logger = structlog.get_logger()


class MCPTools:
    
    @staticmethod
    async def get_knowledge(
        organization_id: str,
        query: str,
        department: Optional[str] = None,
        limit: int = 5
    ) -> Dict[str, Any]:
        from app.services.knowledge_service import KnowledgeService
        
        results = await KnowledgeService.search(
            organization_id=organization_id,
            query=query,
            department_id=department,
            limit=limit
        )
        
        return {
            "tool": "get_knowledge",
            "results": results,
            "count": len(results)
        }
    
    @staticmethod
    async def get_conversation_context(
        conversation_id: str,
        max_messages: int = 10
    ) -> Dict[str, Any]:
        from app.db.session import async_session_maker
        from app.db.models import Conversation, Message
        from sqlalchemy import select
        
        async with async_session_maker() as db:
            # Get conversation
            result = await db.execute(
                select(Conversation).where(Conversation.id == conversation_id)
            )
            conversation = result.scalar_one_or_none()
            
            if not conversation:
                return {"tool": "get_conversation_context", "error": "Conversation not found"}
            
            msg_result = await db.execute(
                select(Message)
                .where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.desc())
                .limit(max_messages)
            )
            messages = msg_result.scalars().all()
            
            return {
                "tool": "get_conversation_context",
                "conversation": {
                    "id": str(conversation.id),
                    "status": conversation.status.value,
                    "department": conversation.department,
                    "intent": conversation.intent,
                },
                "messages": [
                    {"role": msg.role, "content": msg.content}
                    for msg in reversed(messages)
                ]
            }
    
    @staticmethod
    async def get_department_info(
        organization_id: str,
        department_slug: str
    ) -> Dict[str, Any]:
        from app.db.session import async_session_maker
        from app.db.models import Department
        from sqlalchemy import select
        
        async with async_session_maker() as db:
            result = await db.execute(
                select(Department).where(
                    Department.organization_id == organization_id,
                    Department.slug == department_slug
                )
            )
            department = result.scalar_one_or_none()
            
            if not department:
                return {"tool": "get_department_info", "error": "Department not found"}
            
            return {
                "tool": "get_department_info",
                "department": {
                    "id": str(department.id),
                    "name": department.name,
                    "description": department.description,
                    "settings": department.settings,
                }
            }
    
    @staticmethod
    async def escalate_to_human(
        conversation_id: str,
        reason: str,
        priority: int = 1
    ) -> Dict[str, Any]:
        from app.db.session import async_session_maker
        from app.db.models import Escalation, EscalationStatus
        
        async with async_session_maker() as db:
            escalation = Escalation(
                conversation_id=conversation_id,
                status=EscalationStatus.PENDING,
                reason=reason,
                priority=priority,
            )
            db.add(escalation)
            await db.commit()
            await db.refresh(escalation)
            
            return {
                "tool": "escalate_to_human",
                "escalation_id": str(escalation.id),
                "status": "created"
            }
    
    @staticmethod
    def get_tool_definitions() -> List[Dict[str, Any]]:
        return [
            {
                "name": "get_knowledge",
                "description": "Search the knowledge base for relevant information",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "organization_id": {
                            "type": "string",
                            "description": "Organization ID"
                        },
                        "query": {
                            "type": "string",
                            "description": "Search query"
                        },
                        "department": {
                            "type": "string",
                            "description": "Filter by department"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Max results to return"
                        }
                    },
                    "required": ["organization_id", "query"]
                }
            },
            {
                "name": "get_conversation_context",
                "description": "Get conversation history and context",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "conversation_id": {
                            "type": "string",
                            "description": "Conversation ID"
                        },
                        "max_messages": {
                            "type": "integer",
                            "description": "Max messages to retrieve"
                        }
                    },
                    "required": ["conversation_id"]
                }
            },
            {
                "name": "get_department_info",
                "description": "Get department information and settings",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "organization_id": {
                            "type": "string",
                            "description": "Organization ID"
                        },
                        "department_slug": {
                            "type": "string",
                            "description": "Department slug"
                        }
                    },
                    "required": ["organization_id", "department_slug"]
                }
            },
            {
                "name": "escalate_to_human",
                "description": "Escalate conversation to human support",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "conversation_id": {
                            "type": "string",
                            "description": "Conversation ID"
                        },
                        "reason": {
                            "type": "string",
                            "description": "Reason for escalation"
                        },
                        "priority": {
                            "type": "integer",
                            "description": "Priority level (1-3)"
                        }
                    },
                    "required": ["conversation_id", "reason"]
                }
            }
        ]
