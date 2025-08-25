"""Sessions router for Recording Angel API."""

from typing import Any, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.auth import AuthService, require_leadership, get_current_active_user
from app.database import get_db, get_session_by_id, get_session_by_code, create_session, update_user
from app.models import Session as SessionModel, SessionCreate, SessionParticipant, User

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("/", response_model=SessionModel)
async def create_transcription_session(
    session_data: SessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Create a new transcription session.
    
    Creates a new session for real-time transcription. Only approved users can create sessions.
    """
    # Check if user is approved
    if current_user.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account must be approved to create sessions"
        )
    
    # Check if session code already exists
    existing_session = get_session_by_code(db, session_data.code)
    if existing_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session code already exists"
        )
    
    # Create session data
    session_dict = session_data.dict()
    session_dict["host_id"] = current_user.id
    
    # Create session
    db_session = create_session(db, session_dict)
    
    return db_session


@router.get("/", response_model=List[SessionModel])
async def get_sessions(
    skip: int = Query(0, ge=0, description="Number of sessions to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of sessions to return"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get list of sessions.
    
    Returns a paginated list of sessions. Users can see sessions they created or participated in.
    Leadership roles can see all sessions.
    """
    from sqlalchemy.orm import Query as SQLQuery
    
    # Build query based on user role
    if current_user.role in ["BISHOP", "STAKEPRESIDENT", "MISSIONPRESIDENT", "ADMIN"]:
        # Leadership can see all sessions
        query: SQLQuery = db.query(SessionModel)
    else:
        # Regular users can only see their own sessions or sessions they participated in
        query: SQLQuery = db.query(SessionModel).filter(
            (SessionModel.host_id == current_user.id) |
            (SessionModel.participants.any(user_id=current_user.id))
        )
    
    # Apply pagination
    sessions = query.offset(skip).limit(limit).all()
    
    return sessions


@router.get("/{session_id}", response_model=SessionModel)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get session by ID.
    
    Returns session information. Users can access sessions they created or participated in.
    Leadership roles can access any session.
    """
    session = get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check if user has access to this session
    if (current_user.role not in ["BISHOP", "STAKEPRESIDENT", "MISSIONPRESIDENT", "ADMIN"] and
        session.host_id != current_user.id and
        not any(p.user_id == current_user.id for p in session.participants)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session"
        )
    
    return session


@router.get("/code/{session_code}", response_model=SessionModel)
async def get_session_by_code(
    session_code: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get session by code.
    
    Returns session information by session code. Used for joining sessions.
    """
    session = get_session_by_code(db, session_code)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return session


@router.post("/{session_id}/join")
async def join_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Join a transcription session.
    
    Adds the current user as a participant in the session.
    """
    # Check if session exists
    session = get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check if session is ended
    if session.ended_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session has already ended"
        )
    
    # Check if user is already a participant
    existing_participant = db.query(SessionParticipant).filter(
        SessionParticipant.session_id == session_id,
        SessionParticipant.user_id == current_user.id,
        SessionParticipant.left_at.is_(None)
    ).first()
    
    if existing_participant:
        return {"message": "Already joined this session"}
    
    # Add participant
    participant = SessionParticipant(
        session_id=session_id,
        user_id=current_user.id,
        joined_at=datetime.utcnow()
    )
    db.add(participant)
    db.commit()
    
    return {"message": "Successfully joined session"}


@router.post("/{session_id}/leave")
async def leave_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Leave a transcription session.
    
    Marks the current user as having left the session.
    """
    # Check if session exists
    session = get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Find participant record
    participant = db.query(SessionParticipant).filter(
        SessionParticipant.session_id == session_id,
        SessionParticipant.user_id == current_user.id,
        SessionParticipant.left_at.is_(None)
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not a participant in this session"
        )
    
    # Mark as left
    participant.left_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Successfully left session"}


@router.post("/{session_id}/end")
async def end_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    End a transcription session.
    
    Ends the session. Only the host or leadership roles can end sessions.
    """
    # Check if session exists
    session = get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check if user can end the session
    if (current_user.role not in ["BISHOP", "STAKEPRESIDENT", "MISSIONPRESIDENT", "ADMIN"] and
        session.host_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the host or leadership can end sessions"
        )
    
    # Check if session is already ended
    if session.ended_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session has already ended"
        )
    
    # End session
    session.ended_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Session ended successfully"}


@router.get("/{session_id}/participants", response_model=List[SessionParticipant])
async def get_session_participants(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get session participants.
    
    Returns list of participants in the session.
    """
    # Check if session exists
    session = get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check if user has access to this session
    if (current_user.role not in ["BISHOP", "STAKEPRESIDENT", "MISSIONPRESIDENT", "ADMIN"] and
        session.host_id != current_user.id and
        not any(p.user_id == current_user.id for p in session.participants)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session"
        )
    
    participants = db.query(SessionParticipant).filter(
        SessionParticipant.session_id == session_id
    ).all()
    
    return participants
