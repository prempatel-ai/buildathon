"""add_pending_approvals

Revision ID: 005_add_pending_approvals
Revises: 004_enforce_audit_db_trigger
Create Date: 2026-08-28 12:39:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005_add_pending_approvals'
down_revision = '004_enforce_audit_db_trigger'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'pending_approvals',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('merchant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', sa.String(length=255), nullable=False),
        sa.Column('action_type', sa.String(length=100), nullable=False),
        sa.Column('proposed_action', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('reasoning', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )
    op.create_index(op.f('ix_pending_approvals_merchant_id'), 'pending_approvals', ['merchant_id'], unique=False)
    op.create_index(op.f('ix_pending_approvals_status'), 'pending_approvals', ['status'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_pending_approvals_status'), table_name='pending_approvals')
    op.drop_index(op.f('ix_pending_approvals_merchant_id'), table_name='pending_approvals')
    op.drop_table('pending_approvals')
