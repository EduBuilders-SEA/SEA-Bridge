"""Base class for SQLAlchemy models."""
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import Column, DateTime, Integer
from sqlalchemy.ext.declarative import as_declarative, declared_attr
from sqlalchemy.sql import func

@as_declarative()
class Base:
    """Base class for all database models."""
    
    id: Any
    __name__: str
    
    # Generate __tablename__ automatically
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower()
    
    # Common columns
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model instance to dictionary."""
        return {
            c.name: getattr(self, c.name) 
            if not isinstance(getattr(self, c.name), datetime) 
            else getattr(self, c.name).isoformat()
            for c in self.__table__.columns
        }
