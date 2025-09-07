"""User management endpoints."""
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...core import security
from ...core.exceptions import (
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
)
from ...db.session import get_db
from ...models.user import User
from ...schemas.user import (
    UserCreate,
    UserInDB,
    UserResponse,
    UserUpdate,
    UserUpdatePassword,
)
from ...services.user import user_service

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/me", response_model=UserResponse)
async def read_user_me(
    current_user: User = Depends(security.get_current_user),
) -> UserResponse:
    """
    Get current user information.
    
    Args:
        current_user: Currently authenticated user
        
    Returns:
        UserResponse: Current user information
    """
    return UserResponse.from_orm(current_user)

@router.put("/me", response_model=UserResponse)
async def update_user_me(
    user_in: UserUpdate,
    current_user: User = Depends(security.get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Update current user information.
    
    Args:
        user_in: User data to update
        current_user: Currently authenticated user
        db: Database session
        
    Returns:
        UserResponse: Updated user information
    """
    try:
        # Check if email is being updated and if it's already taken
        if user_in.email and user_in.email != current_user.email:
            existing_user = user_service.get_by_email(db, email=user_in.email)
            if existing_user:
                raise BadRequestError(
                    message="Email already registered",
                    error_code="email_registered",
                )
        
        # Update user
        updated_user = user_service.update_user(
            db, user_id=current_user.id, user_in=user_in
        )
        
        return UserResponse.from_orm(updated_user)
        
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise

@router.put("/me/password", response_model=Dict[str, str])
async def update_password_me(
    password_data: UserUpdatePassword,
    current_user: User = Depends(security.get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    """
    Update current user's password.
    
    Args:
        password_data: Current and new password
        current_user: Currently authenticated user
        db: Database session
        
    Returns:
        Dict with success message
    """
    try:
        # Verify current password
        if not security.verify_password(
            password_data.current_password, current_user.hashed_password
        ):
            raise UnauthorizedError(
                message="Incorrect password",
                error_code="incorrect_password",
            )
        
        # Update password
        user_service.update_password(
            db, user=current_user, new_password=password_data.new_password
        )
        
        return {"message": "Password updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating password: {str(e)}")
        raise

@router.get("/{user_id}", response_model=UserResponse)
async def read_user_by_id(
    user_id: int,
    current_user: User = Depends(security.get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Get user by ID (admin only).
    
    Args:
        user_id: ID of the user to retrieve
        current_user: Currently authenticated user
        db: Database session
        
    Returns:
        UserResponse: User information
    """
    try:
        # Only admins can access other users' data
        if not current_user.is_superuser and current_user.id != user_id:
            raise ForbiddenError(
                message="Not enough permissions",
                error_code="insufficient_permissions",
            )
        
        user = user_service.get(db, user_id=user_id)
        if not user:
            raise NotFoundError(
                resource="User",
                identifier=user_id,
                error_code="user_not_found",
            )
        
        return UserResponse.from_orm(user)
        
    except Exception as e:
        logger.error(f"Error retrieving user: {str(e)}")
        raise

@router.get("/", response_model=List[UserResponse])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(security.get_current_active_superuser),
    db: Session = Depends(get_db),
) -> List[UserResponse]:
    """
    Retrieve users (admin only).
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        current_user: Currently authenticated user (must be admin)
        db: Database session
        
    Returns:
        List[UserResponse]: List of users
    """
    try:
        users = user_service.get_multi(db, skip=skip, limit=limit)
        return [UserResponse.from_orm(user) for user in users]
        
    except Exception as e:
        logger.error(f"Error retrieving users: {str(e)}")
        raise

@router.post("/", response_model=UserResponse)
async def create_user(
    user_in: UserCreate,
    current_user: User = Depends(security.get_current_active_superuser),
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Create new user (admin only).
    
    Args:
        user_in: User data
        current_user: Currently authenticated user (must be admin)
        db: Database session
        
    Returns:
        UserResponse: Created user
    """
    try:
        # Check if user with this email already exists
        existing_user = user_service.get_by_email(db, email=user_in.email)
        if existing_user:
            raise BadRequestError(
                message="Email already registered",
                error_code="email_registered",
            )
        
        # Create new user
        user = user_service.create_user(db, user_in=user_in)
        
        return UserResponse.from_orm(user)
        
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(security.get_current_active_superuser),
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Update a user (admin only).
    
    Args:
        user_id: ID of the user to update
        user_in: User data to update
        current_user: Currently authenticated user (must be admin)
        db: Database session
        
    Returns:
        UserResponse: Updated user
    """
    try:
        # Check if user exists
        user = user_service.get(db, user_id=user_id)
        if not user:
            raise NotFoundError(
                resource="User",
                identifier=user_id,
                error_code="user_not_found",
            )
        
        # Check if email is being updated and if it's already taken
        if user_in.email and user_in.email != user.email:
            existing_user = user_service.get_by_email(db, email=user_in.email)
            if existing_user:
                raise BadRequestError(
                    message="Email already registered",
                    error_code="email_registered",
                )
        
        # Update user
        updated_user = user_service.update_user(
            db, user_id=user_id, user_in=user_in
        )
        
        return UserResponse.from_orm(updated_user)
        
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise

@router.delete("/{user_id}", response_model=Dict[str, str])
async def delete_user(
    user_id: int,
    current_user: User = Depends(security.get_current_active_superuser),
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    """
    Delete a user (admin only).
    
    Args:
        user_id: ID of the user to delete
        current_user: Currently authenticated user (must be admin)
        db: Database session
        
    Returns:
        Dict with success message
    """
    try:
        # Prevent deleting yourself
        if current_user.id == user_id:
            raise BadRequestError(
                message="Cannot delete your own account",
                error_code="self_deletion_not_allowed",
            )
        
        # Check if user exists
        user = user_service.get(db, user_id=user_id)
        if not user:
            raise NotFoundError(
                resource="User",
                identifier=user_id,
                error_code="user_not_found",
            )
        
        # Delete user
        user_service.delete_user(db, user_id=user_id)
        
        return {"message": "User deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise
