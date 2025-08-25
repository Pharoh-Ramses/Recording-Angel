"""Users router for Recording Angel API."""

from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.auth import AuthService, require_admin, require_leadership, get_current_active_user
from app.database import get_db, get_user_by_id, get_user_by_email, update_user
from app.models import User, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/", response_model=List[User])
async def get_users(
    skip: int = Query(0, ge=0, description="Number of users to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of users to return"),
    role: str = Query(None, description="Filter by role"),
    status: str = Query(None, description="Filter by status"),
    current_user: User = Depends(require_leadership),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get list of users.
    
    Returns a paginated list of users. Only accessible by leadership roles.
    """
    from sqlalchemy.orm import Query as SQLQuery
    
    # Build query
    query: SQLQuery = db.query(User)
    
    # Apply filters
    if role:
        query = query.filter(User.role == role)
    if status:
        query = query.filter(User.status == status)
    
    # Apply pagination
    users = query.offset(skip).limit(limit).all()
    
    return users


@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: str,
            current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get user by ID.
    
    Returns user information. Users can only access their own profile unless they have leadership role.
    """
    # Check if user is accessing their own profile or has leadership role
    if current_user.id != user_id and current_user.role not in ["BISHOP", "STAKEPRESIDENT", "MISSIONPRESIDENT", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user's profile"
        )
    
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.put("/{user_id}", response_model=User)
async def update_user_profile(
    user_id: str,
    user_update: UserUpdate,
    current_user: User = Depends(require_leadership),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update user profile.
    
    Updates user information. Only accessible by leadership roles.
    """
    # Check if user exists
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Remove None values
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    
    if not update_data:
        return user
    
    # Check if email is being changed and if it's already taken
    if "email" in update_data and update_data["email"] != user.email:
        existing_user = get_user_by_email(db, email=update_data["email"])
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Update user
    updated_user = update_user(db, user_id, update_data)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )
    
    return updated_user


@router.patch("/{user_id}/status")
async def update_user_status(
    user_id: str,
    status: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """
    Update user status.
    
    Updates user status (PENDING, APPROVED, REJECTED). Only accessible by admins.
    """
    # Validate status
    valid_statuses = ["PENDING", "APPROVED", "REJECTED"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Status must be one of: {', '.join(valid_statuses)}"
        )
    
    # Check if user exists
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update status
    updated_user = update_user(db, user_id, {"status": status})
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user status"
        )
    
    return {"message": f"User status updated to {status}"}


@router.patch("/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """
    Update user role.
    
    Updates user role. Only accessible by admins.
    """
    # Validate role
    valid_roles = ["MEMBER", "BISHOP", "STAKEPRESIDENT", "MISSIONARY", "MISSIONPRESIDENT", "ADMIN"]
    if role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role must be one of: {', '.join(valid_roles)}"
        )
    
    # Check if user exists
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update role
    updated_user = update_user(db, user_id, {"role": role})
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user role"
        )
    
    return {"message": f"User role updated to {role}"}


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """
    Delete user.
    
    Soft deletes a user by setting is_active to False. Only accessible by admins.
    """
    # Check if user exists
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-deletion
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Soft delete user
    updated_user = update_user(db, user_id, {"is_active": False})
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )
    
    return {"message": "User deleted successfully"}


@router.get("/ward/{ward_id}", response_model=List[User])
async def get_users_by_ward(
    ward_id: int,
    current_user: User = Depends(require_leadership),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get users by ward.
    
    Returns all users in a specific ward. Only accessible by leadership roles.
    """
    users = db.query(User).filter(User.ward == ward_id, User.is_active == True).all()
    return users


@router.get("/stake/{stake_id}", response_model=List[User])
async def get_users_by_stake(
    stake_id: int,
    current_user: User = Depends(require_leadership),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get users by stake.
    
    Returns all users in a specific stake. Only accessible by leadership roles.
    """
    users = db.query(User).filter(User.stake == stake_id, User.is_active == True).all()
    return users
