import uuid

from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base


class User(Base):
    
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    timezone = Column(String(64), nullable=False, server_default="UTC")
    avatar_uploaded = Column(Boolean, nullable=False, server_default="false")
    avatar_version = Column(Integer, nullable=False, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("DailyActivity", back_populates="user", cascade="all, delete-orphan")
    collection = relationship("TaskCollection", back_populates="user", cascade="all, delete-orphan")