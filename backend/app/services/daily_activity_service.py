from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import DailyActivity


async def update_daily_activity(db: AsyncSession, user_id: UUID, activity_date: date, delta: int) -> None:
    result = await db.execute(
        select(DailyActivity)
        .where(
            DailyActivity.user_id == user_id,
            DailyActivity.activity_date == activity_date,
        )
    )

    activity = result.scalar_one_or_none()

    if delta > 0:
        if activity is None:
            activity = DailyActivity(
                user_id=user_id,
                activity_date=activity_date,
                activity_count=delta,
            )
            db.add(activity)
        else:
            activity.activity_count += delta

    elif delta < 0:
        if activity is None:
            return

        activity.activity_count += delta

        if activity.activity_count <= 0:
            await db.delete(activity)