"""Custom middleware for the FastAPI application."""
import time
import uuid
from typing import Callable, Awaitable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from .logging import logger

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging HTTP requests and responses."""
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Generate a unique request ID for this request
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Log request
        start_time = time.time()
        
        # Log request details
        logger.info(
            "Request started",
            request_id=request_id,
            method=request.method,
            url=str(request.url),
            client_host=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        
        # Process the request
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Log response
            logger.info(
                "Request completed",
                request_id=request_id,
                method=request.method,
                url=str(request.url),
                status_code=response.status_code,
                process_time=f"{process_time:.4f}s",
            )
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.4f}"
            
            return response
            
        except Exception as exc:
            process_time = time.time() - start_time
            logger.exception(
                "Request failed",
                request_id=request_id,
                method=request.method,
                url=str(request.url),
                process_time=f"{process_time:.4f}s",
                error=str(exc),
            )
            raise


class TimeoutMiddleware(BaseHTTPMiddleware):
    """Middleware for setting a timeout on requests."""
    
    def __init__(self, app: ASGIApp, timeout: int = 30):
        super().__init__(app)
        self.timeout = timeout
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        import asyncio
        
        try:
            # Set a timeout for the request
            return await asyncio.wait_for(
                call_next(request),
                timeout=self.timeout
            )
        except asyncio.TimeoutError:
            logger.warning(
                "Request timed out",
                request_id=getattr(request.state, "request_id", "unknown"),
                method=request.method,
                url=str(request.url),
                timeout=self.timeout,
            )
            from fastapi import HTTPException
            raise HTTPException(
                status_code=504,
                detail=f"Request timed out after {self.timeout} seconds"
            )


class CORSMiddleware(BaseHTTPMiddleware):
    """Custom CORS middleware with support for credentials and allowed methods."""
    
    def __init__(
        self,
        app: ASGIApp,
        allow_origins: list[str] = None,
        allow_methods: list[str] = None,
        allow_headers: list[str] = None,
        allow_credentials: bool = True,
        max_age: int = 600,
    ):
        super().__init__(app)
        self.allow_origins = allow_origins or ["*"]
        self.allow_methods = allow_methods or ["*"]
        self.allow_headers = allow_headers or ["*"]
        self.allow_credentials = allow_credentials
        self.max_age = max_age
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Handle preflight requests
        if request.method == "OPTIONS":
            response = Response(
                content="OK",
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": ", ".join(self.allow_origins),
                    "Access-Control-Allow-Methods": ", ".join(self.allow_methods),
                    "Access-Control-Allow-Headers": ", ".join(self.allow_headers),
                    "Access-Control-Allow-Credentials": "true" if self.allow_credentials else "false",
                    "Access-Control-Max-Age": str(self.max_age),
                }
            )
            return response
        
        # Process the request
        response = await call_next(request)
        
        # Add CORS headers to the response
        origin = request.headers.get("origin")
        if origin and (origin in self.allow_origins or "*" in self.allow_origins):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true" if self.allow_credentials else "false"
        
        return response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware for adding a unique request ID to each request."""
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Generate a unique request ID if not already present
        if not hasattr(request.state, "request_id"):
            request.state.request_id = str(uuid.uuid4())
        
        # Process the request
        response = await call_next(request)
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request.state.request_id
        
        return response
