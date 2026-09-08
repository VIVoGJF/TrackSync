from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel

from app.db.models import TaskType


class ActivePeriodResponse(BaseModel):
    start_date: date
    end_date: date | None


class WeeklyCompletionResponse(BaseModel):
    week: int
    completion_date: date


class DeadlineResponse(BaseModel):
    start_date: date
    deadline_date: date
    completed: bool
    completed_at: datetime | None


class ActivityResponse(BaseModel):
    date: date
    count: int


class DailyTaskResponse(BaseModel):
    task_id: UUID
    title: str
    description: str | None
    task_type: TaskType
    progress: str
    active_period: list[ActivePeriodResponse]


class WeeklyTaskResponse(BaseModel):
    task_id: UUID
    title: str
    description: str | None
    task_type: TaskType
    progress: str
    weekly_completions: list[WeeklyCompletionResponse]
    active_period: list[ActivePeriodResponse]


class DeadlineTaskResponse(BaseModel):
    task_id: UUID
    title: str
    description: str | None
    task_type: TaskType
    deadline: DeadlineResponse


class DashboardResponse(BaseModel):
    year: int
    month: int
    tasks: list[
        DailyTaskResponse
        | WeeklyTaskResponse
        | DeadlineTaskResponse
    ]
    activity: list[ActivityResponse]