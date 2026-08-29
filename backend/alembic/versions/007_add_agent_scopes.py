"""add agent scopes

Revision ID: 007_add_agent_scopes
Revises: 006_add_merchant_auth
Create Date: 2026-08-28 23:36:00.000000

"""
from alembic import op
import sqlalchemy as sqa
from sqlalchemy.dialects.postgresql import JSONB

revision = '007_add_agent_scopes'
down_revision = '006_add_merchant_auth'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('agents', sqa.Column('scopes', JSONB, nullable=False, server_default='["read_catalog", "propose_order"]'))
    op.add_column('agents', sqa.Column('environment', sqa.String(50), nullable=False, server_default='sandbox'))

def downgrade() -> None:
    op.drop_column('agents', 'scopes')
    op.drop_column('agents', 'environment', if_exists=True)
