"""Service layer for user operations."""
import logging
from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.exceptions import (
    BadRequestError,
    NotFoundError,
    UnauthorizedError,
)
from ..core.security import get_password_hash, verify_password
from ..models.user import (
    User,
    UserCreate,
    UserInDB,
    UserResponse,
    UserUpdate,
    UserUpdatePassword,
)

logger = logging.getLogger(__name__)

class UserService:
    """Service for user operations."""
    
    def get_user(self, db: Session, user_id: int) -> Optional[UserInDB]:
        """Get a user by ID."""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                return UserInDB.from_orm(user)
            return None
        except Exception as e:
            logger.error(f"Error retrieving user {user_id}: {str(e)}")
            raise
    
    def get_user_by_email(self, db: Session, email: str) -> Optional[UserInDB]:
        """Get a user by email."""
        try:
            user = db.query(User).filter(User.email == email).first()
            if user:
                return UserInDB.from_orm(user)
            return None
        except Exception as e:
            logger.error(f"Error retrieving user by email {email}: {str(e)}")
            raise
    
    def get_users(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[UserInDB]:
        """Get a list of users with pagination."""
        try:
            users = db.query(User).offset(skip).limit(limit).all()
            return [UserInDB.from_orm(user) for user in users]
        except Exception as e:
            logger.error(f"Error retrieving users: {str(e)}")
            raise
    
    def create_user(self, db: Session, user_in: UserCreate) -> UserInDB:
        """Create a new user."""
        try:
            # Check if user with this email already exists
            db_user = self.get_user_by_email(db, email=user_in.email)
            if db_user:
                raise BadRequestError(
                    message="Email already registered",
                    error_code="email_already_registered",
                )
            
            # Create new user
            hashed_password = get_password_hash(user_in.password)
            db_user = User(
                email=user_in.email,
                hashed_password=hashed_password,
                full_name=user_in.full_name,
                is_active=user_in.is_active,
                is_superuser=user_in.is_superuser,
            )
            
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
            return UserInDB.from_orm(db_user)
            
        except BadRequestError:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating user: {str(e)}")
            raise BadRequestError(
                message="Failed to create user",
                error_code="user_creation_failed",
            )
    
    def update_user(
        self, 
        db: Session, 
        user_id: int, 
        user_in: UserUpdate
    ) -> UserInDB:
        """Update a user's information."""
        try:
            db_user = db.query(User).filter(User.id == user_id).first()
            if not db_user:
                raise NotFoundError(
                    resource="User",
                    identifier=user_id,
                    error_code="user_not_found",
                )
            
            # Update user fields
            update_data = user_in.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_user, field, value)
            
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
            return UserInDB.from_orm(db_user)
            
        except NotFoundError:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating user {user_id}: {str(e)}")
            raise BadRequestError(
                message="Failed to update user",
                error_code="user_update_failed",
            )
    
    def update_password(
        self, 
        db: Session, 
        user_id: int, 
        new_password: str
    ) -> bool:
        """Update a user's password."""
        try:
            db_user = db.query(User).filter(User.id == user_id).first()
            if not db_user:
                raise NotFoundError(
                    resource="User",
                    identifier=user_id,
                    error_code="user_not_found",
                )
            
            # Update password
            hashed_password = get_password_hash(new_password)
            db_user.hashed_password = hashed_password
            
            db.add(db_user)
            db.commit()
            
            return True
            
        except NotFoundError:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating password for user {user_id}: {str(e)}")
            raise BadRequestError(
                message="Failed to update password",
                error_code="password_update_failed",
            )
    
    def delete_user(self, db: Session, user_id: int) -> bool:
        """Delete a user."""
        try:
            db_user = db.query(User).filter(User.id == user_id).first()
            if not db_user:
                raise NotFoundError(
                    resource="User",
                    identifier=user_id,
                    error_code="user_not_found",
                )
            
            # TODO: Add any cleanup logic here (e.g., delete user's documents)
            
            db.delete(db_user)
            db.commit()
            
            return True
            
        except NotFoundError:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting user {user_id}: {str(e)}")
            raise BadRequestError(
                message="Failed to delete user",
                error_code="user_deletion_failed",
            )
    
    def authenticate(
        self, 
        db: Session, 
        email: str, 
        password: str
    ) -> Optional[UserInDB]:
        """Authenticate a user."""
        try:
            user = self.get_user_by_email(db, email=email)
            if not user:
                return None
            
            if not verify_password(password, user.hashed_password):
                return None
                
            return user
            
        except Exception as e:
            logger.error(f"Authentication error for {email}: {str(e)}")
            return None
    
    def is_active(self, user: UserInDB) -> bool:
        """Check if a user is active."""
        return user.is_active
    
    def is_superuser(self, user: UserInDB) -> bool:
        """Check if a user is a superuser."""
        return user.is_superuser

# Create a singleton instance of the service
user_service = UserService()
