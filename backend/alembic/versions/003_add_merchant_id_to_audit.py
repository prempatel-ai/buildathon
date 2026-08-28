"""add_merchant_id_to_audit

Revision ID: 003_add_merchant_id_to_audit
Revises: 002_add_payment_fields
Create Date: 2026-08-28 12:25:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_add_merchant_id_to_audit'
down_revision = '002_add_payment_fields'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column(
        'audit_events',
        sa.Column('merchant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('merchants.id', ondelete='SET NULL'), nullable=True)
    )
    op.create_index(op.f('ix_audit_events_merchant_id'), 'audit_events', ['merchant_id'], unique=False)
    op.create_index(op.f('ix_audit_events_created_at'), 'audit_events', ['created_at'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_audit_events_created_at'), table_name='audit_events')
    op.drop_index(op.f('ix_audit_events_merchant_id'), table_name='audit_events')
    op.drop_column('audit_events', 'merchant_id')
