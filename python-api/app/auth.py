"""Authentication service for Recording Angel API."""

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import config
from app.database import get_db, get_user_by_email, get_user_by_id, save_refresh_token, get_refresh_token, revoke_refresh_token
from app.models import TokenData, User

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security scheme for JWT tokens
security = HTTPBearer()


class AuthService:
    """Authentication service class."""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: dict) -> str:
        """Create a JWT refresh token."""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=config.REFRESH_TOKEN_EXPIRE_DAYS)
        
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> Optional[TokenData]:
        """Verify and decode a JWT token."""
        try:
            payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
            user_id: str = payload.get("sub")
            email: str = payload.get("email")
            role: str = payload.get("role")
            token_type: str = payload.get("type")
            
            if user_id is None or email is None or role is None or token_type is None:
                return None
            
            return TokenData(user_id=user_id, email=email, role=role)
        except JWTError:
            return None
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """Authenticate a user with email and password."""
        user = get_user_by_email(db, email)
        if not user:
            return None
        if not AuthService.verify_password(password, user.password_hash):
            return None
        if not user.is_active:
            return None
        return user
    
    @staticmethod
    def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
    ) -> User:
        """Get current authenticated user from JWT token."""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            token_data = AuthService.verify_token(credentials.credentials)
            if token_data is None:
                raise credentials_exception
            
            # Check if it's an access token
            payload = jwt.decode(credentials.credentials, config.SECRET_KEY, algorithms=[config.ALGORITHM])
            if payload.get("type") != "access":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )
            
            user = get_user_by_id(db, user_id=token_data.user_id)
            if user is None:
                raise credentials_exception
            
            return user
        except JWTError:
            raise credentials_exception
    

    
    @staticmethod
    def hash_refresh_token(token: str) -> str:
        """Hash a refresh token for storage."""
        return hashlib.sha256(token.encode()).hexdigest()
    
    @staticmethod
    def save_refresh_token_to_db(db: Session, user_id: str, refresh_token: str) -> None:
        """Save refresh token hash to database."""
        token_hash = AuthService.hash_refresh_token(refresh_token)
        expires_at = datetime.utcnow() + timedelta(days=config.REFRESH_TOKEN_EXPIRE_DAYS)
        save_refresh_token(db, user_id, token_hash, expires_at)
    
    @staticmethod
    def verify_refresh_token(db: Session, refresh_token: str) -> Optional[User]:
        """Verify a refresh token and return the user."""
        try:
            token_data = AuthService.verify_token(refresh_token)
            if token_data is None:
                return None
            
            # Check if it's a refresh token
            payload = jwt.decode(refresh_token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
            if payload.get("type") != "refresh":
                return None
            
            # Check if token exists in database
            token_hash = AuthService.hash_refresh_token(refresh_token)
            db_token = get_refresh_token(db, token_hash)
            if not db_token:
                return None
            
            # Get user
            user = get_user_by_id(db, token_data.user_id)
            if not user or not user.is_active:
                return None
            
            return user
        except JWTError:
            return None
    
    @staticmethod
    def revoke_refresh_token_from_db(db: Session, refresh_token: str) -> bool:
        """Revoke a refresh token."""
        token_hash = AuthService.hash_refresh_token(refresh_token)
        return revoke_refresh_token(db, token_hash)
    
    @staticmethod
    def generate_session_code() -> str:
        """Generate a random session code."""
        return secrets.token_urlsafe(6).upper()[:8]


# Standalone dependency functions (to avoid circular references)
def get_current_active_user(current_user: User = Depends(AuthService.get_current_user)) -> User:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_role(required_role: str):
    """Decorator to require specific role."""
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role != required_role and current_user.role != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {required_role} required"
            )
        return current_user
    return role_checker

def require_roles(required_roles: list[str]):
    """Decorator to require one of specific roles."""
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in required_roles and current_user.role != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"One of roles {required_roles} required"
            )
        return current_user
    return role_checker

# Role-based dependencies
require_admin = require_role("ADMIN")
require_bishop = require_role("BISHOP")
require_stake_president = require_role("STAKEPRESIDENT")
require_missionary = require_role("MISSIONARY")
require_mission_president = require_role("MISSIONPRESIDENT")

# Multi-role dependencies
require_leadership = require_roles(["BISHOP", "STAKEPRESIDENT", "MISSIONPRESIDENT", "ADMIN"])
require_mission_roles = require_roles(["MISSIONARY", "MISSIONPRESIDENT", "ADMIN"])
