"""add data_source, subject, assessment_name to academic_records

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-10-05 14:22:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to add provenance and assessment details to academic_records."""
    op.add_column('academic_records', sa.Column('data_source', sa.String(length=50), nullable=True, server_default='faculty_verified'))
    op.add_column('academic_records', sa.Column('subject', sa.String(length=100), nullable=True))
    op.add_column('academic_records', sa.Column('assessment_name', sa.String(length=100), nullable=True))


def downgrade() -> None:
    """Downgrade schema to remove provenance fields."""
    op.drop_column('academic_records', 'assessment_name')
    op.drop_column('academic_records', 'subject')
    op.drop_column('academic_records', 'data_source')
