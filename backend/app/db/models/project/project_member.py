import uuid
import enum

from sqlalchemy import Column, DateTime, ForeignKey, Boolean, Enum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base


class ProjectRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"


class ProjectMember(Base):
    
    __tablename__ = "project_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(ProjectRole), nullable=False, default=ProjectRole.MEMBER)
    is_active = Column(Boolean, default=True, nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_member"),
    )

    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="project_memberships")