import uuid

from sqlalchemy import Column, String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.database import Base

class TaskCollection(Base):
    
    __tablename__ = "task_collections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    
    user = relationship("User", back_populates="collection")
    task_links = relationship("CollectionTaskLink", back_populates="collection", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_user_task_collection_name"),
    )