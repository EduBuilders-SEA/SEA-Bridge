"""Authentication endpoints."""
import logging
from datetime import timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ...core import security
from ...core.config import settings
from ...core.exceptions import BadRequestError, UnauthorizedError
from ...db.session import get_db
from ...models.user import User
from ...schemas.token import Token, TokenPayload
from ...schemas.user import UserCreate, UserInDB, UserLogin, UserResponse
from ...services.user import user_service

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/login", response_model=Token)
async def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    """
    OAuth2 compatible token login, get an access token for future requests.
    
    Args:
        form_data: Login form data
        db: Database session
        
    Returns:
        Dict containing access token and token type
    """
    try:
        # Authenticate user
        user = user_service.authenticate(
            db, email=form_data.username, password=form_data.password
        )
        
        if not user:
            raise UnauthorizedError(
                message="Incorrect email or password",
                error_code="invalid_credentials",
            )
        
        if not user.is_active:
            raise UnauthorizedError(
                message="Inactive user",
                error_code="inactive_user",
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            subject=user.email, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
        }
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise

@router.post("/register", response_model=UserResponse)
async def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Create a new user account.
    
    Args:
        user_in: User registration data
        db: Database session
        
    Returns:
        UserResponse: The created user
    """
    try:
        # Check if user already exists
        db_user = user_service.get_by_email(db, email=user_in.email)
        if db_user:
            raise BadRequestError(
                message="Email already registered",
                error_code="email_registered",
            )
        
        # Create new user
        user = user_service.create_user(db, user_in)
        
        # Return user data without password hash
        return UserResponse.from_orm(user)
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise

@router.post("/refresh-token", response_model=Token)
async def refresh_token(
    current_user: User = Depends(security.get_current_user),
) -> Dict[str, str]:
    """
    Refresh access token.
    
    Args:
        current_user: Currently authenticated user
        
    Returns:
        Dict containing new access token and token type
    """
    try:
        # Create new access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            subject=current_user.email, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
        }
        
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise

@router.post("/forgot-password")
async def forgot_password(
    email: str,
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    """
    Request password reset.
    
    Args:
        email: User's email address
        db: Database session
        
    Returns:
        Dict with success message
    """
    try:
        user = user_service.get_by_email(db, email=email)
        
        if user:
            # Generate password reset token
            reset_token = security.generate_password_reset_token(email=email)
            
            # TODO: Send password reset email
            logger.info(f"Password reset token for {email}: {reset_token}")
        
        # Always return success to prevent user enumeration
        return {"message": "If your email is registered, you will receive a password reset link."}
        
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        raise

@router.post("/reset-password")
async def reset_password(
    token: str,
    new_password: str,
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    """
    Reset user password using a valid token.
    
    Args:
        token: Password reset token
        new_password: New password
        db: Database session
        
    Returns:
        Dict with success message
    """
    try:
        email = security.verify_password_reset_token(token)
        if not email:
            raise BadRequestError(
                message="Invalid token",
                error_code="invalid_token",
            )
        
        user = user_service.get_by_email(db, email=email)
        if not user:
            raise BadRequestError(
                message="User not found",
                error_code="user_not_found",
            )
        
        # Update user password
        user_service.update_password(db, user=user, new_password=new_password)
        
        return {"message": "Password updated successfully"}
        
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        raise
