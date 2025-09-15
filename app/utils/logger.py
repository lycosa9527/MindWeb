"""
Logging configuration for FastAPI MindWeb Application
"""

import logging
import os
import sys
from datetime import datetime

_FORMAT = '%(asctime)s | %(levelname)-5s | %(name)-15s | %(message)s'
_DATEFMT = '%H:%M:%S'

_LEVELS = {
    'CRITICAL': logging.CRITICAL,
    'ERROR': logging.ERROR,
    'WARNING': logging.WARNING,
    'INFO': logging.INFO,
    'DEBUG': logging.DEBUG,
    'NOTSET': logging.NOTSET,
}

def _get_env_log_level() -> int:
    level_str = (os.getenv('LOG_LEVEL') or 'INFO').upper()
    return _LEVELS.get(level_str, logging.INFO)

def configure_logging() -> None:
    """Configure root logging once for the whole app based on env.
    Safe to call multiple times (idempotent)."""
    root_logger = logging.getLogger()
    level = _get_env_log_level()
    root_logger.setLevel(level)
    
    # If there are no handlers on root, add one
    if not root_logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        handler.setFormatter(logging.Formatter(_FORMAT, datefmt=_DATEFMT))
        root_logger.addHandler(handler)
    else:
        # Update levels and format on existing handlers
        for h in root_logger.handlers:
            h.setLevel(level)
            h.setFormatter(logging.Formatter(_FORMAT, datefmt=_DATEFMT))
    
    # Quiet noisy third-party loggers unless DEBUG
    noisy = ['uvicorn', 'uvicorn.error', 'uvicorn.access', 'httpx', 'sqlalchemy.engine']
    for name in noisy:
        logging.getLogger(name).setLevel(logging.WARNING if level > logging.DEBUG else level)

def setup_logger(name: str, level: int | None = None) -> logging.Logger:
    """Get a named logger using centralized configuration.
    If level is None, uses LOG_LEVEL from environment."""
    if level is None:
        level = _get_env_log_level()
    
    # Ensure root configured
    configure_logging()
    
    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.propagate = True  # Use root handlers
    return logger
