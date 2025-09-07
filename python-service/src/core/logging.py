"""Logging configuration for the application."""
import logging
import sys
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from loguru import logger

class InterceptHandler(logging.Handler):
    """Intercept standard logging messages toward our Loguru sinks."""
    def emit(self, record):
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where the logged message originated
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )

def serialize(record: Dict) -> str:
    """Serialize log record to JSON string."""
    subset = {
        "timestamp": record["time"].isoformat(),
        "level": record["level"].name,
        "message": record["message"],
        "logger": record["name"],
        "module": record["module"],
        "function": record["function"],
        "line": record["line"],
    }
    
    # Add exception info if present
    if record["exception"] is not None:
        subset["exception"] = {
            "type": record["exception"]["type"],
            "value": record["exception"]["value"],
            "traceback": record["exception"]["traceback"].strip(),
        }
    
    # Add any extra attributes
    for key, value in record["extra"].items():
        if key not in subset:
            subset[key] = value
    
    return json.dumps(subset, ensure_ascii=False)

def configure_logging(
    level: str = "INFO",
    json_format: bool = False,
    **kwargs
) -> None:
    """Configure logging for the application.
    
    Args:
        level: Logging level (e.g., "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL")
        json_format: Whether to format logs as JSON
        **kwargs: Additional keyword arguments for logger configuration
    """
    # Remove all existing loggers
    logger.remove()
    
    # Configure log format
    if json_format:
        log_format = serialize
    else:
        log_format = (
            "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
            "<level>{message}</level>"
        )
    
    # Add console handler
    logger.add(
        sys.stderr,
        level=level.upper(),
        format=log_format,
        serialize=json_format,
        backtrace=True,
        diagnose=False,  # Set to True in development, False in production
        **kwargs
    )
    
    # Configure standard logging to use Loguru
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    
    # Set log levels for specific loggers
    logging.getLogger("uvicorn").handlers = [InterceptHandler()]
    logging.getLogger("uvicorn.access").handlers = [InterceptHandler()]
    logging.getLogger("uvicorn.error").handlers = [InterceptHandler()]
    
    # Set log levels for third-party libraries
    for logger_name in ["uvicorn", "uvicorn.error", "fastapi"]:
        logging_logger = logging.getLogger(logger_name)
        logging_logger.handlers = [InterceptHandler()]
        logging_logger.propagate = False
    
    # Disable noisy loggers
    for logger_name in ["boto3", "botocore", "urllib3"]:
        logging.getLogger(logger_name).setLevel(logging.WARNING)
    
    logger.info(f"Logging configured with level={level}, json_format={json_format}")

# Configure default logging when module is imported
configure_logging()
