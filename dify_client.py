"""
Dify API Client for MindWeb Flask Application
Author: lycosa9527 - Made by MindSpring Team
"""

import requests
import json
import time
import threading
import uuid
from typing import Generator, Dict, Any, Optional
from config import Config
from logging_config import get_logger

class RequestManager:
    """Manages concurrent Dify API requests"""
    
    def __init__(self):
        self.active_requests = {}
        self.request_lock = threading.Lock()
    
    def create_request(self, user_id: str, conversation_id: str = None) -> str:
        """Create a new request and return request ID"""
        logger = get_logger('dify.requests')
        request_id = str(uuid.uuid4())
        with self.request_lock:
            self.active_requests[request_id] = {
                'user_id': user_id,
                'conversation_id': conversation_id,
                'start_time': time.time(),
                'status': 'active'
            }
        logger.debug(f"Created request {request_id} for user {user_id}")
        return request_id
    
    def complete_request(self, request_id: str):
        """Mark request as completed"""
        with self.request_lock:
            if request_id in self.active_requests:
                self.active_requests[request_id]['status'] = 'completed'
                self.active_requests[request_id]['end_time'] = time.time()
    
    def get_active_requests(self) -> Dict[str, Dict]:
        """Get all active requests"""
        with self.request_lock:
            return {k: v for k, v in self.active_requests.items() if v['status'] == 'active'}
    
    def cleanup_old_requests(self, max_age: int = 300):
        """Remove requests older than max_age seconds"""
        current_time = time.time()
        with self.request_lock:
            to_remove = []
            for request_id, request_data in self.active_requests.items():
                if current_time - request_data['start_time'] > max_age:
                    to_remove.append(request_id)
            
            for request_id in to_remove:
                del self.active_requests[request_id]

