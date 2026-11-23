"""add business_scale and is_manual_override to business_profiles

Revision ID: 2a8f4c1e9b01
Revises: 1dda096b9349
Create Date: 2026-11-23 14:22:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2a8f4c1e9b01"
down_revision: str | None = "1dda096b9349"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "business_profiles",
        sa.Column(
            "business_scale",
            sa.String(length=20),
            server_default="mikro",
            nullable=False,
        ),
    )
    op.add_column(
        "business_profiles",
        sa.Column(
            "is_manual_override",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("business_profiles", "is_manual_override")
    op.drop_column("business_profiles", "business_scale")
