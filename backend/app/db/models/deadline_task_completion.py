import uuid

from sqlalchemy import Column, DateTime, Date, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.database import Base

class DeadlineTaskCompletion(Base):
    
    __tablename__ = "deadline_task_completions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False, unique = True, index=True)
    start_date = Column(Date, nullable=False)
    deadline_date = Column(Date, nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)