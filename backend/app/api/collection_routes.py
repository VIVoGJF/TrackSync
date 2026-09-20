from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Task, User, CollectionTaskLink, TaskCollection
from app.schemas.collection_schemas import CollectionCreate, CollectionResponse
from app.api.auth_routes import get_current_user

router = APIRouter(prefix="/collctions", tags=["Collections"])


@router.post("/", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_collection(collection_data: CollectionCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(TaskCollection).where(
            TaskCollection.user_id == current_user.id,
            TaskCollection.name == collection_data.name.strip(),
        )
    )

    existing_collection = result.scalar_one_or_none()

    if existing_collection is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A collection with this name already exists.",
        )

    result = await db.execute(
        select(Task).where(
            Task.id.in_(collection_data.task_ids),
            Task.user_id == current_user.id,
        )
    )

    tasks = result.scalars().all()

    if len(tasks) != len(collection_data.task_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more tasks were not found.",
        )

    if any(task.is_archived for task in tasks):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archived tasks cannot be added to a collection.",
        )

    collection = TaskCollection(
        user_id=current_user.id,
        name=collection_data.name.strip(),
    )

    db.add(collection)

    for task in tasks:
        db.add(
            CollectionTaskLink(
                collection=collection,
                task=task,
            )
        )

    await db.commit()
    await db.refresh(collection)

    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        task_ids=collection_data.task_ids,
    )


@router.get("/", response_model=list[CollectionResponse])
async def get_collections(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    collections_result = await db.execute(
        select(TaskCollection)
        .where(
            TaskCollection.user_id == current_user.id,
        )
        .order_by(TaskCollection.name)
    )

    collections = collections_result.scalars().all()

    if not collections:
        return []

    collection_ids = [collection.id for collection in collections]

    links_result = await db.execute(
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

    task_ids_by_collection = {}

    for collection_id, task_id in links_result.all():
        task_ids_by_collection.setdefault(
            collection_id,
            [],
        ).append(task_id)

    return [
        CollectionResponse(
            id=collection.id,
            name=collection.name,
            task_ids=task_ids_by_collection.get(
                collection.id,
                [],
            ),
        )
        for collection in collections
    ]


@router.get("/{collection_id}", response_model=CollectionResponse)
async def get_collection(collection_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(TaskCollection).where(
            TaskCollection.id == collection_id,
            TaskCollection.user_id == current_user.id,
        )
    )

    collection = result.scalar_one_or_none()

    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found.",
        )

    links_result = await db.execute(
        select(CollectionTaskLink.task_id)
        .join(
            Task,
            Task.id == CollectionTaskLink.task_id,
        )
        .where(
            CollectionTaskLink.collection_id == collection.id,
            Task.user_id == current_user.id,
            Task.is_archived.is_(False),
        )
    )

    task_ids = [task_id for task_id in links_result.scalars().all()]

    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        task_ids=task_ids,
    )


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(collection_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(TaskCollection).where(
            TaskCollection.id == collection_id,
            TaskCollection.user_id == current_user.id,
        )
    )

    collection = result.scalar_one_or_none()

    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found.",
        )

    await db.delete(collection)

    await db.commit()


@router.post("/{collection_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def add_task_to_collection(collection_id: UUID, task_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    collection_result = await db.execute(
        select(TaskCollection).where(
            TaskCollection.id == collection_id,
            TaskCollection.user_id == current_user.id,
        )
    )

    collection = collection_result.scalar_one_or_none()

    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found.",
        )

    task_result = await db.execute(
        select(Task).where(
            Task.id == task_id,
            Task.user_id == current_user.id,
        )
    )

    task = task_result.scalar_one_or_none()

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    if task.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archived tasks cannot be added to a collection.",
        )

    existing_link_result = await db.execute(
        select(CollectionTaskLink).where(
            CollectionTaskLink.collection_id == collection_id,
            CollectionTaskLink.task_id == task_id,
        )
    )

    existing_link = existing_link_result.scalar_one_or_none()

    if existing_link is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task is already in this collection.",
        )

    link = CollectionTaskLink(
        collection_id=collection_id,
        task_id=task_id,
    )

    db.add(link)

    await db.commit()

@router.delete("/{collection_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_task_from_collection(collection_id: UUID, task_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(CollectionTaskLink)
        .join(
            TaskCollection,
            TaskCollection.id == CollectionTaskLink.collection_id,
        )
        .where(
            CollectionTaskLink.collection_id == collection_id,
            CollectionTaskLink.task_id == task_id,
            TaskCollection.user_id == current_user.id,
        )
    )

    link = result.scalar_one_or_none()

    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task is not in this collection.",
        )

    await db.delete(link)

    await db.commit()