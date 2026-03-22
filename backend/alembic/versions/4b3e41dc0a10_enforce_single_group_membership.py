"""enforce single group membership

Revision ID: 4b3e41dc0a10
Revises: 9b5fc647a868
Create Date: 2026-03-21 18:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4b3e41dc0a10'
down_revision: Union[str, None] = '9b5fc647a868'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DELETE FROM group_members
        WHERE EXISTS (
            SELECT 1
            FROM students
            WHERE students.id = group_members.student_id
              AND (
                students.group_id IS NULL
                OR students.group_id != group_members.group_id
              )
        )
        """
    )
    op.execute(
        """
        INSERT INTO group_members (group_id, student_id, created_at)
        SELECT students.group_id, students.id, CURRENT_TIMESTAMP
        FROM students
        WHERE students.group_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM group_members
            WHERE group_members.student_id = students.id
          )
        """
    )
    inspector = sa.inspect(op.get_bind())
    unique_constraints = inspector.get_unique_constraints('group_members')
    unique_columns = {tuple(constraint.get('column_names') or []) for constraint in unique_constraints}

    if ('student_id',) not in unique_columns:
        with op.batch_alter_table('group_members', schema=None) as batch_op:
            batch_op.create_unique_constraint('uix_group_member_student', ['student_id'])


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    unique_constraints = inspector.get_unique_constraints('group_members')
    constraint_names = {constraint.get('name') for constraint in unique_constraints}
    unique_columns = {tuple(constraint.get('column_names') or []) for constraint in unique_constraints}

    with op.batch_alter_table('group_members', schema=None) as batch_op:
        if 'uix_group_member_student' in constraint_names or ('student_id',) in unique_columns:
            batch_op.drop_constraint('uix_group_member_student', type_='unique')
        if ('group_id', 'student_id') not in unique_columns:
            batch_op.create_unique_constraint('uix_group_student', ['group_id', 'student_id'])
