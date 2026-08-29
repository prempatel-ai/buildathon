"""add kyc_status to merchants

Revision ID: 008_add_kyc_status
Revises: 007_add_agent_scopes
Create Date: 2026-08-29 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sqa

revision = '008_add_kyc_status'
down_revision = '007_add_agent_scopes'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('merchants', sqa.Column('environment', sqa.String(50), nullable=False, server_default='sandbox'))
    op.add_column('merchants', sqa.Column('kyc_status', sqa.String(20), nullable=False, server_default='unverified'))

def downgrade() -> None:
    op.drop_column('merchants', 'kyc_status')
    op.drop_column('merchants', 'environment', if_exists=True)