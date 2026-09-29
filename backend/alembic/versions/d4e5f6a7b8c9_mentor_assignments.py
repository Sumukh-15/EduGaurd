"""add mentor_assignments table

Revision ID: d4e5f6a7b8c9
Revises: cfa545c82657
Create Date: 2026-09-28 21:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'cfa545c82657'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to add mentor_assignments."""
    op.create_table(
        'mentor_assignments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('faculty_user_id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['faculty_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('faculty_user_id', 'student_id', name='uq_mentor_assignments_faculty_student'),
    )
    op.create_index(op.f('ix_mentor_assignments_id'), 'mentor_assignments', ['id'], unique=False)
    op.create_index(op.f('ix_mentor_assignments_faculty_user_id'), 'mentor_assignments', ['faculty_user_id'], unique=False)
    op.create_index(op.f('ix_mentor_assignments_student_id'), 'mentor_assignments', ['student_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema to remove mentor_assignments."""
    op.drop_index(op.f('ix_mentor_assignments_student_id'), table_name='mentor_assignments')
    op.drop_index(op.f('ix_mentor_assignments_faculty_user_id'), table_name='mentor_assignments')
    op.drop_index(op.f('ix_mentor_assignments_id'), table_name='mentor_assignments')
    op.drop_table('mentor_assignments')
