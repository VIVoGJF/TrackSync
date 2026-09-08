from datetime import date
from uuid import UUID
from calendar import monthrange

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_routes import get_current_user
from app.db.database import get_db
from app.db.models import DeadlineTaskCompletion, RecurringTaskProgress, Task, TaskActivePeriod, TaskType, User, WeeklyTaskCompletion
from app.db.models import DailyActivity
from app.schemas.dashboard_schemas import ActivePeriodResponse, ActivityResponse, DashboardResponse, DailyTaskResponse, DeadlineResponse, DeadlineTaskResponse, WeeklyCompletionResponse, WeeklyTaskResponse

from app.services.progress_service import initialize_status_string

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", response_model=DashboardResponse)
async def get_dashboard(year: int, month: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if month < 1 or month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12.",
        )

    month_start = date(year, month, 1)
    month_end = date(year, month, monthrange(year, month)[1])

    tasks_result = await db.execute(
        select(Task).where(
            Task.user_id == current_user.id,
            Task.is_archived.is_(False),
        )
    )

    tasks = tasks_result.scalars().all()

    if not tasks:
        return DashboardResponse(
            year=year,
            month=month,
            tasks=[],
            activity=[],
        )

    task_ids = [task.id for task in tasks]

    active_period_result = await db.execute(
        select(TaskActivePeriod).where(
            TaskActivePeriod.task_id.in_(task_ids),
            TaskActivePeriod.start_date <= month_end,
            (
                TaskActivePeriod.end_date.is_(None)
                | (TaskActivePeriod.end_date >= month_start)
            ),
        )
    )

    active_periods_by_task = {}

    for period in active_period_result.scalars().all():
        active_periods_by_task.setdefault(
            period.task_id,
            [],
        ).append(period)

    progress_result = await db.execute(
        select(RecurringTaskProgress).where(
            RecurringTaskProgress.task_id.in_(task_ids),
            RecurringTaskProgress.year == year,
            RecurringTaskProgress.month == month,
        )
    )

    progress_by_task = {
        progress.task_id: progress
        for progress in progress_result.scalars().all()
    }

    weekly_result = await db.execute(
        select(WeeklyTaskCompletion).where(
            WeeklyTaskCompletion.task_id.in_(task_ids),
            WeeklyTaskCompletion.year == year,
            WeeklyTaskCompletion.month == month,
        )
    )

    weekly_completions_by_task = {}

    for completion in weekly_result.scalars().all():
        weekly_completions_by_task.setdefault(
            completion.task_id,
            [],
        ).append(completion)

    deadline_result = await db.execute(
        select(DeadlineTaskCompletion).where(
            DeadlineTaskCompletion.task_id.in_(task_ids),
            DeadlineTaskCompletion.start_date <= month_end,
            DeadlineTaskCompletion.deadline_date >= month_start,
        )
    )

    deadlines_by_task = {
        deadline.task_id: deadline
        for deadline in deadline_result.scalars().all()
    }

    activity_result = await db.execute(
        select(DailyActivity)
        .where(
            DailyActivity.user_id == current_user.id,
            DailyActivity.activity_date >= month_start,
            DailyActivity.activity_date <= month_end,
        )
        .order_by(DailyActivity.activity_date)
    )

    activity = activity_result.scalars().all()

    dashboard_tasks = []

    for task in tasks:

        if task.task_type == TaskType.DEADLINE:
            deadline = deadlines_by_task.get(task.id)

            if deadline is None:
                continue

            dashboard_tasks.append(
                DeadlineTaskResponse(
                    task_id=task.id,
                    title=task.title,
                    description=task.description,
                    task_type=TaskType.DEADLINE,
                    deadline=DeadlineResponse(
                        start_date=deadline.start_date,
                        deadline_date=deadline.deadline_date,
                        completed=deadline.completed,
                        completed_at=deadline.completed_at,
                    ),
                )
            )

            continue

        periods = active_periods_by_task.get(task.id, [])

        if not periods:
            continue

        active_period_responses = [
            ActivePeriodResponse(
                start_date=period.start_date,
                end_date=period.end_date,
            )
            for period in periods
        ]

        progress = progress_by_task.get(task.id)

        if progress is not None:
            progress_string = progress.status_string
        else:
            progress_string = initialize_status_string(
                task.task_type,
                year,
                month,
            )

        if task.task_type == TaskType.DAILY:
            dashboard_tasks.append(
                DailyTaskResponse(
                    task_id=task.id,
                    title=task.title,
                    description=task.description,
                    task_type=TaskType.DAILY,
                    progress=progress_string,
                    active_period=active_period_responses,
                )
            )

        elif task.task_type == TaskType.WEEKLY:
            weekly_completions = [
                WeeklyCompletionResponse(
                    week=completion.week_number,
                    completion_date=completion.completion_date,
                )
                for completion in weekly_completions_by_task.get(
                    task.id,
                    [],
                )
            ]

            dashboard_tasks.append(
                WeeklyTaskResponse(
                    task_id=task.id,
                    title=task.title,
                    description=task.description,
                    task_type=TaskType.WEEKLY,
                    progress=progress_string,
                    weekly_completions=weekly_completions,
                    active_period=active_period_responses,
                )
            )

    return DashboardResponse(
        year=year,
        month=month,
        tasks=dashboard_tasks,
        activity=[
            ActivityResponse(
                date=entry.activity_date,
                count=entry.activity_count,
            )
            for entry in activity
        ],
    )