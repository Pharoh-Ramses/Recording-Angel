"""Authentication router for Recording Angel API."""

from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.auth import AuthService, get_current_active_user
from app.database import get_db, get_user_by_email, create_user
from app.models import (
    User, UserCreate, Token, LoginRequest, 
    PasswordChangeRequest, UserUpdate
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()


@router.post("/register", response_model=Token)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
) -> Any:
    """
    Register a new user.
    
    Creates a new user account and returns access and refresh tokens.
    """
    # Check if user already exists
    existing_user = get_user_by_email(db, email=user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = AuthService.get_password_hash(user_data.password)
    
    # Create user data
    user_dict = user_data.dict()
    user_dict.pop("password")
    user_dict["password_hash"] = hashed_password
    
    # Create user
    db_user = create_user(db, user_dict)
    
    # Create tokens
    access_token_expires = timedelta(minutes=30)
    access_token = AuthService.create_access_token(
        data={"sub": db_user.id, "email": db_user.email, "role": db_user.role},
        expires_delta=access_token_expires
    )
    
    refresh_token = AuthService.create_refresh_token(
        data={"sub": db_user.id, "email": db_user.email, "role": db_user.role}
    )
    
    # Save refresh token to database
    AuthService.save_refresh_token_to_db(db, db_user.id, refresh_token)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 1800  # 30 minutes in seconds
    }


@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Login with email and password.
    
    Authenticates user credentials and returns access and refresh tokens.
    """
    # Authenticate user
    user = AuthService.authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is approved
    if user.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not approved. Please contact your administrator."
        )
    
    # Create tokens
    access_token_expires = timedelta(minutes=30)
    access_token = AuthService.create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role},
        expires_delta=access_token_expires
    )
    
    refresh_token = AuthService.create_refresh_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )
    
    # Save refresh token to database
    AuthService.save_refresh_token_to_db(db, user.id, refresh_token)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 1800  # 30 minutes in seconds
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
) -> Any:
    """
    Refresh access token using refresh token.
    
    Validates the refresh token and returns a new access token.
    """
    # Verify refresh token
    user = AuthService.verify_refresh_token(db, refresh_token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is approved
    if user.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not approved"
        )
    
    # Create new access token
    access_token_expires = timedelta(minutes=30)
    access_token = AuthService.create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role},
        expires_delta=access_token_expires
    )
    
    # Create new refresh token
    new_refresh_token = AuthService.create_refresh_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )
    
    # Revoke old refresh token and save new one
    AuthService.revoke_refresh_token_from_db(db, refresh_token)
    AuthService.save_refresh_token_to_db(db, user.id, new_refresh_token)
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": 1800  # 30 minutes in seconds
    }


@router.post("/logout")
async def logout(
    refresh_token: str,
    db: Session = Depends(get_db)
) -> dict:
    """
    Logout and revoke refresh token.
    
    Revokes the refresh token to prevent further use.
    """
    # Revoke refresh token
    revoked = AuthService.revoke_refresh_token_from_db(db, refresh_token)
    
    return {"message": "Successfully logged out" if revoked else "Token not found"}


@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Get current user information.
    
    Returns the profile information of the currently authenticated user.
    """
    return current_user


@router.put("/me", response_model=User)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Update current user profile.
    
    Updates the profile information of the currently authenticated user.
    """
    from app.database import update_user
    
    # Remove None values
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    
    if not update_data:
        return current_user
    
    # Check if email is being changed and if it's already taken
    if "email" in update_data and update_data["email"] != current_user.email:
        existing_user = get_user_by_email(db, email=update_data["email"])
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Update user
    updated_user = update_user(db, current_user.id, update_data)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )
    
    return updated_user


@router.post("/change-password")
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Change user password.
    
    Allows the current user to change their password.
    """
    # Verify current password
    if not AuthService.verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Hash new password
    new_password_hash = AuthService.get_password_hash(password_data.new_password)
    
    # Update password
    from app.database import update_user
    updated_user = update_user(db, current_user.id, {"password_hash": new_password_hash})
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )
    
    return {"message": "Password changed successfully"}
