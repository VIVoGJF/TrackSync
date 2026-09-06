from datetime import date
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.db.models import User, Task, DeadlineTaskCompletion, RecurringTaskProgress,  TaskActivePeriod, TaskType

from app.services.progress_service import initialize_status_string

async def create_deadline_task(db: AsyncSession, current_user: User, title: str, description: str | None, deadline: date, current_date: date) -> Task:
    new_task = Task(
        user_id = current_user.id,
        title = title,
        description = description,
        task_type = TaskType.DEADLINE.value,
    )
    
    db.add(new_task)
    await db.flush()
    
    deadline_task = DeadlineTaskCompletion(
        task_id = new_task.id,
        start_date = current_date,
        deadline_date = deadline
    )
    
    db.add(deadline_task)
    
    await db.commit()
    await db.refresh(new_task)
    
    return new_task

async def create_recurring_task(db: AsyncSession, current_user: User, title: str, description: str | None, task_type: TaskType, current_date: date) -> Task:
    existing_task = (
        await db.execute(
            select(Task).where(
                Task.user_id == current_user.id,
                Task.title == title 
            )
        )
    ).scalar_one_or_none()
    
    if existing_task:
        if not existing_task.is_archived:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Task already exists."
            )
    
    new_task = Task(
        user_id = current_user.id,
        title = title,
        description = description,
        task_type = task_type.value,
    )
    
    db.add(new_task)
    await db.flush()
    
    acitve_period = TaskActivePeriod(
        task_id = new_task.id,
        iteration = 1,
        start_date = current_date
    )
    
    db.add(acitve_period)
    
    status_string = initialize_status_string(task_type=task_type, year=current_date.year, month=current_date.month)
    
    progress = RecurringTaskProgress(
        task_id = new_task.id,
        year = current_date.year,
        month = current_date.month,
        status_string = status_string
    )
    
    db.add(progress)
    
    await db.commit()
    await db.refresh(new_task)
    
    return new_task    

async def update_deadline(db: AsyncSession, task: Task, new_deadline: date, current_date: date):
    if task.task_type != TaskType.DEADLINE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only deadline tasks can have their deadline updated.",
        )

    deadline_task = (
        await db.execute(
            select(DeadlineTaskCompletion).where(
                DeadlineTaskCompletion.task_id == task.id
            )
        )
    ).scalar_one_or_none()

    if deadline_task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deadline information not found.",
        )

    if deadline_task.completed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Completed deadline tasks cannot have their deadline changed.",
        )

    if new_deadline < current_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deadline cannot be in the past.",
        )

    if new_deadline < deadline_task.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deadline cannot be before the task start date.",
        )

    deadline_task.deadline_date = new_deadline

    await db.commit()
    await db.refresh(deadline_task)

    return deadline_task 

async def archive_task_service(db: AsyncSession, task_id: UUID, current_user: User, current_date: date):
    task = (
        await db.execute(
            select(Task).where(
                Task.id == task_id,
                Task.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    if task.task_type == TaskType.DEADLINE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deadline tasks cannot be archived.",
        )

    if task.is_archived:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task is already archived.",
        )

    active_period = (
        await db.execute(
            select(TaskActivePeriod).where(
                TaskActivePeriod.task_id == task.id,
                TaskActivePeriod.end_date.is_(None),
            )
        )
    ).scalar_one_or_none()

    if active_period is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task has no active period.",
        )

    active_period.end_date = current_date
    task.is_archived = True

    await db.commit()
    await db.refresh(task)

    return task

async def restore_task_service(db: AsyncSession, task_id: UUID, current_user: User, current_date: date,):
    task = (
        await db.execute(
            select(Task).where(
                Task.id == task_id,
                Task.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    if task.task_type == TaskType.DEADLINE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deadline tasks cannot be restored.",
        )

    if not task.is_archived:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task is already active.",
        )

    last_iteration = (
        await db.execute(
            select(func.max(TaskActivePeriod.iteration)).where(
                TaskActivePeriod.task_id == task.id
            )
        )
    ).scalar_one()

    new_period = TaskActivePeriod(
        task_id=task.id,
        iteration=(last_iteration or 0) + 1,
        start_date=current_date,
        end_date=None,
    )

    db.add(new_period)
    task.is_archived = False

    await db.commit()
    await db.refresh(task)

    return task