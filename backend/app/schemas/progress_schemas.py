from datetime import date
from uuid import UUID

from pydantic import BaseModel


class ProgressToggle(BaseModel):
    date: date


class ProgressResponse(BaseModel):
    task_id: UUID
    date: date
    status: int