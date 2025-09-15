"""
Chat routes for FastAPI MindWeb Application
Handles Dify API integration with streaming responses
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
import asyncio
import os
from pydantic import BaseModel
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import json
import time
import uuid
from app.database import get_db, User, Conversation, Message, AsyncSessionLocal
from app.dify_client import AsyncDifyClient
from app.broadcast_manager import broadcast_manager
from app.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger("ChatRouter")

class ChatRequest(BaseModel):
    message: str
    user_id: str
    conversation_id: Optional[str] = None
    username: Optional[str] = None
    emoji: Optional[str] = "😀"

class ChatResponse(BaseModel):
    status: str
    message: str
    conversation_id: Optional[str] = None

class ChatConfigResponse(BaseModel):
    web_url: str

async def get_dify_client(request: Request) -> AsyncDifyClient:
    """Get Dify client from app state"""
    return request.app.state.dify_client

@router.post("/stream")
async def stream_chat(
    request: ChatRequest
):
    """Stream chat response from Dify API with real-time broadcasting"""
    
    print(f"DEBUG: stream_chat function called with message: {request.message[:50]}...")
    logger.info(f"Chat request from {request.username}: {request.message[:50]}...")
    
    # Load environment variables
    load_dotenv()
    
    # Create a fresh Dify client for this request
    api_key = os.getenv("DIFY_API_KEY")
    api_url = os.getenv("DIFY_API_URL", "http://dify.mindspringedu.com/v1")
    
    print(f"DEBUG: Creating Dify client with API key: {api_key[:10] if api_key else 'None'}... and URL: {api_url}")
    print(f"DEBUG: Environment variables check - DIFY_API_KEY exists: {bool(api_key)}, DIFY_API_URL: {api_url}")
    logger.info(f"Creating Dify client with API key: {api_key[:10] if api_key else 'None'}... and URL: {api_url}")
    logger.info(f"Environment variables check - DIFY_API_KEY exists: {bool(api_key)}, DIFY_API_URL: {api_url}")
    
    dify_client = AsyncDifyClient(
        api_key=api_key,
        api_url=api_url
    )
    
    # Create a new database session for this request
    async with AsyncSessionLocal() as db:
        try:
            # Get or create user
            user = await get_or_create_user(db, request.user_id, request.username, request.emoji)
            
            # Get or create conversation
            conversation = await get_or_create_conversation(db, request.conversation_id, request.user_id)
            
            # Save user message to database
            user_message = Message(
                message_id=str(uuid.uuid4()),
                content=request.message,
                message_type='user',
                user_id=request.user_id,
                conversation_id=conversation.conversation_id
            )
            db.add(user_message)
            await db.commit()
            
            # Broadcast user message to all connected clients
            await broadcast_manager.broadcast({
                'type': 'user_message',
                'content': request.message,
                'from_user': request.username or user.username,
                'from_user_id': request.user_id,
                'emoji': request.emoji,
                'timestamp': int(time.time() * 1000)
            })
            
            # Process Dify response and broadcast in real-time
            ai_response_content = ""
            async for chunk in dify_client.stream_chat(
                request.message, 
                request.user_id, 
                conversation.conversation_id
            ):
                if chunk.get('event') == 'message':
                    # Regular message content
                    content = chunk.get('answer', '')
                    if content:
                        ai_response_content += content
                        
                        # Broadcast AI response chunk to all connected clients
                        await broadcast_manager.broadcast({
                            'type': 'ai_message_chunk',
                            'content': content,
                            'conversation_id': conversation.conversation_id,
                            'from_user': request.username or user.username,
                            'from_user_id': request.user_id,
                            'timestamp': int(time.time() * 1000)
                        })
                
                elif chunk.get('event') == 'message_end':
                    # Save complete AI response to database
                    if ai_response_content:
                        ai_message = Message(
                            message_id=str(uuid.uuid4()),
                            content=ai_response_content,
                            message_type='ai',
                            user_id=request.user_id,
                            conversation_id=conversation.conversation_id
                        )
                        db.add(ai_message)
                        await db.commit()
                    
                    # Broadcast message end
                    await broadcast_manager.broadcast({
                        'type': 'ai_message_end',
                        'conversation_id': conversation.conversation_id,
                        'from_user': request.username or user.username,
                        'from_user_id': request.user_id,
                        'timestamp': int(time.time() * 1000)
                    })
                    break
                
                elif chunk.get('event') == 'error':
                    logger.error(f"Dify API error: {chunk.get('error')}")
                    await broadcast_manager.broadcast({
                        'type': 'error',
                        'error': chunk.get('error'),
                        'from_user': request.username or user.username,
                        'from_user_id': request.user_id,
                        'timestamp': int(time.time() * 1000)
                    })
                    break
            
            # Return success response
            return {
                "status": "success",
                "message": "Message processed successfully",
                "conversation_id": conversation.conversation_id
            }
            
        except Exception as e:
            logger.error(f"Chat processing error: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to process chat: {str(e)}")

@router.get("/history")
async def get_chat_history(
    user_id: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Get chat history for a user or all users"""
    try:
        # Get recent messages for the user or all users
        from sqlalchemy import select, desc
        
        query = select(Message).order_by(desc(Message.created_at)).limit(limit)
        
        if user_id:
            query = query.where(Message.user_id == user_id)
        
        result = await db.execute(query)
        messages = result.scalars().all()
        
        return {
            "status": "success",
            "messages": [msg.to_dict() for msg in reversed(messages)],
            "count": len(messages)
        }
        
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get chat history")

