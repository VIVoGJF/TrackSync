import uuid
import enum

from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base

class TaskType(str, enum.Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    DEADLINE = "DEADLINE"

class Task(Base):
    
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String(50), nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    user = relationship("User", back_populates="tasks")
    active_periods = relationship("TaskActivePeriod", back_populates="task", cascade="all, delete-orphan")
    recurring_progress = relationship("RecurringTaskProgress", back_populates="task", cascade="all, delete-orphan")
    deadline_completion = relationship("DeadlineTaskCompletion", back_populates="task", cascade="all, delete-orphan", uselist=False )