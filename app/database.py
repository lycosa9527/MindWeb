"""
Database configuration for FastAPI MindWeb Application
Using SQLite for simplicity and robustness
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Index
from datetime import datetime, timezone
import os

# Create async engine for SQLite
DATABASE_URL = "sqlite+aiosqlite:///./mindweb.db"
engine = create_async_engine(DATABASE_URL, echo=False)

# Create async session maker
AsyncSessionLocal = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Create base class for models
Base = declarative_base()

class User(Base):
    """User model for storing user information"""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(100), unique=True, nullable=False, index=True)
    username = Column(String(100), nullable=False)
    emoji = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_online = Column(Boolean, default=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.username,
            'emoji': self.emoji,
            'created_at': self.created_at.isoformat(),
            'last_seen': self.last_seen.isoformat(),
            'is_online': self.is_online
        }

class Conversation(Base):
    """Conversation model for storing conversation metadata"""
    __tablename__ = 'conversations'
    
    id = Column(Integer, primary_key=True)
    conversation_id = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(String(100), nullable=False, index=True)
    title = Column(String(200))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'user_id': self.user_id,
            'title': self.title,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Message(Base):
    """Message model for storing chat messages"""
    __tablename__ = 'messages'
    
    # Add composite indexes for production optimization
    __table_args__ = (
        Index('ix_message_created_at_type', 'created_at', 'message_type'),
        Index('ix_message_conversation_created', 'conversation_id', 'created_at'),
        Index('ix_message_user_created', 'user_id', 'created_at'),
    )
    
    id = Column(Integer, primary_key=True)
    message_id = Column(String(100), unique=True, nullable=False, index=True)
    content = Column(Text, nullable=False)
    message_type = Column(String(20), nullable=False)  # 'user', 'ai', 'system'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Foreign keys
    user_id = Column(String(100), nullable=True, index=True)
    conversation_id = Column(String(100), nullable=True, index=True)
    
    # Additional metadata
    message_metadata = Column(Text)  # JSON string for additional data
    
    def to_dict(self):
        return {
            'id': self.id,
            'message_id': self.message_id,
            'content': self.content,
            'message_type': self.message_type,
            'created_at': self.created_at.isoformat(),
            'user_id': self.user_id,
            'conversation_id': self.conversation_id
        }

# Dependency to get database session
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Initialize database
async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
