from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Task, TaskType, User
from app.schemas.task_schemas import TaskCreate, TaskResponse, DeadlineUpdate
from app.api.auth_routes import get_current_user

from app.services.task_service import create_deadline_task, create_recurring_task, update_deadline, archive_task_service, restore_task_service


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
        if task.deadline < current_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Deadline cannot be in the past.",
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
    
    return result.scalars().all()
    
@router.patch("/{task_id}/deadline")
async def update_task_deadline(task_id: UUID, deadline_update: DeadlineUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
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

    return await update_deadline(
        db=db,
        task=task,
        new_deadline=deadline_update.deadline,
        current_date=date.today(),
    )    

@router.get("/archived", response_model=list[TaskResponse])
async def get_archived_tasks(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Task).where(
            Task.user_id == current_user.id,
            Task.is_archived.is_(True),
        )
    )

    return result.scalars().all()



@router.patch("/{task_id}/archive", response_model=TaskResponse)
async def archive_task(task_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await archive_task_service(
        db=db,
        task_id=task_id,
        current_user=current_user,
        current_date=date.today(),
    )

@router.patch("/{task_id}/restore", response_model=TaskResponse)
async def restore_task(task_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
        return await restore_task_service(
            db=db,
            task_id=task_id,
            current_user=current_user,
            current_date=date.today(),
        )

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
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

    await db.delete(task)
    await db.commit()