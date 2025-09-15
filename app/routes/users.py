"""
User management routes for FastAPI MindWeb Application
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update
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
        # Mark stale users as offline (inactive for >5 minutes)
        cutoff_time = datetime.utcnow() - timedelta(minutes=5)
        await db.execute(
            update(User)
            .where(User.last_seen < cutoff_time)
            .values(is_online=False)
        )
        await db.commit()

        # Get users who were active in the last 5 minutes and flagged online
        
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
            # Create new user with server-generated username
            server_username = generate_username(request.user_id)
            user = User(
                user_id=request.user_id,
                username=server_username,
                emoji=request.emoji
            )
            db.add(user)
            logger.info(f"Created new user: {request.username}")
        else:
            # Update existing user: do not overwrite username; update emoji/online/last_seen
            user.emoji = request.emoji
            user.last_seen = datetime.utcnow()
            user.is_online = True
            logger.debug(f"Updated user: {request.username}")
        
        await db.commit()
        logger.debug(f"User {request.username} added/updated in database")
        
        return UserVisitResponse(
            success=True,
            message=f"User {user.username} visit tracked successfully"
        )
        
    except Exception as e:
        logger.error(f"Error tracking user visit: {e}")
        raise HTTPException(status_code=500, detail="Failed to track user visit")


def generate_username(user_id: str) -> str:
    """Server-side deterministic Chinese username (短中文+数字)，基于 user_id 哈希。
    规则：不超过5个中文字符，后跟2-4位数字。
    """
    words = [
        '学霸','学者','老师','同学','校友','书虫','书生','书友','读者','笔记',
        '黑板','教室','课堂','校长','讲师','导师','助教','图书','学堂','学苑',
        '学府','学海','学子','才子','才女','理科','文科','语文','数学','英语',
        '物理','化学','生物','历史','地理','哲学','心理','经济','艺术','音乐',
        '美术','体育','实验','论文','课题','作业','考卷','考试','竞赛','演讲',
        '辩论','实践','创新','研究','学术','校园','课代表','班长','组长','队长'
    ]
    # Deterministic hash
    seed = 0
    for ch in user_id:
        seed = ((seed << 5) - seed) + ord(ch)
        seed &= 0xFFFFFFFF
    a = words[seed % len(words)]
    b = words[(seed // 7) % len(words)]
    base = (a + b)[:5]
    num = (seed % 9900) + 100  # 3-4 位
    return f"{base}{num}"
