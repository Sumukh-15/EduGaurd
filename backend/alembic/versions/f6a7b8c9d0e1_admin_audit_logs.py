"""add audit_logs table and ensure users is_active default

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-10-05 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: ensure is_active default on users and create audit_logs table."""
    bind = op.get_bind()
    insp = sa.inspect(bind)
    user_cols = [c['name'] for c in insp.get_columns('users')]
    if 'is_active' not in user_cols:
        op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()))
    else:
        op.alter_column('users', 'is_active', server_default=sa.true())

    table_names = insp.get_table_names()
    if 'audit_logs' not in table_names:
        op.create_table(
            'audit_logs',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('actor_user_id', sa.Integer(), nullable=True),
            sa.Column('action', sa.String(length=100), nullable=False),
            sa.Column('target', sa.String(length=255), nullable=False),
            sa.Column('details', sa.String(length=1000), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)
        op.create_index(op.f('ix_audit_logs_actor_user_id'), 'audit_logs', ['actor_user_id'], unique=False)
        op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
        op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema: drop audit_logs table."""
    bind = op.get_bind()
    insp = sa.inspect(bind)
    table_names = insp.get_table_names()
    if 'audit_logs' in table_names:
        op.drop_index(op.f('ix_audit_logs_created_at'), table_name='audit_logs')
        op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
        op.drop_index(op.f('ix_audit_logs_actor_user_id'), table_name='audit_logs')
        op.drop_index(op.f('ix_audit_logs_id'), table_name='audit_logs')
        op.drop_table('audit_logs')
