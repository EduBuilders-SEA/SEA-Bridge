"""Security utilities for authentication and password hashing."""
from datetime import datetime, timedelta
from typing import Any, Optional, Union

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import ValidationError

from ..core.config import settings
from ..core.exceptions import UnauthorizedError
from ..models.user import User

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate a password hash."""
    return pwd_context.hash(password)

def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token.
    
    Args:
        subject: Subject to encode in the token (usually user ID or email)
        expires_delta: Token expiration time delta
        
    Returns:
        str: Encoded JWT token
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt

def verify_token(token: str) -> dict:
    """Verify a JWT token and return the payload.
    
    Args:
        token: JWT token to verify
        
    Returns:
        dict: Decoded token payload
        
    Raises:
        UnauthorizedError: If the token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as e:
        raise UnauthorizedError(
            message="Invalid authentication credentials",
            error_code="invalid_token",
        )

def generate_password_reset_token(email: str) -> str:
    """Generate a password reset token.
    
    Args:
        email: User's email address
        
    Returns:
        str: JWT token for password reset
    """
    delta = timedelta(hours=settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS)
    now = datetime.utcnow()
    expires = now + delta
    
    to_encode = {
        "exp": expires,
        "nbf": now,
        "sub": email,
        "type": "password_reset",
    }
    
    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

def verify_password_reset_token(token: str) -> Optional[str]:
    """Verify a password reset token.
    
    Args:
        token: JWT token to verify
        
    Returns:
        Optional[str]: Email if token is valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_aud": False},
        )
        if payload.get("type") != "password_reset":
            return None
        return payload.get("sub")
    except JWTError:
        return None

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    """Get the current authenticated user.
    
    Args:
        db: Database session
        token: JWT token from the Authorization header
        
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
        payload = verify_token(token)
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except (JWTError, ValidationError):
        raise credentials_exception
    
    user = user_service.get_by_email(db, email=username)
    if user is None:
        raise credentials_exception
    
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get the current active user.
    
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

def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get the current active superuser.
    
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
