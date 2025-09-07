#!/usr/bin/env python3
"""
Run the FastAPI application with Uvicorn.

This script provides a convenient way to run the application with proper configuration.
"""
import os
import sys
import uvicorn
from pathlib import Path

# Add the src directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

def run_server():
    """Run the FastAPI application with Uvicorn."""
    # Configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("ENV", "development") == "development"
    log_level = os.getenv("LOG_LEVEL", "info")
    
    # Log configuration
    log_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": "uvicorn.logging.DefaultFormatter",
                "fmt": "%(levelprefix)s %(asctime)s - %(name)s - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stderr",
            },
        },
        "loggers": {
            "": {"handlers": ["default"], "level": log_level.upper()},
            "uvicorn": {"handlers": ["default"], "level": log_level.upper()},
            "uvicorn.error": {"handlers": ["default"], "level": log_level.upper()},
            "uvicorn.access": {
                "handlers": ["default"],
                "level": log_level.upper(),
                "propagate": False,
            },
        },
    }
    
    # Run the server
    uvicorn.run(
        "src.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level=log_level.lower(),
        log_config=log_config,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )

if __name__ == "__main__":
    run_server()
