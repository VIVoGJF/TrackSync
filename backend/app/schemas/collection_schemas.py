from uuid import UUID

from pydantic import BaseModel, Field


class CollectionCreate(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    task_ids: list[UUID] = Field(min_length=1)


class CollectionResponse(BaseModel):
    id: UUID
    name: str
    task_ids: list[UUID]