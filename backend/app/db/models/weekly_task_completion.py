import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class WeeklyTaskCompletion(Base):
    __tablename__ = "weekly_task_completions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)

    year = Column(Integer, nullable=False)

    month = Column(Integer, nullable=False)

    week_number = Column(Integer, nullable=False)

    completion_date = Column(Date, nullable=False,)

    completed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("task_id", "year", "month", "week_number", name="uq_weekly_task_completion"),
    )

    task = relationship("Task", back_populates="weekly_completions")