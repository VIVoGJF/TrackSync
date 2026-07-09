from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Task, TaskType, User
from app.schemas.task_schemas import TaskCreate, TaskResponse
from app.api.auth_routes import get_current_user

from app.services.task_service import create_deadline_task, create_recurring_task


router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
)

@router.post("/", response_model=TaskResponse)
async def create_task(task: TaskCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    title = task.title.strip().lower()

    description = (
        task.description.strip()
        if task.description is not None
        else None
    )
    
    current_date = date.today()

    if task.task_type == TaskType.DEADLINE:
        if task.deadline is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Deadline tasks require a deadline.",
            )

        return await create_deadline_task(
            db=db,
            current_user=current_user,
            title=title,
            description=description,
            deadline=task.deadline,
            current_date = current_date
        )

    if task.deadline is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only deadline tasks can have a deadline.",
        )

    return await create_recurring_task(
        db=db,
        current_user=current_user,
        title=title,
        description=description,
        task_type=task.task_type,
        current_date = current_date
    )


@router.get("/", response_model=list[TaskResponse])
async def get_tasks(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
            select(Task).where(
                Task.user_id == current_user.id,
                Task.is_archived == False
            )
        )
    
    tasks = result.scalars().all()
    
    return tasks
    