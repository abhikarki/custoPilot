from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, 
    ForeignKey, Enum, JSON, Table, TypeDecorator, CHAR
)
from sqlalchemy.orm import relationship
import uuid
import enum

from app.db.session import Base


class GUID(TypeDecorator):
    impl = CHAR
    cache_ok = True
    
    def load_dialect_impl(self, dialect):
        return dialect.type_descriptor(CHAR(32))
    
    def process_bind_param(self, value, dialect):
        if value is not None:
            if isinstance(value, uuid.UUID):
                return value.hex
            return str(value).replace('-', '')
        return value
    
    def process_result_value(self, value, dialect):
        if value is not None:
            return uuid.UUID(value)
        return value


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SUPPORT = "support"
    CUSTOMER = "customer"


class KnowledgeType(str, enum.Enum):
    FAQ = "faq"
    POLICY = "policy"
    TROUBLESHOOTING = "troubleshooting"
    SALES = "sales"
    GENERAL = "general"


class ConversationStatus(str, enum.Enum):
    ACTIVE = "active"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    CLOSED = "closed"


class EscalationStatus(str, enum.Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class ProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


chatbot_department = Table(
    'chatbot_department',
    Base.metadata,
    Column('chatbot_id', GUID(), ForeignKey('chatbots.id')),
    Column('department_id', GUID(), ForeignKey('departments.id'))
)


class User(Base):
    __tablename__ = "users"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(Enum(UserRole), default=UserRole.CUSTOMER)
    organization_id = Column(GUID(), ForeignKey("organizations.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    organization = relationship("Organization", back_populates="users")
    conversations = relationship("Conversation", back_populates="customer")
    assigned_escalations = relationship("Escalation", back_populates="assigned_to", foreign_keys="Escalation.assigned_to_id")


class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text)
    settings = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    users = relationship("User", back_populates="organization")
    departments = relationship("Department", back_populates="organization", cascade="all, delete-orphan")
    chatbots = relationship("Chatbot", back_populates="organization", cascade="all, delete-orphan")
    knowledge_documents = relationship("KnowledgeDocument", back_populates="organization", cascade="all, delete-orphan")
    agent_pipelines = relationship("AgentPipeline", back_populates="organization", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="organization", cascade="all, delete-orphan")


class Department(Base):
    __tablename__ = "departments"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False)
    description = Column(Text)
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization", back_populates="departments")
    knowledge_documents = relationship("KnowledgeDocument", back_populates="department")
    chatbots = relationship("Chatbot", secondary=chatbot_department, back_populates="departments")


class Chatbot(Base):
    __tablename__ = "chatbots"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=False)
    
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False)
    description = Column(Text)
    
    welcome_message = Column(Text, default="Hi! How can I help you today?")
    system_prompt = Column(Text)  
    model = Column(String(100), default="gpt-4-turbo-preview")
    temperature = Column(Float, default=0.7)
    confidence_threshold = Column(Float, default=0.7)
    
    document_ids = Column(JSON, default=list)
    
    primary_color = Column(String(20), default="#6366f1")
    avatar_url = Column(String(500))
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    organization = relationship("Organization", back_populates="chatbots")
    departments = relationship("Department", secondary=chatbot_department, back_populates="chatbots")
    conversations = relationship("Conversation", back_populates="chatbot")


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=False)
    department_id = Column(GUID(), ForeignKey("departments.id"))
    
    title = Column(String(255), nullable=False)
    original_filename = Column(String(255))
    file_path = Column(String(500))
    file_type = Column(String(50))
    file_size = Column(Integer)
    
    knowledge_type = Column(Enum(KnowledgeType), default=KnowledgeType.GENERAL)
    processing_status = Column(Enum(ProcessingStatus), default=ProcessingStatus.PENDING)
    processing_error = Column(Text)
    
    structured_content = Column(JSON)
    meta_data = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    organization = relationship("Organization", back_populates="knowledge_documents")
    department = relationship("Department", back_populates="knowledge_documents")
    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    document_id = Column(GUID(), ForeignKey("knowledge_documents.id"), nullable=False)
    
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, default=0)
    knowledge_type = Column(Enum(KnowledgeType))
    
    vector_id = Column(String(255))
    
    meta_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("KnowledgeDocument", back_populates="chunks")


class AgentPipeline(Base):
    __tablename__ = "agent_pipelines"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=False)
    
    name = Column(String(255), nullable=False)
    pipeline_type = Column(String(50), nullable=False)  
    description = Column(Text)
    
    config = Column(JSON, default=dict)
    agents = Column(JSON, default=list) 
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    organization = relationship("Organization", back_populates="agent_pipelines")
    runs = relationship("AgentRun", back_populates="pipeline", cascade="all, delete-orphan")


class AgentRun(Base):
    __tablename__ = "agent_runs"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    pipeline_id = Column(GUID(), ForeignKey("agent_pipelines.id"), nullable=False)
    
    status = Column(String(50), default="running")  
    input_data = Column(JSON)
    output_data = Column(JSON)
    
    langsmith_run_id = Column(String(255))
    langsmith_url = Column(String(500))
    
    total_tokens = Column(Integer, default=0)
    total_cost = Column(Float, default=0.0)
    duration_ms = Column(Integer)
    
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    pipeline = relationship("AgentPipeline", back_populates="runs")


class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=False)
    chatbot_id = Column(GUID(), ForeignKey("chatbots.id"))
    customer_id = Column(GUID(), ForeignKey("users.id"))
    
    session_id = Column(String(255), index=True)
    
    status = Column(Enum(ConversationStatus), default=ConversationStatus.ACTIVE)
    department = Column(String(100))
    
    intent = Column(String(255))
    entities = Column(JSON, default=dict)
    
    summary = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = Column(DateTime)
    
    organization = relationship("Organization", back_populates="conversations")
    chatbot = relationship("Chatbot", back_populates="conversations")
    customer = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    escalations = relationship("Escalation", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(GUID(), ForeignKey("conversations.id"), nullable=False)
    
    role = Column(String(50), nullable=False)  
    content = Column(Text, nullable=False)
    
    agent_name = Column(String(100))
    confidence_score = Column(Float)
    sources = Column(JSON, default=list)  
    
    langsmith_run_id = Column(String(255))
    
    edited_by_id = Column(GUID(), ForeignKey("users.id"))
    original_content = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")


class Escalation(Base):
    __tablename__ = "escalations"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(GUID(), ForeignKey("conversations.id"), nullable=False)
    message_id = Column(GUID(), ForeignKey("messages.id"))
    assigned_to_id = Column(GUID(), ForeignKey("users.id"))
    
    status = Column(Enum(EscalationStatus), default=EscalationStatus.PENDING)
    reason = Column(String(255))  
    
    confidence_score = Column(Float)
    priority = Column(Integer, default=1) 
    
    resolution_notes = Column(Text)
    final_response = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)
    
    conversation = relationship("Conversation", back_populates="escalations")
    assigned_to = relationship("User", back_populates="assigned_escalations", foreign_keys=[assigned_to_id])
