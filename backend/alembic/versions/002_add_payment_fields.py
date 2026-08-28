"""add payment fields to transactions table

Revision ID: 002_add_payment_fields
Revises: 001_initial_schema
Create Date: 2026-08-28 11:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_add_payment_fields'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('transactions', sa.Column('razorpay_payment_id', sa.String(length=255), nullable=True))
    op.add_column('transactions', sa.Column('razorpay_signature', sa.String(length=255), nullable=True))
    op.add_column('transactions', sa.Column('error_details', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=True))


def downgrade() -> None:
    op.drop_column('transactions', 'error_details')
    op.drop_column('transactions', 'razorpay_signature')
    op.drop_column('transactions', 'razorpay_payment_id')
