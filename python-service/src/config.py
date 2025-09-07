import os
from typing import Optional, Dict, Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, validator, PostgresDsn
from functools import lru_cache

class Settings(BaseSettings):
    # Application settings
    APP_NAME: str = "sea-bridge-document-service"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # AWS Configuration
    AWS_REGION: str = "ap-southeast-2"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    
    # S3 Configuration
    S3_BUCKET_NAME: str
    S3_UPLOAD_FOLDER: str = "uploads"
    S3_RESULT_FOLDER: str = "results"
    S3_PRESIGNED_URL_EXPIRATION: int = 3600  # 1 hour
    
    # SQS Configuration
    SQS_QUEUE_URL: str
    SQS_QUEUE_NAME: str
    SQS_MAX_RETRIES: int = 3
    
    # DynamoDB Configuration
    DYNAMODB_TABLE_NAME: str = "DocumentJobs"
    DYNAMODB_ENDPOINT_URL: Optional[str] = None
    
    # Redis/ElastiCache Configuration
    REDIS_HOST: str
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_TTL: int = 30 * 24 * 3600  # 30 days in seconds
    
    # AWS Services
    TEXTRACT_SERVICE_NAME: str = "textract"
    TRANSLATE_SERVICE_NAME: str = "translate"
    
    # Translation Settings for Southeast Asia
    DEFAULT_SOURCE_LANGUAGE: str = "auto"
    # Southeast Asian languages (ISO 639-1 codes)
    SUPPORTED_LANGUAGES: list = [
        "en",     # English (common language)
        "vi",     # Vietnamese
        "th",     # Thai
        "id",     # Indonesian
        "ms",     # Malay (also used in Singapore, Brunei)
        "tl",     # Filipino (Tagalog)
        "my",     # Burmese
        "km",     # Khmer (Cambodian)
        "lo",     # Lao
        "zh",     # Chinese (for Singapore/Malaysia)
    ]
    
    # File Processing
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: list = ["pdf", "docx", "doc", "txt"]
    
    # API Settings
    API_PREFIX: str = "/api/v1"
    API_TITLE: str = "SEA Bridge Document Service"
    API_DESCRIPTION: str = "Document processing and translation service for SEA Bridge"
    API_VERSION: str = "1.0.0"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    CORS_ORIGINS: list = ["*"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Model configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )
    
    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"
    
    @property
    def is_testing(self) -> bool:
        return self.ENVIRONMENT == "testing"

# Create settings instance
settings = Settings()

# For dependency injection
@lru_cache()
def get_settings() -> Settings:
    return Settings()