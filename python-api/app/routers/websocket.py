"""WebSocket transcription router."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.config import config
from app.database import get_db, get_session_by_id, create_session
from app.services.session_manager import session_manager
from app.services.assemblyai import (
    setup_assemblyai_session, 
    cleanup_assemblyai_session, 
    process_audio_chunk,
    assembly_sessions
)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str = Query(..., description="Session ID"),
    user_id: str = Query(..., description="User ID"),
    api_token: str = Query(..., description="API Token"),
    sample_rate: int = Query(16000, description="Audio sample rate"),
    encoding: str = Query("pcm_s16le", description="Audio encoding")
):
    """
    WebSocket endpoint for real-time audio transcription.
    
    Expected flow:
    1. React app connects with session_id, user_id, api_token, sample_rate, encoding
    2. Server validates API token
    3. Sends PCM16 audio chunks as binary WebSocket messages
    4. Receives JSON responses with transcription verses and completed paragraphs
    """
    await websocket.accept()
    
    try:
        # Validate API token
        if api_token != config.API_TOKEN:
            await websocket.send_json({
                "type": "error",
                "message": "Invalid API token"
            })
            return
        
        # Get database session for validation
        db = next(get_db())
        try:
            # Verify session exists, create if it doesn't
            session = get_session_by_id(db, session_id)
            if not session:
                # Create session automatically
                session_data = {
                    "id": session_id,
                    "code": session_id[-8:].upper(),  # Use last 8 chars as code
                    "host_id": user_id,
                    "created_at": datetime.utcnow()
                }
                session = create_session(db, session_data)
                print(f"Auto-created session: {session_id}")
            
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
                "user_name": "N/A", # User name is not available in this flow
                "user_role": "N/A", # User role is not available in this flow
                "assemblyai_enabled": True
            }
        })
        
        print(f"WebSocket connected: session={session_id}, user={user_id}, sample_rate={sample_rate}, encoding={encoding}")
        
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
