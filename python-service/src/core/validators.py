"""Custom validators for Pydantic models."""
import re
from typing import Any, Optional

from pydantic import ValidationError

# Regular expression for validating ISO 639-1 language codes (2 letters)
LANGUAGE_CODE_PATTERN = re.compile(r'^[a-z]{2}(-[A-Z]{2,3})?$')

# Regular expression for password strength
# At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
PASSWORD_PATTERN = re.compile(
    r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
)

def validate_language_code(language_code: str) -> str:
    """
    Validate an ISO 639-1 language code.
    
    Args:
        language_code: The language code to validate
        
    Returns:
        The validated language code in lowercase
        
    Raises:
        ValueError: If the language code is invalid
    """
    if not language_code or not isinstance(language_code, str):
        raise ValueError("Language code must be a non-empty string")
    
    # Convert to lowercase for consistency
    language_code = language_code.lower()
    
    if not LANGUAGE_CODE_PATTERN.match(language_code):
        raise ValueError(
            "Invalid language code. Must be a valid ISO 639-1 code (e.g., 'en', 'es', 'fr')"
        )
    
    return language_code

def validate_password_strength(password: str) -> str:
    """
    Validate password strength.
    
    Args:
        password: The password to validate
        
    Returns:
        The validated password
        
    Raises:
        ValueError: If the password doesn't meet strength requirements
    """
    if not password or not isinstance(password, str):
        raise ValueError("Password must be a non-empty string")
    
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    
    if not PASSWORD_PATTERN.match(password):
        raise ValueError(
            "Password must contain at least 1 uppercase letter, "
            "1 lowercase letter, 1 number, and 1 special character"
        )
    
    return password

def validate_email(email: str) -> str:
    """
    Validate an email address.
    
    Args:
        email: The email address to validate
        
    Returns:
        The validated email in lowercase
        
    Raises:
        ValueError: If the email is invalid
    """
    if not email or not isinstance(email, str):
        raise ValueError("Email must be a non-empty string")
    
    # Convert to lowercase for consistency
    email = email.lower().strip()
    
    # Simple email validation
    if '@' not in email or '.' not in email:
        raise ValueError("Invalid email format")
    
    return email

def validate_file_extension(filename: str, allowed_extensions: list[str]) -> str:
    """
    Validate a file extension against a list of allowed extensions.
    
    Args:
        filename: The name of the file to validate
        allowed_extensions: List of allowed file extensions (e.g., ['.pdf', '.docx'])
        
    Returns:
        The lowercase file extension with leading dot
        
    Raises:
        ValueError: If the file extension is not allowed
    """
    if not filename or not isinstance(filename, str):
        raise ValueError("Filename must be a non-empty string")
    
    # Extract file extension
    if '.' not in filename:
        raise ValueError(f"File must have an extension. Allowed: {', '.join(allowed_extensions)}")
    
    file_ext = filename.lower().rsplit('.', 1)[1]
    if f".{file_ext}" not in [ext.lower() for ext in allowed_extensions]:
        raise ValueError(
            f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    return f".{file_ext}"

def validate_file_size(file_size: int, max_size_mb: int = 10) -> int:
    """
    Validate file size.
    
    Args:
        file_size: Size of the file in bytes
        max_size_mb: Maximum allowed file size in megabytes (default: 10MB)
        
    Returns:
        The validated file size in bytes
        
    Raises:
        ValueError: If the file is too large
    """
    max_size_bytes = max_size_mb * 1024 * 1024  # Convert MB to bytes
    
    if file_size <= 0:
        raise ValueError("File size must be greater than 0")
    
    if file_size > max_size_bytes:
        raise ValueError(f"File is too large. Maximum size is {max_size_mb}MB")
    
    return file_size

def validate_enum(value: Any, enum_class: type) -> Any:
    """
    Validate a value against an enum class.
    
    Args:
        value: The value to validate
        enum_class: The enum class to validate against
        
    Returns:
        The validated enum value
        
    Raises:
        ValueError: If the value is not a valid enum value
    """
    try:
        return enum_class(value)
    except ValueError:
        valid_values = [e.value for e in enum_class]
        raise ValueError(
            f"Invalid value. Must be one of: {', '.join(valid_values)}"
        ) from None
