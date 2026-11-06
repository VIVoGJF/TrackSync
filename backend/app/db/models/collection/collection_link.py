import uuid

from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.database import Base

class CollectionTaskLink(Base):
    
    __tablename__ = "collection_task_links"
    
    collection_id = Column(UUID(as_uuid=True), ForeignKey("task_collections.id", ondelete="CASCADE"), primary_key=True)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    
    collection = relationship("TaskCollection", back_populates="task_links")
    task = relationship("Task", back_populates="collection_links")