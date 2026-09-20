from datetime import date, timedelta
from uuid import UUID
from calendar import monthrange

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_routes import get_current_user
from app.db.database import get_db
from app.db.models import DeadlineTaskCompletion, RecurringTaskProgress, Task, TaskActivePeriod, TaskType, User, WeeklyTaskCompletion, DailyActivity, TaskCollection, CollectionTaskLink
from app.schemas.dashboard_schemas import YearlyActivityResponse, ActivePeriodResponse, ActivityResponse, DashboardResponse, DailyTaskResponse, DeadlineResponse, DeadlineTaskResponse, WeeklyCompletionResponse, WeeklyTaskResponse, DashboardCollectionResponse

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

    collections_result = await db.execute(
        select(TaskCollection).where(
            TaskCollection.user_id == current_user.id,
        )
    )

    collections = collections_result.scalars().all()

    collection_task_ids = {}

    if collections:
        collection_ids = [collection.id for collection in collections]

        collection_links_result = await db.execute(
            select(
                CollectionTaskLink.collection_id,
                CollectionTaskLink.task_id,
            )
            .join(
                Task,
                Task.id == CollectionTaskLink.task_id,
            )
            .where(
                CollectionTaskLink.collection_id.in_(collection_ids),
                Task.user_id == current_user.id,
                Task.is_archived.is_(False),
            )
        )

        for collection_id, task_id in collection_links_result.all():
            collection_task_ids.setdefault(
                collection_id,
                [],
            ).append(task_id)

    dashboard_collections = [
        DashboardCollectionResponse(
            collection_id=collection.id,
            name=collection.name,
            task_ids=collection_task_ids.get(collection.id, []),
        )
        for collection in collections
    ]

    dashboard_tasks = []

    if tasks:
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
                            completion_date=deadline.completion_date,
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

    return DashboardResponse(
        year=year,
        month=month,
        tasks=dashboard_tasks,
        collections=dashboard_collections,
        activity=[
            ActivityResponse(
                date=entry.activity_date,
                count=entry.activity_count,
            )
            for entry in activity
        ],
    )


@router.get("/activity", response_model=YearlyActivityResponse)
async def get_activity(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    end = date.today()
    start = end - timedelta(days=364)

    result = await db.execute(
        select(DailyActivity)
        .where(
            DailyActivity.user_id == current_user.id,
            DailyActivity.activity_date >= start,
            DailyActivity.activity_date <= end,
        )
        .order_by(DailyActivity.activity_date)
    )

    activities = result.scalars().all()

    return YearlyActivityResponse(
        activity=[
            ActivityResponse(
                date=activity.activity_date,
                count=activity.activity_count,
            )
            for activity in activities
        ]
    )