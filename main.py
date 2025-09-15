#!/usr/bin/env python3
"""
MindWeb Chatroom - Single File Startup
FastAPI + Uvicorn Application with Dify AI Integration
"""

import uvicorn
import os
import sys
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

# Add the current directory to Python path so we can import from app/
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import init_db
from app.dify_client import AsyncDifyClient
from app.routes import chat, users
from app.utils.logger import setup_logger, configure_logging, get_uvicorn_log_config

# Initialize logger
logger = setup_logger("MindWeb")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    configure_logging()
    logger.info("Starting MindWeb FastAPI Application")
    
    # Initialize database
    await init_db()
    logger.info("Database initialized")
    
    # Initialize Dify client
    app.state.dify_client = AsyncDifyClient(
        api_key=os.getenv("DIFY_API_KEY"),
        api_url=os.getenv("DIFY_API_URL", "http://dify.mindspringedu.com/v1")
    )
    logger.info("Dify client initialized")
    # In-memory mapping: our conversation_id -> Dify conversation_id
    app.state.dify_conversations = {}
    
    yield
    
    # Shutdown
    if hasattr(app.state, 'dify_client'):
        await app.state.dify_client.close()
    logger.info("MindWeb application shutdown")

# Create FastAPI app
app = FastAPI(
    title="MindWeb Chatroom",
    description="Small, Robust, Professional Dify Chatroom",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Configure for production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(users.router, prefix="/api/users", tags=["users"])

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve the main chatroom HTML page"""
    try:
        with open("templates/chatroom.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="<h1>MindWeb Chatroom</h1><p>Chatroom template not found</p>")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "MindWeb FastAPI",
        "version": "2.0.0"
    }

def main():
    """Start the FastAPI application with Uvicorn"""
    
    # Display banner
    banner = f"""
================================================================================
    ███╗   ███╗██╗███╗   ██╗██████╗ ███╗   ███╗ █████╗ ████████╗███████╗
    ████╗ ████║██║████╗  ██║██╔══██╗████╗ ████║██╔══██╗╚══██╔══╝██╔════╝
    ██╔████╔██║██║██╔██╗ ██║██║  ██║██╔████╔██║███████║   ██║   █████╗  
    ██║╚██╔╝██║██║██║╚██╗██║██║  ██║██║╚██╔╝██║██╔══██║   ██║   ██╔══╝  
    ██║ ╚═╝ ██║██║██║ ╚████║██████╔╝██║ ╚═╝ ██║██║  ██║   ██║   ███████╗
    ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
================================================================================
"""
    print(banner)
    print("MindWeb Chatroom - FastAPI + Uvicorn")
    print("Server: http://localhost:9530")
    print("Framework: FastAPI + Uvicorn")
    print("Database: SQLite (Simple & Robust)")
    print("AI Integration: Dify API with Streaming")
    print("Press Ctrl+C to stop")
    print("-" * 80)
    
    # Configure logging format for Uvicorn
    import logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s | %(levelname)-5s | %(name)-15s | %(message)s',
        datefmt='%H:%M:%S'
    )
    
    # Start the application
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=9530,
        reload=False,  # Disable reload for better signal handling
        log_config=get_uvicorn_log_config(),
        log_level="info",
        access_log=False,  # access logs are noisy; app logs still show requests if needed
        loop="asyncio",
        timeout_keep_alive=5,
        timeout_graceful_shutdown=2  # Short grace period reduces noisy cancellations
    )

if __name__ == "__main__":
    main()
