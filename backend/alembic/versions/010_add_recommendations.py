"""add recommendations table and source_recommendation_id to transactions

Revision ID: 010_add_recommendations
Revises: 009_customer_spend_auth
Create Date: 2026-09-01 18:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '010_recommendations'
down_revision = '009_customer_spend_auth'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'recommendations',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('customer_id', UUID(as_uuid=True), sa.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_transaction_id', UUID(as_uuid=True), sa.ForeignKey('transactions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('recommended_item_id', UUID(as_uuid=True), sa.ForeignKey('catalog_items.id', ondelete='CASCADE'), nullable=False),
        sa.Column('recommended_merchant_id', UUID(as_uuid=True), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='shown'),
        sa.Column('shown_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )
    op.create_index('ix_recommendations_customer_id', 'recommendations', ['customer_id'])
    op.create_index('ix_recommendations_source_transaction_id', 'recommendations', ['source_transaction_id'])
    op.create_index('ix_recommendations_recommended_merchant_id', 'recommendations', ['recommended_merchant_id'])

    op.add_column(
        'transactions',
        sa.Column('source_recommendation_id', UUID(as_uuid=True), sa.ForeignKey('recommendations.id', ondelete='SET NULL'), nullable=True)
    )
    op.create_index('ix_transactions_source_recommendation_id', 'transactions', ['source_recommendation_id'])

def downgrade() -> None:
    op.drop_index('bix_transactions_source_recommendation_id', table_name='transactions')
    op.drop_column('transactions', 'source_recommendation_id')
    op.drop_index('bix_recommendations_recommended_merchant_id', table_name='recommendations')
    op.drop_index('ix_recommendations_source_transaction_id', table_name='recommendations')
    op.drop_index('ix_recommendations_customer_id', table_name='recommendations')
    op.drop_table('recommendations')
