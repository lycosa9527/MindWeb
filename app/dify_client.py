"""
Async Dify API Client for FastAPI MindWeb Application
Based on Dify documentation and best practices
"""

import httpx
import json
import time
import asyncio
from typing import AsyncGenerator, Dict, Any, Optional
from app.utils.logger import setup_logger

logger = setup_logger("DifyClient")

class AsyncDifyClient:
    """Async client for interacting with Dify API"""
    
    def __init__(self, api_key: str, api_url: str):
        self.api_key = api_key
        self.api_url = api_url
        self.client = None
        self.active_requests = {}
        
    async def stream_chat(
        self, 
        message: str, 
        user_id: str, 
        conversation_id: str = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream chat response from Dify API following official documentation"""
        
        logger.info(f"Sending message to Dify: {message[:50]}... for user {user_id}")
        
        payload = {
            "inputs": {},
            "query": message,
            "response_mode": "streaming",
            "user": user_id
        }
        
        if conversation_id:
            payload["conversation_id"] = conversation_id
            
        # Debug: Log the exact payload being sent
        logger.info(f"DEBUG: Payload being sent to Dify: {json.dumps(payload, indent=2)}")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            # Create a new client for each request to avoid issues. Use open-ended read timeout for SSE.
            timeout = httpx.Timeout(connect=10.0, read=None, write=10.0, pool=None)
            async with httpx.AsyncClient(timeout=timeout) as client:
                logger.info(f"Making request to: {self.api_url}/chat-messages")
                logger.info(f"Request headers: {headers}")
                logger.info(f"Request payload: {payload}")

                async with client.stream(
                    'POST',
                    f"{self.api_url}/chat-messages",
                    json=payload,
                    headers=headers
                ) as response:
                    logger.info(f"Response status: {response.status_code}")
                    logger.info(f"Response headers: {dict(response.headers)}")

                    # Check status before consuming the stream
                    if response.status_code != 200:
                        logger.error(f"Dify API HTTP error: {response.status_code}")

                        # Try to read the error response
                        try:
                            error_text = await response.aread()
                            error_data = json.loads(error_text.decode())
                            error_msg = error_data.get('message', f"HTTP {response.status_code}: API request failed")
                            logger.error(f"Dify API error details: {error_msg}")
                        except Exception:
                            error_msg = f"HTTP {response.status_code}: API request failed"

                        yield {
                            'event': 'error',
                            'error': error_msg,
                            'timestamp': int(time.time() * 1000)
                        }
                        return

                    async for line in response.aiter_lines():
                        try:
                            # Handle empty lines (SSE standard allows empty lines)
                            if not line.strip():
                                continue

                            # Parse SSE format according to official Dify documentation
                            if line.startswith('data: '):
                                data_content = line[6:]  # Remove 'data: ' prefix
                            elif line.startswith('data:'):
                                data_content = line[5:]  # Remove 'data:' prefix
                            else:
                                # Skip non-data lines (like 'event:', 'id:', etc.)
                                continue

                            if data_content.strip():
                                # Handle [DONE] signal
                                if data_content.strip() == '[DONE]':
                                    logger.info("Received [DONE] signal from Dify")
                                    break

                                chunk_data = json.loads(data_content.strip())

                                # Add timestamp for tracking
                                chunk_data['timestamp'] = int(time.time() * 1000)

                                logger.debug(f"Received chunk: {chunk_data.get('event', 'unknown')}")
                                yield chunk_data

                        except json.JSONDecodeError as e:
                            # Skip malformed JSON lines
                            logger.debug(f"Skipping malformed JSON line: {line[:100]}... Error: {e}")
                            continue
                        except Exception as e:
                            logger.error(f"Error processing line: {e}")
                            continue
                        
        except httpx.HTTPStatusError as e:
            logger.error(f"Dify API HTTP error: {e.response.status_code}")
            yield {
                'event': 'error',
                'error': f"HTTP {e.response.status_code}: API request failed",
                'timestamp': int(time.time() * 1000)
            }
        except Exception as e:
            logger.error(f"Dify API error: {e}")
            yield {
                'event': 'error',
                'error': str(e),
                'timestamp': int(time.time() * 1000)
            }
    
    async def close(self):
        """Close the HTTP client"""
        try:
            if self.client:
                await self.client.aclose()
        finally:
            logger.info("Dify client closed")
