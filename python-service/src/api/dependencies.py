"""Dependencies for the API endpoints."""
from typing import Generator, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.security import verify_password
from ...db.session import SessionLocal
from ...models.user import User
from ...schemas.token import TokenData

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_PREFIX}/auth/login"
)

def get_db() -> Generator:
    ""
    Dependency that provides a database session.
    
    Yields:
        Generator[Session, None, None]: A database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency that gets the current user from the JWT token.
    
    Args:
        token: JWT token from the Authorization header
        db: Database session
        
    Returns:
        User: The authenticated user
        
    Raises:
        HTTPException: If the token is invalid or the user doesn't exist
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_aud": False},
        )
        
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        
        token_data = TokenData(username=username)
    except (JWTError, ValidationError):
        raise credentials_exception
    
    user = db.query(User).filter(User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency that checks if the current user is active.
    
    Args:
        current_user: The current user from get_current_user
        
    Returns:
        User: The authenticated and active user
        
    Raises:
        HTTPException: If the user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency that checks if the current user is a superuser.
    
    Args:
        current_user: The current user from get_current_user
        
    Returns:
        User: The authenticated superuser
        
    Raises:
        HTTPException: If the user is not a superuser
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user
