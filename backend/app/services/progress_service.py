from datetime import date, datetime
from uuid import UUID
from calendar import monthcalendar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import TaskType, DeadlineTaskCompletion, RecurringTaskProgress, WeeklyTaskCompletion, Task, TaskActivePeriod
from app.services.calendar_service import get_days_in_month, get_weeks_in_month,get_week_start, get_week_end


def initialize_status_string(task_type: TaskType, year: int, month: int) -> str:
    if task_type == TaskType.DAILY:
        length = get_days_in_month(year, month)

    elif task_type == TaskType.WEEKLY:
        length = get_weeks_in_month(year, month)

    else:
        raise ValueError("Deadline tasks do not use progress strings.")

    return "0" * length

async def _create_monthly_progress(db: AsyncSession, task: Task, requested_date: date, status_string: str | None = None) -> RecurringTaskProgress:

    progress = RecurringTaskProgress(
        task_id=task.id,
        year=requested_date.year,
        month=requested_date.month,
        status_string=(
            status_string
            if status_string is not None
            else initialize_status_string(
                task.task_type,
                requested_date.year,
                requested_date.month,
            )
        ),
    )

    db.add(progress)
    await db.flush()

    return progress

async def _get_monthly_progress(db: AsyncSession, task: Task, requested_date: date,) -> RecurringTaskProgress:

    result = await db.execute(
        select(RecurringTaskProgress).where(
            RecurringTaskProgress.task_id == task.id,
            RecurringTaskProgress.year == requested_date.year,
            RecurringTaskProgress.month == requested_date.month,
        )
    )

    progress = result.scalar_one_or_none()

    if progress is not None:
        return progress
    
    return await _create_monthly_progress(
        db=db,
        task=task,
        requested_date=requested_date,
    )

async def _toggle_status_bit(status_string: str, index: int) -> tuple[str, int]:
    current_status = int(status_string[index])
    new_status = 1 - current_status
    
    updated_status = status_string[:index] + str(new_status) + status_string[index + 1:]
    
    return updated_status, new_status

def _get_week_index(requested_date: date) -> int:
    weeks = monthcalendar(requested_date.year, requested_date.month)
    
    for index, week in enumerate(weeks):
        if requested_date.day in week:
            return index
        
    raise ValueError("Unable to dertermine week index")

async def toggle_daily_progress(db: AsyncSession, task: Task, requested_date: date) -> int:
    progress = await _get_monthly_progress(db, task, requested_date)
    
    day_index = requested_date.day - 1
    
    updated_status, new_status = await _toggle_status_bit(progress.status_string, day_index)
    
    progress.status_string = updated_status
    progress.updated_at = datetime.now()
    
    return new_status

async def toggle_weekly_progress(db: AsyncSession, task: Task, requested_date: date) -> tuple[int, int]:
    progress = await _get_monthly_progress(db, task, requested_date)
    
    week_index = _get_week_index(requested_date)
    week_number = week_index + 1
    
    week_end = get_week_end(requested_date)

    result = await db.execute(
        select(WeeklyTaskCompletion).where(
            WeeklyTaskCompletion.task_id == task.id,
            WeeklyTaskCompletion.year == requested_date.year,
            WeeklyTaskCompletion.month == requested_date.month,
            WeeklyTaskCompletion.week_number == week_number,
        )
    )

    completion = result.scalar_one_or_none()

    if completion is None:
        progress.status_string = (
            progress.status_string[:week_index]
            + "1"
            + progress.status_string[week_index + 1:]
        )

        progress.updated_at = datetime.now()

        completion = WeeklyTaskCompletion(
            task_id=task.id,
            year=requested_date.year,
            month=requested_date.month,
            week_number=week_number,
            completion_date=requested_date,
        )

        db.add(completion)

        if week_end.month != requested_date.month:
            next_progress = await _get_monthly_progress(
                db=db,
                task=task,
                requested_date=week_end,
            )

            next_week_index = _get_week_index(week_end)
            next_week_number = next_week_index + 1

            next_progress.status_string = (
                next_progress.status_string[:next_week_index]
                + "1"
                + next_progress.status_string[next_week_index + 1:]
            )

            next_progress.updated_at = datetime.now()

            next_completion = WeeklyTaskCompletion(
                task_id=task.id,
                year=week_end.year,
                month=week_end.month,
                week_number=next_week_number,
                completion_date=requested_date,
            )

            db.add(next_completion)

        return 1, week_index

    if completion.completion_date != requested_date:
        raise ValueError(
            "Weekly task is already completed for this week."
        )

    await db.delete(completion)

    progress.status_string = (
        progress.status_string[:week_index]
        + "0"
        + progress.status_string[week_index + 1:]
    )

    progress.updated_at = datetime.now()

    if week_end.month != requested_date.month:
        next_progress = await _get_monthly_progress(
            db=db,
            task=task,
            requested_date=week_end,
        )

        next_week_index = _get_week_index(week_end)
        next_week_number = next_week_index + 1

        next_progress.status_string = (
            next_progress.status_string[:next_week_index]
            + "0"
            + next_progress.status_string[next_week_index + 1:]
        )

        next_progress.updated_at = datetime.now()

        next_result = await db.execute(
            select(WeeklyTaskCompletion).where(
                WeeklyTaskCompletion.task_id == task.id,
                WeeklyTaskCompletion.year == week_end.year,
                WeeklyTaskCompletion.month == week_end.month,
                WeeklyTaskCompletion.week_number == next_week_number,
            )
        )

        next_completion = next_result.scalar_one_or_none()

        if next_completion is not None:
            await db.delete(next_completion)

    return 0, week_index

async def toggle_deadline_progress(db: AsyncSession, task: Task, requested_date: date) -> int:
    result = await db.execute(
        select(DeadlineTaskCompletion)
        .where(
            DeadlineTaskCompletion.task_id == task.id
        )
    )

    completion = result.scalar_one_or_none()

    if completion is None:
        raise ValueError("Deadline completion record not found.")
    
    if requested_date > completion.deadline_date:
        raise ValueError("Task deadline has already passed.")

    new_status = 0 if completion.completed else 1

    completion.completed = bool(new_status)

    if new_status == 1:
        completion.completion_date = requested_date
        completion.completed_at = datetime.now()
    else:
        completion.completion_date = None
        completion.completed_at = None

    return new_status