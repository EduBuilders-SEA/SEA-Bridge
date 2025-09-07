""
Initialize the database with sample data.

This script creates the database tables and populates them with initial data.
"""
import logging
import sys
from pathlib import Path

# Add the src directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session

from src.core.config import settings
from src.db.base_class import Base
from src.db.session import engine, SessionLocal
from src.models.user import User
from src.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db(db: Session) -> None:
    """Initialize the database with sample data."""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create admin user if it doesn't exist
    admin = db.query(User).filter(User.email == settings.FIRST_SUPERUSER_EMAIL).first()
    if not admin:
        admin = User(
            email=settings.FIRST_SUPERUSER_EMAIL,
            hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
            full_name="Admin User",
            is_active=True,
            is_superuser=True,
        )
        db.add(admin)
        
        # Create a regular user
        user = User(
            email="user@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Regular User",
            is_active=True,
            is_superuser=False,
        )
        db.add(user)
        
        db.commit()
        logger.info("Created admin and regular user")
    
    logger.info("Database initialization complete")

def main() -> None:
    """Main function to initialize the database."""
    logger.info("Initializing database...")
    db = SessionLocal()
    try:
        init_db(db)
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise
    finally:
        db.close()
    logger.info("Database initialization complete")

if __name__ == "__main__":
    main()
