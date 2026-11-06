import uuid
import enum

from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base


class NotificationType(str, enum.Enum):
    PROJECT_INVITE = "PROJECT_INVITE"
    PROJECT_JOIN_REQUEST = "PROJECT_JOIN_REQUEST"
    PROJECT_INVITATION_ACCEPTED = "PROJECT_INVITATION_ACCEPTED"
    PROJECT_INVITATION_REJECTED = "PROJECT_INVITATION_REJECTED"
    PROJECT_JOIN_ACCEPTED = "PROJECT_JOIN_ACCEPTED"
    PROJECT_JOIN_REJECTED = "PROJECT_JOIN_REJECTED"
    PROJECT_MEMBER_REMOVED = "PROJECT_MEMBER_REMOVED"


class Notification(Base):
    
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="notifications")