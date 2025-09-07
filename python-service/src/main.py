import logging
from contextlib import asynccontextmanager
from typing import List, Optional

import sentry_sdk
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import HttpUrl, BaseModel, Field, validator
from pydantic_settings import BaseSettings

from .config import settings, get_settings
from .api.routes import api_router
from .core.logging import configure_logging
from .core.exceptions import HTTPException as AppHTTPException
from .core.middleware import RequestLoggingMiddleware, TimeoutMiddleware

# Configure logging
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize resources
    configure_logging(level=settings.LOG_LEVEL, json_format=settings.is_production)
    
    # Initialize Sentry for error tracking in production
    if settings.is_production and settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            traces_sample_rate=1.0,
            profiles_sample_rate=1.0,
        )
    
    logger.info("Starting application")
    
    yield  # Application runs here
    
    # Shutdown: Clean up resources
    logger.info("Shutting down application")

# Create FastAPI application
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url=f"{settings.API_PREFIX}/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(TimeoutMiddleware, timeout=30)  # 30 seconds timeout

# Include API routes
app.include_router(api_router, prefix=settings.API_PREFIX)

# Custom exception handler
@app.exception_handler(AppHTTPException)
async def http_exception_handler(request: Request, exc: AppHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": exc.error_code,
            "message": exc.message,
        },
    )

@app.exception_handler(HTTPException)
async def fastapi_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": "http_error",
            "message": str(exc.detail),
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception occurred")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal Server Error",
            "error_code": "internal_server_error",
            "message": "An unexpected error occurred. Please try again later.",
        },
    )

# Health check endpoint
@app.get("/health")
async def health_check(settings: BaseSettings = Depends(get_settings)):
    """Health check endpoint for the service."""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "version": settings.API_VERSION,
    }

# --- Định nghĩa các model dữ liệu cho request/response bằng Pydantic ---
class ProcessRequest(BaseModel):
    file_urls: List[HttpUrl]
    target_language: str

class ProcessResponse(BaseModel):
    job_id: str
    status: str
    message: str

# --- Định nghĩa các API endpoints ---
@app.post("/process-documents", response_model=ProcessResponse)
async def process_documents(request: ProcessRequest):
    """
    Endpoint chính để xử lý tài liệu.
    (Hiện tại chỉ là placeholder)
    """
    print(f"Received request for {len(request.file_urls)} files to translate to {request.target_language}")
    
    # TODO: Tích hợp logic đẩy vào SQS và trả về job_id thật.
    # Bây giờ, chúng ta sẽ trả về một response giả.
    return {
        "job_id": "fake-job-id-12345",
        "status": "QUEUED",
        "message": "Request received and queued for processing."
    }