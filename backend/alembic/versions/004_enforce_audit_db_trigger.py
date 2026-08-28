"""enforce_audit_db_trigger

Revision ID: 004_enforce_audit_db_trigger
Revises: 003_add_merchant_id_to_audit
Create Date: 2026-08-28 12:33:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004_enforce_audit_db_trigger'
down_revision = '003_add_merchant_id_to_audit'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("""
        CREATE OR REPLACE FUNCTION prevent_audit_modification()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'audit_events table is append-only. UPDATE and DELETE operations are strictly forbidden.';
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE TRIGGER enforce_audit_append_only
        BEFORE UPDATE OR DELETE ON audit_events
        FOR EACH ROW
        EXECUTE FUNCTION prevent_audit_modification();
    """)

def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS enforce_audit_append_only ON audit_events;")
    op.execute("DROP FUNCTION IF EXISTS prevent_audit_modification();")
