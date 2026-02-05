"""initial migration

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enums
    op.execute("CREATE TYPE userrole AS ENUM ('admin', 'support', 'customer')")
    op.execute("CREATE TYPE documentstatus AS ENUM ('pending', 'processing', 'processed', 'failed')")
    op.execute("CREATE TYPE pipelinetype AS ENUM ('knowledge_ingestion', 'customer_support')")
    op.execute("CREATE TYPE escalationstatus AS ENUM ('pending', 'in_progress', 'resolved', 'closed')")
    op.execute("CREATE TYPE conversationstatus AS ENUM ('active', 'waiting', 'escalated', 'resolved', 'closed')")
    
    # Create organizations table
    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), unique=True, nullable=False),
        sa.Column('settings', postgresql.JSONB, default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create departments table
    op.create_table(
        'departments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255)),
        sa.Column('role', sa.Enum('admin', 'support', 'customer', name='userrole'), default='customer'),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id')),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id')),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create knowledge_documents table
    op.create_table(
        'knowledge_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id')),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('original_filename', sa.String(500)),
        sa.Column('file_path', sa.String(1000)),
        sa.Column('file_type', sa.String(50)),
        sa.Column('file_size', sa.Integer),
        sa.Column('content_hash', sa.String(64)),
        sa.Column('status', sa.Enum('pending', 'processing', 'processed', 'failed', name='documentstatus'), default='pending'),
        sa.Column('processing_error', sa.Text),
        sa.Column('metadata', postgresql.JSONB, default={}),
        sa.Column('uploaded_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('processed_at', sa.DateTime(timezone=True)),
    )
    
    # Create knowledge_chunks table
    op.create_table(
        'knowledge_chunks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('chunk_index', sa.Integer, nullable=False),
        sa.Column('embedding_id', sa.String(255)),
        sa.Column('metadata', postgresql.JSONB, default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create agent_pipelines table
    op.create_table(
        'agent_pipelines',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('pipeline_type', sa.Enum('knowledge_ingestion', 'customer_support', name='pipelinetype'), nullable=False),
        sa.Column('config', postgresql.JSONB, default={}),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create agent_runs table
    op.create_table(
        'agent_runs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('pipeline_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agent_pipelines.id'), nullable=False),
        sa.Column('status', sa.String(50), default='running'),
        sa.Column('input_data', postgresql.JSONB),
        sa.Column('output_data', postgresql.JSONB),
        sa.Column('error', sa.Text),
        sa.Column('langsmith_url', sa.String(500)),
        sa.Column('total_tokens', sa.Integer, default=0),
        sa.Column('total_cost', sa.Float, default=0.0),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.Column('duration_ms', sa.Integer),
    )
    
    # Create conversations table
    op.create_table(
        'conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('assigned_agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('status', sa.Enum('active', 'waiting', 'escalated', 'resolved', 'closed', name='conversationstatus'), default='active'),
        sa.Column('channel', sa.String(50), default='chat'),
        sa.Column('metadata', postgresql.JSONB, default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('resolved_at', sa.DateTime(timezone=True)),
    )
    
    # Create messages table
    op.create_table(
        'messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('confidence_score', sa.Float),
        sa.Column('sources', postgresql.JSONB, default=[]),
        sa.Column('metadata', postgresql.JSONB, default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create escalations table
    op.create_table(
        'escalations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id'), nullable=False),
        sa.Column('reason', sa.Text, nullable=False),
        sa.Column('status', sa.Enum('pending', 'in_progress', 'resolved', 'closed', name='escalationstatus'), default='pending'),
        sa.Column('priority', sa.Integer, default=1),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('resolved_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('resolution', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('resolved_at', sa.DateTime(timezone=True)),
    )
    
    # Create indexes
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_org', 'users', ['organization_id'])
    op.create_index('idx_documents_org', 'knowledge_documents', ['organization_id'])
    op.create_index('idx_documents_status', 'knowledge_documents', ['status'])
    op.create_index('idx_chunks_document', 'knowledge_chunks', ['document_id'])
    op.create_index('idx_conversations_org', 'conversations', ['organization_id'])
    op.create_index('idx_conversations_status', 'conversations', ['status'])
    op.create_index('idx_messages_conversation', 'messages', ['conversation_id'])
    op.create_index('idx_escalations_status', 'escalations', ['status'])


def downgrade() -> None:
    # Drop tables
    op.drop_table('escalations')
    op.drop_table('messages')
    op.drop_table('conversations')
    op.drop_table('agent_runs')
    op.drop_table('agent_pipelines')
    op.drop_table('knowledge_chunks')
    op.drop_table('knowledge_documents')
    op.drop_table('users')
    op.drop_table('departments')
    op.drop_table('organizations')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS escalationstatus")
    op.execute("DROP TYPE IF EXISTS conversationstatus")
    op.execute("DROP TYPE IF EXISTS pipelinetype")
    op.execute("DROP TYPE IF EXISTS documentstatus")
    op.execute("DROP TYPE IF EXISTS userrole")
