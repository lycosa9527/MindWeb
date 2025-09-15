"""
User management routes for FastAPI MindWeb Application
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List, Optional
import time
from app.database import get_db, User
from app.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger("UserRouter")

class UserVisitRequest(BaseModel):
    user_id: str
    username: str
    emoji: str = "😀"

class UserVisitResponse(BaseModel):
    success: bool
    message: str

@router.get("/online")
async def get_online_users(db: AsyncSession = Depends(get_db)):
    """Get online users from database"""
    try:
        # Get users who were active in the last 5 minutes
        cutoff_time = datetime.utcnow() - timedelta(minutes=5)
        
        result = await db.execute(
            select(User).where(
                and_(
                    User.last_seen >= cutoff_time,
                    User.is_online == True
                )
            )
        )
        online_users = result.scalars().all()
        
        users_data = [user.to_dict() for user in online_users]
        logger.debug(f"Retrieved {len(users_data)} online users")
        
        return {
            "success": True,
            "users": users_data,
            "count": len(users_data)
        }
        
    except Exception as e:
        logger.error(f"Error getting online users: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve online users")

@router.post("/visit", response_model=UserVisitResponse)
async def track_user_visit(
    request: UserVisitRequest,
    db: AsyncSession = Depends(get_db)
):
    """Track when a user visits the page"""
    try:
        logger.info(f"User visit tracked: {request.username} ({request.user_id})")
        
        # Get or create user
        result = await db.execute(select(User).where(User.user_id == request.user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            # Create new user
            user = User(
                user_id=request.user_id,
                username=request.username,
                emoji=request.emoji
            )
            db.add(user)
            logger.info(f"Created new user: {request.username}")
        else:
            # Update existing user
            user.username = request.username
            user.emoji = request.emoji
            user.last_seen = datetime.utcnow()
            user.is_online = True
            logger.debug(f"Updated user: {request.username}")
        
        await db.commit()
        logger.debug(f"User {request.username} added/updated in database")
        
        return UserVisitResponse(
            success=True,
            message=f"User {request.username} visit tracked successfully"
        )
        
    except Exception as e:
        logger.error(f"Error tracking user visit: {e}")
        raise HTTPException(status_code=500, detail="Failed to track user visit")
