from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

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