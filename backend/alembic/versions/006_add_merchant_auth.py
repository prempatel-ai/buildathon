"""add merchant auth

Revision ID: 006_add_merchant_auth
Revises: 005_add_pending_approvals
Create Date: 2026-08-28 23:35:00.000000

"""
from alembic import op
import sqlalchemy as sqa

revision = '006_add_merchant_auth'
down_revision = '005_add_pending_approvals'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('merchants', sqa.Column('email', sqa.String(length=255), nullable=True))
    op.add_column('merchants', sqa.Column('password_hash', sqa.String(length=255), nullable=True))
    op.create_unique_constraint('uq_merchants_email', 'merchants', ['email'])

def downgrade() -> None:
    op.drop_constraint('uq_merchants_email', 'merchants', type_='unique')
    op.drop_column('merchants', 'password_hash')
    op.drop_column('merchants', 'email')