@router.get("/config", response_model=ChatConfigResponse)
async def get_chat_config():
    """Return frontend configuration such as WEB_URL for sharing"""
    try:
        load_dotenv()
        web_url = os.getenv("WEB_URL", "http://localhost:9530")
        return ChatConfigResponse(web_url=web_url)
    except Exception as e:
        logger.error(f"Error reading config: {e}")
        raise HTTPException(status_code=500, detail="Failed to load config")

async def get_or_create_user(db: AsyncSession, user_id: str, username: str, emoji: str) -> User:
    """Get or create user in database"""
    from sqlalchemy import select
    
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            user_id=user_id,
            username=username or f"User{user_id[-4:]}",
            emoji=emoji
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info(f"Created new user: {user.username}")
    else:
        # Update last seen
        from datetime import datetime, timezone
        user.last_seen = datetime.now(timezone.utc)
        await db.commit()
        logger.debug(f"Updated user last seen: {user.username}")
    
    return user

async def get_or_create_conversation(db: AsyncSession, conversation_id: str, user_id: str) -> Conversation:
    """Get or create conversation in database"""
    from sqlalchemy import select
    
    if conversation_id:
        result = await db.execute(select(Conversation).where(Conversation.conversation_id == conversation_id))
        conversation = result.scalar_one_or_none()
        if conversation:
            return conversation
    
    # Create new conversation
    new_conversation_id = str(uuid.uuid4())
    conversation = Conversation(
        conversation_id=new_conversation_id,
        user_id=user_id,
        title="New Conversation"
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    
    logger.info(f"Created new conversation: {new_conversation_id}")
    return conversation

@router.get("/broadcast")
async def broadcast_stream():
    """Server-Sent Events endpoint for real-time broadcasting"""
    
    async def event_generator():
        # Create a queue for this connection
        queue = asyncio.Queue()
        
        # Add this queue to the broadcast manager
        broadcast_manager.add_listener(queue)
        
        try:
            # Send recent history to new client
            for event in broadcast_manager.get_recent_history(10):
                yield f"data: {json.dumps(event)}\n\n"
            
            while True:
                # Wait for messages from the broadcast manager
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(message)}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive ping
                    yield f"data: {json.dumps({'type': 'ping'})}\n\n"
                except asyncio.CancelledError:
                    # Client disconnected; exit quietly
                    break
                    
        except Exception as e:
            logger.error(f"Broadcast stream error: {e}")
        finally:
            # Remove this queue from the broadcast manager
            broadcast_manager.remove_listener(queue)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        }
    )
