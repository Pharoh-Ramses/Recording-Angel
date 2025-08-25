"""WebSocket transcription router."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import AuthService
from app.database import get_db, get_session_by_id, get_user_by_id
from app.services.session_manager import session_manager
from app.services.assemblyai import (
    setup_assemblyai_session, 
    cleanup_assemblyai_session, 
    process_audio_chunk,
    assembly_sessions
)
from app.database import SessionParticipant

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str = Query(..., description="Session ID"),
    user_id: str = Query(..., description="User ID"),
    access_token: str = Query(..., description="JWT Access Token"),
    sample_rate: int = Query(16000, description="Audio sample rate"),
    encoding: str = Query("pcm_s16le", description="Audio encoding")
):
    """
    WebSocket endpoint for real-time audio transcription.
    
    Expected flow:
    1. React app connects with session_id, user_id, access_token, sample_rate, encoding
    2. Server validates JWT token and user permissions
    3. Sends PCM16 audio chunks as binary WebSocket messages
    4. Receives JSON responses with transcription verses and completed paragraphs
    """
    await websocket.accept()
    
    try:
        # Validate JWT token and get user
        token_data = AuthService.verify_token(access_token)
        if not token_data or token_data.user_id != user_id:
            await websocket.send_json({
                "type": "error",
                "message": "Invalid authentication token"
            })
            return
        
        # Get database session for validation
        db = next(get_db())
        try:
            # Verify user exists and is active
            user = get_user_by_id(db, user_id)
            if not user or not user.is_active:
                await websocket.send_json({
                    "type": "error",
                    "message": "User not found or inactive"
                })
                return
            
            # Verify session exists and user has access
            session = get_session_by_id(db, session_id)
            if not session:
                await websocket.send_json({
                    "type": "error",
                    "message": "Session not found"
                })
                return
            
            # Check if user has access to this session
            if (user.role not in ["BISHOP", "STAKEPRESIDENT", "MISSIONPRESIDENT", "ADMIN"] and
                session.host_id != user_id):
                # Check if user is a participant
                participant = db.query(SessionParticipant).filter(
                    SessionParticipant.session_id == session_id,
                    SessionParticipant.user_id == user_id,
                    SessionParticipant.left_at.is_(None)
                ).first()
                
                if not participant:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Not authorized to access this session"
                    })
                    return
            
            # Check if session is ended
            if session.ended_at:
                await websocket.send_json({
                    "type": "error",
                    "message": "Session has already ended"
                })
                return
                
        finally:
            db.close()
        
        # Add connection to session
        await session_manager.add_connection(session_id, websocket, user_id)
        
        # Setup AssemblyAI session if this is the first connection
        if session_id not in assembly_sessions:
            try:
                await setup_assemblyai_session(session_id, sample_rate)
                print(f"AssemblyAI session created for {session_id}")
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Failed to setup AssemblyAI: {str(e)}"
                })
                return
        
        # Store current speaker info in session metadata
        session_manager.update_session_metadata(session_id, {"current_speaker": user_id})
        
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": f"Connected to session {session_id} with real AssemblyAI transcription",
            "config": {
                "sample_rate": sample_rate,
                "encoding": encoding,
                "session_id": session_id,
                "user_id": user_id,
                "user_name": user.full_name,
                "user_role": user.role,
                "assemblyai_enabled": True
            }
        })
        
        print(f"WebSocket connected: session={session_id}, user={user_id} ({user.full_name}), sample_rate={sample_rate}, encoding={encoding}")
        
        # Listen for audio data
        while True:
            try:
                # Receive binary audio data
                audio_data = await websocket.receive_bytes()
                
                # Forward audio to AssemblyAI for real transcription
                await process_audio_chunk(session_id, audio_data, user_id)
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"Error processing audio data: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": f"Error processing audio: {str(e)}"
                })
                break
                
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Clean up connection
        await session_manager.remove_connection(session_id, websocket, user_id)
        
        # Clean up AssemblyAI session if no more connections
        if session_id not in session_manager.active_sessions or len(session_manager.active_sessions[session_id]) == 0:
            await cleanup_assemblyai_session(session_id)
        
        print(f"WebSocket disconnected: session={session_id}, user={user_id}")