class DifyClient:
    """Client for interacting with Dify API"""
    
    def __init__(self, api_key: str, api_url: str, timeout: int = 30):
        """
        Initialize Dify client
        
        Args:
            api_key: Dify API key
            api_url: Dify API base URL
            timeout: Request timeout in seconds
        """
        self.api_key = api_key
        self.api_url = api_url.rstrip('/')
        self.timeout = timeout
        self.request_manager = RequestManager()
        # Use a session pool for better concurrent handling
        self.session_pool = []
        self.session_lock = threading.Lock()
        self._initialize_session_pool()
    
    def _initialize_session_pool(self, pool_size: int = 10):
        """Initialize a pool of sessions for concurrent requests"""
        for _ in range(pool_size):
            session = requests.Session()
            session.headers.update({
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json',
                'User-Agent': 'MindWeb/1.0'
            })
            self.session_pool.append(session)
    
    def _get_session(self):
        """Get an available session from the pool"""
        with self.session_lock:
            if self.session_pool:
                return self.session_pool.pop()
            else:
                # Create new session if pool is empty
                session = requests.Session()
                session.headers.update({
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json',
                    'User-Agent': 'MindWeb/1.0'
                })
                return session
    
    def _return_session(self, session):
        """Return session to the pool"""
        with self.session_lock:
            if len(self.session_pool) < 20:  # Limit pool size
                self.session_pool.append(session)
    
    def send_message(self, message: str, user_id: str = None, 
                    conversation_id: str = None, stream: bool = True) -> Generator[Dict[str, Any], None, None]:
        """
        Send message to Dify API with streaming support and concurrent handling
        
        Args:
            message: User message to send
            user_id: Unique user identifier
            conversation_id: Conversation ID for context
            stream: Whether to stream the response
            
        Yields:
            Dict containing response data chunks
        """
        logger = get_logger('dify.client')
        
        if not user_id:
            user_id = f"user_{int(time.time())}"
        
        logger.info(f"Sending message to Dify API for user {user_id} - Message length: {len(message)}")
        
        # Create request tracking
        request_id = self.request_manager.create_request(user_id, conversation_id)
        
        # Get session from pool
        session = self._get_session()
        
        try:
            payload = {
                "inputs": {},
                "query": message,
                "response_mode": "streaming" if stream else "blocking",
                "user": user_id
            }
            
            if conversation_id:
                payload["conversation_id"] = conversation_id
            
            # Use chat endpoint for streaming
            endpoint = f"{self.api_url}/chat-messages"
            
            response = session.post(
                endpoint,
                json=payload,
                stream=stream,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            
            # Yield request info for tracking
            yield {
                "request_id": request_id,
                "user_id": user_id,
                "conversation_id": conversation_id,
                "event": "request_started"
            }
            
            if stream:
                for line in response.iter_lines(decode_unicode=True):
                    if line:
                        try:
                            # Parse SSE format
                            if line.startswith('data: '):
                                data = line[6:]  # Remove 'data: ' prefix
                                if data.strip() == '[DONE]':
                                    break
                                
                                chunk_data = json.loads(data)
                                # Add request tracking info
                                chunk_data['request_id'] = request_id
                                yield chunk_data
                        except json.JSONDecodeError:
                            continue
                        except Exception as e:
                            yield {
                                "error": f"Error parsing response: {str(e)}",
                                "event": "error",
                                "request_id": request_id
                            }
            else:
                # Non-streaming response
                data = response.json()
                data['request_id'] = request_id
                yield data
                
        except requests.exceptions.Timeout:
            logger.error(f"Request timeout for user {user_id} (request {request_id})")
            yield {
                "error": "Request timeout - Dify API took too long to respond",
                "event": "error",
                "request_id": request_id
            }
        except requests.exceptions.ConnectionError:
            logger.error(f"Connection error for user {user_id} (request {request_id})")
            yield {
                "error": "Connection error - Unable to reach Dify API",
                "event": "error",
                "request_id": request_id
            }
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error {e.response.status_code} for user {user_id} (request {request_id}): {e.response.text}")
            yield {
                "error": f"HTTP error {e.response.status_code}: {e.response.text}",
                "event": "error",
                "request_id": request_id
            }
        except Exception as e:
            logger.error(f"Unexpected error for user {user_id} (request {request_id}): {str(e)}")
            yield {
                "error": f"Unexpected error: {str(e)}",
                "event": "error",
                "request_id": request_id
            }
        finally:
            # Return session to pool and mark request as completed
            self._return_session(session)
            self.request_manager.complete_request(request_id)
            logger.debug(f"Request {request_id} completed for user {user_id}")
    
    def get_conversations(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user's conversation history
        
        Args:
            user_id: User identifier
            
        Returns:
            Dict containing conversation data or None if error
        """
        try:
            endpoint = f"{self.api_url}/conversations"
            params = {"user": user_id}
            
            response = self.session.get(
                endpoint,
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            print(f"Error fetching conversations: {str(e)}")
            return None
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """
        Delete a conversation
        
        Args:
            conversation_id: ID of conversation to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            endpoint = f"{self.api_url}/conversations/{conversation_id}"
            
            response = self.session.delete(
                endpoint,
                timeout=self.timeout
            )
            response.raise_for_status()
            return True
            
        except Exception as e:
            print(f"Error deleting conversation: {str(e)}")
            return False
    
    def get_active_requests(self) -> Dict[str, Dict]:
        """Get all currently active requests"""
        return self.request_manager.get_active_requests()
    
    def get_request_stats(self) -> Dict[str, Any]:
        """Get request statistics"""
        active_requests = self.request_manager.get_active_requests()
        return {
            "active_requests": len(active_requests),
            "session_pool_size": len(self.session_pool),
            "max_pool_size": 20,
            "requests": active_requests
        }
    
    def cleanup_old_requests(self):
        """Clean up old completed requests"""
        self.request_manager.cleanup_old_requests()

# Global client instance
dify_client = None

def get_dify_client() -> DifyClient:
    """Get or create Dify client instance"""
    global dify_client
    
    if dify_client is None:
        Config.validate_config()
        dify_client = DifyClient(
            api_key=Config.DIFY_API_KEY,
            api_url=Config.DIFY_API_URL,
            timeout=Config.DIFY_TIMEOUT
        )
    
    return dify_client
