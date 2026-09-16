from datetime import date
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_routes import get_current_user
from app.db.database import AsyncSessionLocal, get_db
from app.db.models import Task, TaskType, User
from app.schemas.progress_schemas import ProgressResponse, ProgressToggle
from app.services.daily_activity_service import update_daily_activity
from app.services.progress_service import toggle_daily_progress, toggle_deadline_progress, toggle_weekly_progress


router = APIRouter(prefix="/progress", tags=["Progress"])


async def update_daily_activity_background(user_id: UUID, activity_date: date, delta: int) -> None:
    async with AsyncSessionLocal() as db:
        try:
            await update_daily_activity(
                db=db,
                user_id=user_id,
                activity_date=activity_date,
                delta=delta,
            )
            await db.commit()
        except Exception:
            await db.rollback()


@router.patch("/{task_id}", response_model=ProgressResponse)
async def toggle_progress(task_id: UUID, payload: ProgressToggle, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_date = date.today()

    if payload.date != current_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only today's date can be toggled.",
        )

    result = await db.execute(
        select(Task).where(
            Task.id == task_id,
            Task.user_id == current_user.id,
        )
    )

    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    if task.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archived tasks cannot be updated.",
        )

    if task.task_type == TaskType.DAILY:
        new_status = await toggle_daily_progress(
            db=db,
            task=task,
            requested_date=payload.date,
        )

    elif task.task_type == TaskType.WEEKLY:
        new_status, _ = await toggle_weekly_progress(
            db=db,
            task=task,
            requested_date=payload.date,
        )

    elif task.task_type == TaskType.DEADLINE:
        new_status = await toggle_deadline_progress(
            db=db,
            task=task,
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported task type.",
        )

    await db.commit()

    delta = 1 if new_status == 1 else -1

    background_tasks.add_task(
        update_daily_activity_background,
        current_user.id,
        payload.date,
        delta,
    )

    return ProgressResponse(
        task_id=task.id,
        date=payload.date,
        status=new_status,
    )