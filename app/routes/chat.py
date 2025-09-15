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
    ai_name: str
    ai_placeholder: str

async def get_dify_client(request: Request) -> AsyncDifyClient:
    """Get Dify client from app state"""
    return request.app.state.dify_client

@router.post("/stream")
async def stream_chat(
    payload: ChatRequest,
    req: Request
):
    """Stream chat response from Dify API with real-time broadcasting"""
    
    print(f"DEBUG: stream_chat function called with message: {payload.message[:50]}...")
    logger.info(f"Chat request from {payload.username}: {payload.message[:50]}...")
    
    # Get Dify client from app state (preferred)
    dify_client: AsyncDifyClient = getattr(req.app.state, 'dify_client', None)
    if dify_client is None:
        # Fallback: create a temporary client
        load_dotenv()
        api_key = os.getenv("DIFY_API_KEY")
        api_url = os.getenv("DIFY_API_URL", "http://dify.mindspringedu.com/v1")
        logger.warning("App-level Dify client missing; creating a temporary client")
        dify_client = AsyncDifyClient(api_key=api_key, api_url=api_url)
    
    # Ensure mapping storage exists
    if not hasattr(req.app.state, 'dify_conversations') or req.app.state.dify_conversations is None:
        req.app.state.dify_conversations = {}
    dify_conv_map = req.app.state.dify_conversations
    
    # Create a new database session for this request
    async with AsyncSessionLocal() as db:
        try:
            # Get or create user
            user = await get_or_create_user(db, payload.user_id, payload.username, payload.emoji)
            
            # Get or create conversation
            conversation = await get_or_create_conversation(db, payload.conversation_id, payload.user_id)
            
            # Save user message to database
            user_message = Message(
                message_id=str(uuid.uuid4()),
                content=payload.message,
                message_type='user',
                user_id=payload.user_id,
                conversation_id=conversation.conversation_id
            )
            db.add(user_message)
            await db.commit()
            
            # Broadcast user message to all connected clients
            await broadcast_manager.broadcast({
                'type': 'user_message',
                'content': payload.message,
                'from_user': payload.username or user.username,
                'from_user_id': payload.user_id,
                'emoji': payload.emoji,
                'timestamp': int(time.time() * 1000)
            })
            
            # Process Dify response and broadcast in real-time
            ai_response_content = ""
            # Use mapped Dify conversation id if known; scope per user+conversation
            map_key = f"{payload.user_id}:{conversation.conversation_id}"
            mapped_dify_conv_id = dify_conv_map.get(map_key)
            async for chunk in dify_client.stream_chat(
                payload.message,
                payload.user_id,
                mapped_dify_conv_id
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
                            'from_user': payload.username or user.username,
                            'from_user_id': payload.user_id,
                            'timestamp': int(time.time() * 1000)
                        })
                    
                    # Capture Dify conversation id if present in chunk
                    incoming_conv_id = chunk.get('conversation_id')
                    if incoming_conv_id and not mapped_dify_conv_id:
                        dify_conv_map[map_key] = incoming_conv_id
                        mapped_dify_conv_id = incoming_conv_id
                
                elif chunk.get('event') == 'message_end':
                    # Save complete AI response to database
                    if ai_response_content:
                        ai_message = Message(
                            message_id=str(uuid.uuid4()),
                            content=ai_response_content,
                            message_type='ai',
                            user_id=payload.user_id,
                            conversation_id=conversation.conversation_id
                        )
                        db.add(ai_message)
                        await db.commit()
                    
                    # Ensure Dify conversation id is captured at end as well
                    incoming_conv_id = chunk.get('conversation_id')
                    if incoming_conv_id:
                        dify_conv_map[map_key] = incoming_conv_id
                    
                    # Broadcast message end
                    await broadcast_manager.broadcast({
                        'type': 'ai_message_end',
                        'conversation_id': conversation.conversation_id,
                        'from_user': payload.username or user.username,
                        'from_user_id': payload.user_id,
                        'timestamp': int(time.time() * 1000)
                    })
                    break
                
                elif chunk.get('event') == 'error':
                    logger.error(f"Dify API error: {chunk.get('error')}")
                    await broadcast_manager.broadcast({
                        'type': 'error',
                        'error': chunk.get('error'),
                        'from_user': payload.username or user.username,
                        'from_user_id': payload.user_id,
                        'timestamp': int(time.time() * 1000)
                    })
                    # Clear any bad mapping to avoid reusing invalid id next time
                    if map_key in dify_conv_map:
                        del dify_conv_map[map_key]
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
    before_ms: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get chat history with simple keyset pagination.
    - Order by created_at DESC on server, then reverse for chronological display.
    - Use before_ms (epoch ms) to page older messages.
    """
    try:
        from sqlalchemy import select, desc
        from datetime import datetime, timezone

        limit = max(1, min(limit, 100))

        query = select(Message)
        
        if before_ms:
            before_dt = datetime.fromtimestamp(before_ms / 1000.0, tz=timezone.utc)
            query = query.where(Message.created_at < before_dt)

        if user_id:
            query = query.where(Message.user_id == user_id)

        query = query.order_by(desc(Message.created_at)).limit(limit)

        result = await db.execute(query)
        messages = result.scalars().all()

        messages_chrono = list(reversed(messages))

        next_before_ms = None
        if len(messages) == limit:
            oldest = messages_chrono[0]
            if oldest and oldest.created_at:
                next_before_ms = int(oldest.created_at.timestamp() * 1000)

        return {
            "status": "success",
            "messages": [msg.to_dict() for msg in messages_chrono],
            "count": len(messages),
            "next_before_ms": next_before_ms
        }

    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get chat history")

@router.post("/group")
async def send_group_message(
    payload: ChatRequest
):
    """Broadcast a group chat message without triggering Dify."""
    load_dotenv()
    async with AsyncSessionLocal() as db:
        try:
            # Ensure user exists/updated
            user = await get_or_create_user(db, payload.user_id, payload.username, payload.emoji or "😀")

            # Persist message with a fixed group conversation id
            group_conversation_id = "group"
            message = Message(
                message_id=str(uuid.uuid4()),
                content=payload.message,
                message_type='user',
                user_id=payload.user_id,
                conversation_id=group_conversation_id
            )
            db.add(message)
            await db.commit()

            # Broadcast to all listeners
            await broadcast_manager.broadcast({
                'type': 'user_message',
                'content': payload.message,
                'from_user': payload.username or user.username,
                'from_user_id': payload.user_id,
                'emoji': payload.emoji or user.emoji,
                'timestamp': int(time.time() * 1000)
            })

            return {
                'status': 'success',
                'message': 'Group message broadcasted'
            }
        except Exception as e:
            logger.error(f"Group message error: {e}")
            raise HTTPException(status_code=500, detail="Failed to send group message")

@router.get("/config", response_model=ChatConfigResponse)
async def get_chat_config():
    """Return frontend configuration such as WEB_URL for sharing"""
    try:
        load_dotenv()
        web_url = os.getenv("WEB_URL", "http://localhost:9530")
        ai_name = os.getenv("AI_NAME", "MindMate")
        ai_placeholder = os.getenv("AI_PLACEHOLDER", "Ask MindMate AI anything...")
        return ChatConfigResponse(web_url=web_url, ai_name=ai_name, ai_placeholder=ai_placeholder)
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
                    
        except asyncio.CancelledError:
            # Connection cancelled during shutdown; suppress stacktrace
            pass
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
