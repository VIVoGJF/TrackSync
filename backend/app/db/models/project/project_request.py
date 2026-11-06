import uuid
import enum

from sqlalchemy import Column, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base


class ProjectRequestType(str, enum.Enum):
    INVITATION = "INVITATION"
    JOIN_REQUEST = "JOIN_REQUEST"


class ProjectRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class ProjectRequest(Base):
    
    __tablename__ = "project_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    requester_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    target_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum(ProjectRequestType), nullable=False)
    status = Column(Enum(ProjectRequestStatus), nullable=False, default=ProjectRequestStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    responded_at = Column(DateTime(timezone=True), nullable=True)

    project = relationship("Project", back_populates="requests")
    requester = relationship("User", foreign_keys=[requester_id], back_populates="project_requests_sent")
    target_user = relationship("User", foreign_keys=[target_user_id], back_populates="project_requests_received")
    
    