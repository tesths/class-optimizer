"""score item targets for groups

Revision ID: c1f4e2b7a9d1
Revises: 4b3e41dc0a10
Create Date: 2026-03-21 20:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1f4e2b7a9d1'
down_revision: Union[str, None] = '4b3e41dc0a10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('score_items', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'target_type',
                sa.String(length=20),
                nullable=False,
                server_default='student',
            )
        )

    with op.batch_alter_table('group_score_logs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('score_item_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_group_score_logs_score_item_id_score_items',
            'score_items',
            ['score_item_id'],
            ['id'],
        )


def downgrade() -> None:
    with op.batch_alter_table('group_score_logs', schema=None) as batch_op:
        batch_op.drop_constraint('fk_group_score_logs_score_item_id_score_items', type_='foreignkey')
        batch_op.drop_column('score_item_id')

    with op.batch_alter_table('score_items', schema=None) as batch_op:
        batch_op.drop_column('target_type')
