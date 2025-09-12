"""
Database Models for MindWeb Flask Application
Author: lycosa9527 - Made by MindSpring Team
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    """User model for storing user information"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    username = db.Column(db.String(100), nullable=False)
    emoji = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    is_online = db.Column(db.Boolean, default=True)
    
    # Relationships
    messages = db.relationship('Message', backref='user', lazy=True, cascade='all, delete-orphan')
    
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
    
    def __repr__(self):
        return f'<User {self.username}>'

class Conversation(db.Model):
    """Conversation model for storing conversation metadata"""
    __tablename__ = 'conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    title = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    messages = db.relationship('Message', backref='conversation', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'title': self.title,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'is_active': self.is_active,
            'message_count': len(self.messages)
        }
    
    def __repr__(self):
        return f'<Conversation {self.conversation_id}>'

class Message(db.Model):
    """Message model for storing chat messages"""
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(20), nullable=False)  # 'user', 'ai', 'system'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=True)
    
    # Additional metadata
    message_metadata = db.Column(db.Text)  # JSON string for additional data
    
    def set_metadata(self, data):
        """Set metadata as JSON string"""
        self.message_metadata = json.dumps(data)
    
    def get_metadata(self):
        """Get metadata as dictionary"""
        if self.message_metadata:
            return json.loads(self.message_metadata)
        return {}
    
    def to_dict(self):
        return {
            'id': self.id,
            'message_id': self.message_id,
            'content': self.content,
            'message_type': self.message_type,
            'created_at': self.created_at.isoformat(),
            'user': self.user.to_dict() if self.user else None,
            'conversation_id': self.conversation.conversation_id if self.conversation else None,
            'metadata': self.get_metadata()
        }
    
    def __repr__(self):
        return f'<Message {self.message_id}>'

class OnlineUser(db.Model):
    """Online user tracking model"""
    __tablename__ = 'online_users'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=False, index=True)
    session_id = db.Column(db.String(100), nullable=False)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'last_activity': self.last_activity.isoformat(),
            'ip_address': self.ip_address,
            'user_agent': self.user_agent
        }
    
    def __repr__(self):
        return f'<OnlineUser {self.user_id}>'
