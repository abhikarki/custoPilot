"""
Chat Service for Customer Support Agent Pipeline
"""
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
import structlog

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import (
    Conversation, Message, Escalation, EscalationStatus,
    ConversationStatus
)
from app.schemas import ChatResponse
from app.core.config import settings

logger = structlog.get_logger()


class ChatService:
    """Service for handling chat interactions with agent pipeline"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def process_message(
        self,
        conversation: Conversation,
        user_message: str,
        organization_id: str,
        chatbot: Optional[Any] = None,
    ) -> ChatResponse:
        """
        Process a user message through the support agent pipeline.
        
        Args:
            conversation: The conversation object
            user_message: The user's message text
            organization_id: Organization ID for knowledge lookup
            chatbot: Optional chatbot object for chatbot-specific settings
        """
        from app.agents.support_pipeline import SupportAgentPipeline
        
        logger.info(
            "Processing chat message",
            conversation_id=str(conversation.id),
            organization_id=organization_id,
            chatbot_id=str(chatbot.id) if chatbot else None
        )
        
        try:
            # Get conversation history
            history = await self._get_conversation_history(conversation.id)
            
            # Build department filter from chatbot if available
            department_ids = None
            if chatbot and chatbot.departments:
                department_ids = [str(d.id) for d in chatbot.departments]
            
            # Get document_ids from chatbot
            document_ids = None
            if chatbot and chatbot.document_ids:
                document_ids = chatbot.document_ids
            
            # Run support pipeline
            pipeline = SupportAgentPipeline()
            result = await pipeline.run(
                user_message=user_message,
                conversation_history=history,
                organization_id=organization_id,
                department=conversation.department,
                department_ids=department_ids,
                document_ids=document_ids,
                chatbot_config={
                    "temperature": chatbot.temperature if chatbot else 0.7,
                    "system_prompt": chatbot.system_prompt if chatbot else None,
                    "confidence_threshold": chatbot.confidence_threshold if chatbot else 0.7,
                } if chatbot else None,
            )
            
            # Update conversation with detected intent
            if result.get("intent"):
                conversation.intent = result["intent"]
                conversation.entities = result.get("entities", {})
            
            if result.get("department"):
                conversation.department = result["department"]
            
            # Check if escalation needed
            confidence_score = result.get("confidence_score", 1.0)
            escalated = False
            
            if confidence_score < settings.CONFIDENCE_THRESHOLD:
                escalated = await self._create_escalation(
                    conversation=conversation,
                    reason="low_confidence",
                    confidence_score=confidence_score,
                )
                conversation.status = ConversationStatus.ESCALATED
            
            # Save assistant message
            assistant_message = Message(
                conversation_id=conversation.id,
                role="assistant",
                content=result["response"],
                agent_name=result.get("agent_name", "support_pipeline"),
                confidence_score=confidence_score,
                sources=result.get("sources", []),
                langsmith_run_id=result.get("langsmith_run_id"),
            )
            self.db.add(assistant_message)
            await self.db.commit()
            await self.db.refresh(assistant_message)
            
            # Build LangSmith URL if available
            langsmith_url = None
            if result.get("langsmith_run_id") and settings.LANGCHAIN_PROJECT:
                langsmith_url = f"https://smith.langchain.com/o/{settings.LANGCHAIN_PROJECT}/runs/{result['langsmith_run_id']}"
            
            return ChatResponse(
                conversation_id=conversation.id,
                message_id=assistant_message.id,
                content=result["response"],
                confidence_score=confidence_score,
                sources=result.get("sources", []),
                escalated=escalated,
                langsmith_url=langsmith_url,
            )
            
        except Exception as e:
            logger.error(
                "Chat processing failed",
                conversation_id=str(conversation.id),
                error=str(e)
            )
            
            # Return error response
            error_message = Message(
                conversation_id=conversation.id,
                role="assistant",
                content="I apologize, but I'm having trouble processing your request. A support team member will assist you shortly.",
                confidence_score=0.0,
            )
            self.db.add(error_message)
            
            # Create escalation
            await self._create_escalation(
                conversation=conversation,
                reason="processing_error",
                confidence_score=0.0,
            )
            conversation.status = ConversationStatus.ESCALATED
            
            await self.db.commit()
            await self.db.refresh(error_message)
            
            return ChatResponse(
                conversation_id=conversation.id,
                message_id=error_message.id,
                content=error_message.content,
                confidence_score=0.0,
                sources=[],
                escalated=True,
            )
    
    async def _get_conversation_history(self, conversation_id: uuid.UUID) -> list:
        """Get conversation history for context"""
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
        )
        messages = result.scalars().all()
        
        return [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
    
    async def _create_escalation(
        self,
        conversation: Conversation,
        reason: str,
        confidence_score: float
    ) -> bool:
        """Create an escalation request"""
        # Check if escalation already exists
        result = await self.db.execute(
            select(Escalation).where(
                Escalation.conversation_id == conversation.id,
                Escalation.status == EscalationStatus.PENDING
            )
        )
        if result.scalar_one_or_none():
            return True  # Already escalated
        
        # Determine priority based on confidence
        if confidence_score < 0.3:
            priority = 3  # High
        elif confidence_score < 0.5:
            priority = 2  # Medium
        else:
            priority = 1  # Low
        
        escalation = Escalation(
            conversation_id=conversation.id,
            status=EscalationStatus.PENDING,
            reason=reason,
            confidence_score=confidence_score,
            priority=priority,
        )
        self.db.add(escalation)
        
        logger.info(
            "Created escalation",
            conversation_id=str(conversation.id),
            reason=reason,
            priority=priority
        )
        
        return True
