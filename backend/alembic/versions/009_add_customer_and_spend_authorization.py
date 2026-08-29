"""add customer and spend_authorization tables

Revision ID: 009_add_customer_and_spend_authorization
Revises: 008_add_kyc_status
Create Date: 2026-08-29 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '009_customer_spend_auth'
down_revision = '008_add_kyc_status'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'customers',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )
    op.create_index('ix_customers_email', 'customers', ['email'])

    op.create_table(
        'spend_authorizations',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('customer_id', UUID(as_uuid=True), sa.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('razorpay_customer_id', sa.String(255), nullable=False),
        sa.Column('razorpay_token_id', sa.String(255), nullable=True),
        sa.Column('spend_limit', sa.Numeric(10, 2), nullable=False),
        sa.Column('remaining_limit', sa.Numeric(10, 2), nullable=False),
        sa.Column('period', sa.String(50), nullable=False, server_default='per_transaction'),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )
    op.create_index('ix_spend_authorizations_customer_id', 'spend_authorizations', ['customer_id'])

def downgrade() -> None:
    op.drop_index('ix_spend_authorizations_customer_id', table_name='spend_authorizations')
    op.drop_table('spend_authorizations')
    op.drop_index('ix_customers_email', table_name='customers')
    op.drop_table('customers')
