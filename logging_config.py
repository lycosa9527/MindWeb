"""
Logging Configuration for MindWeb Flask Application
Author: lycosa9527 - Made by MindSpring Team
"""

import logging
import logging.handlers
import os
from datetime import datetime
from pathlib import Path

class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for console output"""
    
    # Color codes
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m',   # Magenta
        'RESET': '\033[0m'        # Reset
    }
    
    def format(self, record):
        # Add color to the level name
        if record.levelname in self.COLORS:
            record.levelname = f"{self.COLORS[record.levelname]}{record.levelname}{self.COLORS['RESET']}"
        
        return super().format(record)

def setup_logging(app_name="MindWeb", log_level=logging.INFO):
    """
    Setup comprehensive logging system
    
    Args:
        app_name: Name of the application
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Create logger
    logger = logging.getLogger(app_name)
    logger.setLevel(log_level)
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Console handler with colors
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_formatter = ColoredFormatter(
        '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
        datefmt='%H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # Add filter to remove IP addresses from console logs
    class NoIPFilter(logging.Filter):
        def filter(self, record):
            # Remove IP addresses from log messages
            if hasattr(record, 'getMessage'):
                message = record.getMessage()
                import re
                # Remove IP addresses (IPv4 and IPv6)
                message = re.sub(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b', '[IP]', message)
                message = re.sub(r'\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b', '[IPv6]', message)
                record.msg = message
            return True
    
    console_handler.addFilter(NoIPFilter())
    
    # File handler for all logs
    file_handler = logging.handlers.RotatingFileHandler(
        log_dir / "mindweb.log",
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    file_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)
    
    # Error file handler
    error_handler = logging.handlers.RotatingFileHandler(
        log_dir / "errors.log",
        maxBytes=5*1024*1024,  # 5MB
        backupCount=3
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(file_formatter)
    logger.addHandler(error_handler)
    
    # Request handler for HTTP requests
    request_handler = logging.handlers.RotatingFileHandler(
        log_dir / "requests.log",
        maxBytes=5*1024*1024,  # 5MB
        backupCount=3
    )
    request_handler.setLevel(logging.INFO)
    request_formatter = logging.Formatter(
        '%(asctime)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    request_handler.setFormatter(request_formatter)
    
    # Create request logger
    request_logger = logging.getLogger(f"{app_name}.requests")
    request_logger.addHandler(request_handler)
    request_logger.setLevel(logging.INFO)
    request_logger.propagate = False
    
    return logger

def get_logger(name=None):
    """Get a logger instance"""
    if name:
        return logging.getLogger(f"MindWeb.{name}")
    return logging.getLogger("MindWeb")

# Log levels for easy reference
LOG_LEVELS = {
    'DEBUG': logging.DEBUG,
    'INFO': logging.INFO,
    'WARNING': logging.WARNING,
    'ERROR': logging.ERROR,
    'CRITICAL': logging.CRITICAL
}
