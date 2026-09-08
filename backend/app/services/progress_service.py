from datetime import date, datetime
from uuid import UUID
from calendar import monthcalendar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import TaskType, DeadlineTaskCompletion, RecurringTaskProgress, WeeklyTaskCompletion, Task
from app.services.calendar_service import get_days_in_month, get_weeks_in_month 


def initialize_status_string(task_type: TaskType, year: int, month: int) -> str:
    if task_type == TaskType.DAILY:
        length = get_days_in_month(year, month)

    elif task_type == TaskType.WEEKLY:
        length = get_weeks_in_month(year, month)

    else:
        raise ValueError("Deadline tasks do not use progress strings.")

    return "0" * length

async def _get_monthly_progress(db: AsyncSession, task_id: UUID, year: int, month: int) -> RecurringTaskProgress:
    result = await db.execute(
        select(RecurringTaskProgress)
        .where(
            RecurringTaskProgress.task_id == task_id,
            RecurringTaskProgress.year == year,
            RecurringTaskProgress.month == month,
        )
    )
    progress = result.scalars().first()
    
    if progress is None:
        raise ValueError("Monthly Progress not found")
    
    return progress

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
    progress = await _get_monthly_progress(db, task.id, requested_date.year, requested_date.month)
    
    day_index = requested_date.day - 1
    
    updated_status, new_status = await _toggle_status_bit(progress.status_string, day_index)
    
    progress.status_string = updated_status
    progress.updated_at = datetime.now()
    
    return new_status

async def toggle_weekly_progress(db: AsyncSession, task: Task, requested_date: date) -> tuple[int, int]:
    progress = await _get_monthly_progress(db, task.id, requested_date.year, requested_date.month)
    
    week_index = _get_week_index(requested_date)
    
    updated_status, new_status = await _toggle_status_bit(progress.status_string, week_index)
    
    progress.status_string = updated_status
    progress.updated_at = datetime.now()
    
    week_number = week_index + 1
    
    result = await db.execute(
        select(WeeklyTaskCompletion)
        .where(
            WeeklyTaskCompletion.task_id == task.id,
            WeeklyTaskCompletion.year == requested_date.year,
            WeeklyTaskCompletion.month == requested_date.month,
            WeeklyTaskCompletion.week_number == week_number,
        )
    )
    
    completion = result.scalar_one_or_none()
    
    if new_status == 1 :
        if completion is None:
            completion = WeeklyTaskCompletion(
                task_id=task.id,
                year=requested_date.year,
                month=requested_date.month,
                week_number=week_number,
                completion_date=requested_date,
            )
            db.add(completion)    
    else:
        if completion is not None:
            await db.delete(completion)
            
    return new_status, week_index

async def toggle_deadline_progress(db: AsyncSession, task: Task) -> int:
    result = await db.execute(
        select(DeadlineTaskCompletion)
        .where(
            DeadlineTaskCompletion.task_id == task.id
        )
    )

    completion = result.scalar_one_or_none()

    if completion is None:
        raise ValueError("Deadline completion record not found.")

    new_status = 0 if completion.completed else 1

    completion.completed = bool(new_status)

    if new_status == 1:
        completion.completed_at = datetime.now()
    else:
        completion.completed_at = None

    return new_status