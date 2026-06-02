import uuid

from sqlalchemy import Column, Integer, Date, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID


from app.db.database import Base

class TaskActivePeriod(Base):
    
    __tablename__ = "task_active_periods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False, index=True)
    iteration = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)

    __table_args__ = (
        UniqueConstraint('task_id', 'iteration', name='uq_task_iteration'),
    )