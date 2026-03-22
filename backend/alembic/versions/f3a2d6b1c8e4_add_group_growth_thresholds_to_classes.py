"""add group growth thresholds to classes

Revision ID: f3a2d6b1c8e4
Revises: c1f4e2b7a9d1
Create Date: 2026-03-21 21:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a2d6b1c8e4'
down_revision: Union[str, None] = 'c1f4e2b7a9d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('classes', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'group_growth_thresholds',
                sa.JSON(),
                nullable=False,
                server_default=sa.text("'[0, 20, 50, 90, 140]'"),
            )
        )


def downgrade() -> None:
    with op.batch_alter_table('classes', schema=None) as batch_op:
        batch_op.drop_column('group_growth_thresholds')
