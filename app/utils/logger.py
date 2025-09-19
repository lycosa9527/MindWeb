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
        handler.setFormatter(_build_formatter())
        # Optional shutdown noise suppression
        if _suppress_shutdown_noise():
            handler.addFilter(SuppressShutdownFilter())
        root_logger.addHandler(handler)
    else:
        # Update levels and format on existing handlers
        for h in root_logger.handlers:
            h.setLevel(level)
            h.setFormatter(_build_formatter())
            if _suppress_shutdown_noise():
                _ensure_filter(h, SuppressShutdownFilter)
    
    # Quiet noisy third-party loggers unless DEBUG
    noisy = ['uvicorn', 'uvicorn.error', 'uvicorn.access', 'httpx', 'sqlalchemy.engine', 'sqlalchemy', 'aiosqlite']
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


# ---------- Colorized formatter ----------

class ColorFormatter(logging.Formatter):
    COLORS = {
        'DEBUG': '\u001b[38;5;245m',      # grey
        'INFO': '\u001b[38;5;39m',        # blue
        'WARNING': '\u001b[38;5;214m',    # orange
        'ERROR': '\u001b[38;5;196m',      # red
        'CRITICAL': '\u001b[48;5;196m\u001b[38;5;231m',  # white on red
        'RESET': '\u001b[0m',
    }

    def format(self, record: logging.LogRecord) -> str:
        use_color = (os.getenv('LOG_COLOR', 'true').lower() != 'false')
        if use_color:
            levelname = record.levelname
            color = self.COLORS.get(levelname, '')
            reset = self.COLORS['RESET'] if color else ''
            record.levelname = f"{color}{levelname}{reset}"
        return super().format(record)


def _build_formatter() -> logging.Formatter:
    if os.getenv('LOG_COLOR', 'true').lower() == 'false':
        return logging.Formatter(_FORMAT, datefmt=_DATEFMT)
    return ColorFormatter(_FORMAT, datefmt=_DATEFMT)


# ---------- Uvicorn logging config ----------

def get_uvicorn_log_config() -> dict:
    level = _get_env_log_level()
    formatter = _FORMAT
    datefmt = _DATEFMT
    # Build a dictconfig compatible structure
    return {
        'version': 1,
        'disable_existing_loggers': False,
        'filters': {
            'suppress_shutdown': {
                '()': f"{__name__}.SuppressShutdownFilter",
            }
        },
        'formatters': {
            'default': {
                '()': f"{__name__}.ColorFormatter",
                'fmt': formatter,
                'datefmt': datefmt,
            },
        },
        'handlers': {
            'default': {
                'class': 'logging.StreamHandler',
                'formatter': 'default',
                'stream': 'ext://sys.stdout',
                'level': level,
                'filters': ['suppress_shutdown'] if _suppress_shutdown_noise() else [],
            },
        },
        'loggers': {
            'uvicorn': {'handlers': ['default'], 'level': level, 'propagate': False},
            'uvicorn.error': {'handlers': ['default'], 'level': level, 'propagate': False},
            'uvicorn.access': {'handlers': ['default'], 'level': logging.WARNING, 'propagate': False},
        },
        'root': {
            'handlers': ['default'],
            'level': level,
        },
    }


def _suppress_shutdown_noise() -> bool:
    return (os.getenv('LOG_SUPPRESS_SHUTDOWN', 'true').lower() != 'false')


def _ensure_filter(handler: logging.Handler, filter_cls: type[logging.Filter]) -> None:
    if not any(isinstance(f, filter_cls) for f in handler.filters):
        handler.addFilter(filter_cls())


class SuppressShutdownFilter(logging.Filter):
    """Filter out benign shutdown/cancellation noise from logs."""
    MESSAGES = (
        'Task cancelled, timeout graceful shutdown exceeded',
        'Waiting for connections to close. (CTRL+C to force quit)',
        'Cancel 1 running task(s), timeout graceful shutdown exceeded',
        'Waiting for application shutdown',
        'Application shutdown complete',
        'Finished server process',
        'Exception in ASGI application',
        'asyncio.exceptions.CancelledError',
    )

    def filter(self, record: logging.LogRecord) -> bool:
        msg = str(record.getMessage())
        if any(s in msg for s in self.MESSAGES):
            return False
        # Filter asyncio.CancelledError stacktraces
        if record.exc_info:
            exc_type = record.exc_info[0]
            if exc_type and issubclass(exc_type, Exception) and 'CancelledError' in exc_type.__name__:
                return False
        return True
