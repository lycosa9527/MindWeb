"""
Broadcast Manager for FastAPI MindWeb Application
Handles real-time streaming to all connected users via SSE only
"""

import asyncio
import json
import time
from typing import Dict, Any, Set
from app.utils.logger import setup_logger

logger = setup_logger("BroadcastManager")

class BroadcastManager:
    """Manages real-time broadcasting to connected SSE clients"""
    
    def __init__(self):
        self.sse_listeners: Set[asyncio.Queue] = set()
        self.event_history = []
        self.max_history = 50
        
    def add_listener(self, queue: asyncio.Queue):
        """Add SSE listener queue"""
        self.sse_listeners.add(queue)
        logger.debug(f"SSE listener added. Total listeners: {len(self.sse_listeners)}")
    
    def remove_listener(self, queue: asyncio.Queue):
        """Remove SSE listener queue"""
        self.sse_listeners.discard(queue)
        logger.debug(f"SSE listener removed. Total listeners: {len(self.sse_listeners)}")
    
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected SSE clients"""
        # Add timestamp and event ID
        message['timestamp'] = int(time.time() * 1000)
        message['event_id'] = len(self.event_history) + 1
        
        # Add to history
        self.event_history.append(message)
        if len(self.event_history) > self.max_history:
            self.event_history.pop(0)
        
        logger.debug(f"Broadcasting to {len(self.sse_listeners)} SSE clients: {message.get('type', 'unknown')}")
        
        # Send to SSE listeners
        if self.sse_listeners:
            disconnected_sse = set()
            for queue in self.sse_listeners:
                try:
                    if queue.full():
                        try:
                            _ = queue.get_nowait()
                        except asyncio.QueueEmpty:
                            pass
                    queue.put_nowait(message)
                except asyncio.QueueFull:
                    logger.debug("SSE queue full, dropping oldest message for this listener")
                except Exception as e:
                    logger.debug(f"Failed to send to SSE listener: {e}")
                    disconnected_sse.add(queue)
            
            # Remove disconnected SSE listeners
            self.sse_listeners -= disconnected_sse
    
    def get_recent_history(self, limit: int = 10):
        """Get recent event history for new SSE clients"""
        return self.event_history[-limit:] if self.event_history else []

# Global broadcast manager instance
broadcast_manager = BroadcastManager()
