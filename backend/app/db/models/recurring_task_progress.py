import uuid

from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base

class RecurringTaskProgress(Base):
    
    __tablename__ = "recurring_task_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    status_string = Column(String(31), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    __table_args__ = (
        UniqueConstraint('task_id', 'year', 'month', name='uq_task_month_progress'),
    )
    
    task = relationship("Task", back_populates="recurring_progress")