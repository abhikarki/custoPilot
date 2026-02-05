from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    SUPPORT = "support"
    CUSTOMER = "customer"


class KnowledgeType(str, Enum):
    FAQ = "faq"
    POLICY = "policy"
    TROUBLESHOOTING = "troubleshooting"
    SALES = "sales"
    GENERAL = "general"


class ConversationStatus(str, Enum):
    ACTIVE = "active"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    CLOSED = "closed"


class EscalationStatus(str, Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"



class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: Optional[str] = None
    organization_name: Optional[str] = None  


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class OrganizationBrief(BaseModel):
    id: UUID
    name: str
    slug: str
    
    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    role: UserRole
    organization_id: Optional[UUID]
    organization: Optional[OrganizationBrief] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse



class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: Optional[str] = None
    settings: Optional[dict] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[dict] = None


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str]
    settings: dict
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True



class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: Optional[str] = None
    settings: Optional[dict] = None


class DepartmentResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    slug: str
    description: Optional[str]
    settings: dict
    created_at: datetime
    
    class Config:
        from_attributes = True



class KnowledgeUploadResponse(BaseModel):
    id: UUID
    title: str
    original_filename: str
    file_type: str
    processing_status: ProcessingStatus
    created_at: datetime
    
    class Config:
        from_attributes = True


class KnowledgeDocumentResponse(BaseModel):
    id: UUID
    organization_id: UUID
    department_id: Optional[UUID]
    title: str
    original_filename: Optional[str]
    file_type: Optional[str]
    file_size: Optional[int]
    knowledge_type: Optional[KnowledgeType]
    processing_status: ProcessingStatus
    processing_error: Optional[str]
    structured_content: Optional[dict]
    meta_data: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class KnowledgeChunkResponse(BaseModel):
    id: UUID
    document_id: UUID
    content: str
    chunk_index: int
    knowledge_type: Optional[KnowledgeType]
    meta_data: Optional[dict] = None
    
    class Config:
        from_attributes = True



class AgentConfig(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    retry_policy: Optional[dict] = None
    confidence_threshold: Optional[float] = None


class AgentPipelineCreate(BaseModel):
    name: str
    pipeline_type: str  
    description: Optional[str] = None
    config: Optional[dict] = None
    agents: Optional[List[AgentConfig]] = None


class AgentPipelineResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    pipeline_type: str
    description: Optional[str]
    config: dict
    agents: list
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AgentRunResponse(BaseModel):
    id: UUID
    pipeline_id: UUID
    status: str
    input_data: Optional[dict]
    output_data: Optional[dict]
    langsmith_run_id: Optional[str]
    langsmith_url: Optional[str]
    total_tokens: int
    total_cost: float
    duration_ms: Optional[int]
    started_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True



class ChatMessage(BaseModel):
    content: str = Field(min_length=1)
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    conversation_id: UUID
    message_id: UUID
    content: str
    confidence_score: Optional[float]
    sources: List[dict] = []
    escalated: bool = False
    langsmith_url: Optional[str] = None


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    agent_name: Optional[str]
    confidence_score: Optional[float]
    sources: list
    created_at: datetime
    
    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: UUID
    organization_id: UUID
    session_id: Optional[str]
    status: ConversationStatus
    department: Optional[str]
    intent: Optional[str]
    entities: dict
    summary: Optional[str]
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []
    
    class Config:
        from_attributes = True



class EscalationResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    message_id: Optional[UUID]
    assigned_to_id: Optional[UUID]
    status: EscalationStatus
    reason: Optional[str]
    confidence_score: Optional[float]
    priority: int
    resolution_notes: Optional[str]
    final_response: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]
    conversation: Optional[ConversationResponse] = None
    
    class Config:
        from_attributes = True


class EscalationResolve(BaseModel):
    final_response: str
    resolution_notes: Optional[str] = None


class EscalationAssign(BaseModel):
    assigned_to_id: UUID



class VoiceTranscriptionRequest(BaseModel):
    audio_data: str  
    format: str = "webm"


class VoiceTranscriptionResponse(BaseModel):
    text: str
    confidence: float


class TextToSpeechRequest(BaseModel):
    text: str
    voice: str = "alloy"


class TextToSpeechResponse(BaseModel):
    audio_data: str  
    format: str = "mp3"
