"""Add document_ids to chatbots

Revision ID: 002_document_ids
Revises: 001_initial
"""
from alembic import op
import sqlalchemy as sa

revision = '002_document_ids'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade():
    # Add document_ids column to chatbots table
    op.add_column('chatbots', sa.Column('document_ids', sa.JSON(), nullable=True, default=list))


def downgrade():
    op.drop_column('chatbots', 'document_ids')
