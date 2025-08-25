"""AssemblyAI transcription service."""

import asyncio
import json
import websockets
from typing import Dict
from urllib.parse import urlencode

from app.config import config
from app.utils.time import now_utc
from app.services.session_manager import session_manager
from app.services.ai_providers import refine_and_broadcast_paragraph


# AssemblyAI WebSocket connections
assembly_sessions: Dict[str, websockets.WebSocketClientProtocol] = {}


async def setup_assemblyai_session(session_id: str, sample_rate: int) -> websockets.WebSocketClientProtocol:
    """Setup AssemblyAI v3 Universal-Streaming WebSocket connection for a session."""
    if not config.ASSEMBLYAI_API_KEY:
        raise Exception("ASSEMBLYAI_API_KEY not configured")
    
    # Build WebSocket URL with parameters
    params = {
        "sample_rate": sample_rate,
        "format_turns": "true",
        "encoding": "pcm_s16le",
        # Tighten pause detection to end turns earlier
        "min_end_of_turn_silence_when_confident": "200",
        "max_turn_silence": "1600"
    }
    ws_url = f"wss://streaming.assemblyai.com/v3/ws?{urlencode(params)}"
    
    # Headers for authentication
    headers = {
        "Authorization": config.ASSEMBLYAI_API_KEY
    }
    
    try:
        # Connect to AssemblyAI WebSocket
        websocket = await websockets.connect(ws_url, extra_headers=headers)
        
        # Store the connection
        assembly_sessions[session_id] = websocket
        
        # Start listening for messages in background
        asyncio.create_task(listen_to_assemblyai(session_id, websocket))
        
        print(f"AssemblyAI v3 WebSocket connected for {session_id}")
        return websocket
        
    except Exception as e:
        print(f"Failed to connect to AssemblyAI: {e}")
        raise


async def listen_to_assemblyai(session_id: str, websocket: websockets.WebSocketClientProtocol):
    """Listen for messages from AssemblyAI WebSocket."""
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                await handle_assemblyai_message(session_id, data)
            except json.JSONDecodeError as e:
                print(f"Failed to parse AssemblyAI message for {session_id}: {e}")
            except Exception as e:
                print(f"Error handling AssemblyAI message for {session_id}: {e}")
    except websockets.exceptions.ConnectionClosed:
        print(f"AssemblyAI WebSocket closed for session {session_id}")
    except Exception as e:
        print(f"AssemblyAI WebSocket error for session {session_id}: {e}")
    finally:
        # Cleanup on disconnect
        if session_id in assembly_sessions:
            del assembly_sessions[session_id]


async def handle_assemblyai_message(session_id: str, data: dict):
    """Handle messages from AssemblyAI WebSocket."""
    msg_type = data.get("type")
    
    if msg_type == "Begin":
        print(f"AssemblyAI session {data.get('id')} began for {session_id}")
        
    elif msg_type == "Turn":
        transcript = data.get("transcript", "")
        end_of_turn = data.get("end_of_turn", False)
        turn_is_formatted = data.get("turn_is_formatted", False)
        
        print(f"Turn for session {session_id}: '{transcript}' (end_of_turn: {end_of_turn})")
        
        if not transcript or not transcript.strip():
            return
        
        transcript_text = transcript.strip()
        
        # Always send live transcript for real-time display
        live_message = {
            "type": "live_transcript",
            "data": {
                "text": transcript_text,
                "timestamp": now_utc().isoformat(),
                "session_id": session_id,
                "is_final": end_of_turn and (turn_is_formatted or "turn_is_formatted" in data)
            }
        }
        await session_manager.broadcast_to_session(session_id, live_message)
        
        # For final turns, add to text buffer for AI processing
        if end_of_turn and (turn_is_formatted or "turn_is_formatted" in data):
            # Add text to session buffer
            session_manager.add_to_text_buffer(session_id, transcript_text)
            
            print(f"Session {session_id}: Added to buffer (now {len(session_manager.get_text_buffer(session_id))} chars)")
            
            # Start/restart the buffer timer
            await start_buffer_timer(session_id)
    
    elif msg_type == "Termination":
        audio_duration = data.get("audio_duration_seconds", 0)
        print(f"AssemblyAI session terminated for {session_id}: {audio_duration}s audio")
        
        # Process any remaining buffered text
        buffered_text = session_manager.get_text_buffer(session_id)
        if buffered_text.strip():
            await process_buffered_text(session_id)
        
    else:
        # Handle errors or unknown message types
        print(f"Unknown AssemblyAI message type for {session_id}: {data}")
        
        if "error" in data:
            error_message = {
                "type": "error",
                "message": f"Transcription error: {data.get('error', 'Unknown error')}"
            }
            await session_manager.broadcast_to_session(session_id, error_message)


async def start_buffer_timer(session_id: str):
    """Start a timer to process accumulated text after TEXT_BUFFER_SECONDS."""
    # Create new timer task
    async def timer_task():
        try:
            await asyncio.sleep(config.TEXT_BUFFER_SECONDS)
            await process_buffered_text(session_id)
        except asyncio.CancelledError:
            pass  # Timer was cancelled, which is fine
    
    timer = asyncio.create_task(timer_task())
    session_manager.set_buffer_timer(session_id, timer)


async def process_buffered_text(session_id: str):
    """Process accumulated text buffer and send for AI refinement."""
    buffered_text = session_manager.clear_text_buffer(session_id)
    if not buffered_text.strip():
        return
    
    # Remove this session's timer since it completed
    session_manager.cancel_buffer_timer(session_id)
    
    # Get metadata for paragraph numbering
    metadata = session_manager.get_session_metadata(session_id)
    paragraph_number = metadata.get("paragraph_counter", 0) + 1
    session_manager.update_session_metadata(session_id, {"paragraph_counter": paragraph_number})
    
    # Send buffered text completion message
    buffered_message = {
        "type": "text_buffer_complete",
        "data": {
            "session_id": session_id,
            "paragraph_number": paragraph_number,
            "buffered_text": buffered_text,
            "completed_at": now_utc().isoformat()
        }
    }
    
    # Broadcast the buffered text
    await session_manager.broadcast_to_session(session_id, buffered_message)
    print(f"Session {session_id}: Sent buffered text ({len(buffered_text)} chars) for paragraph {paragraph_number}")
    
    # Fire-and-forget: refine with AI and broadcast when ready
    asyncio.create_task(refine_and_broadcast_paragraph(session_id, buffered_message["data"]))


async def cleanup_assemblyai_session(session_id: str):
    """Cleanup AssemblyAI v3 WebSocket session."""
    if session_id in assembly_sessions:
        try:
            websocket = assembly_sessions[session_id]
            
            # Send termination message
            termination_msg = {"type": "SessionTermination"}
            await websocket.send(json.dumps(termination_msg))
            
            # Close the WebSocket
            await websocket.close()
            del assembly_sessions[session_id]
            print(f"Cleaned up AssemblyAI v3 session for {session_id}")
        except Exception as e:
            print(f"Error cleaning up AssemblyAI session {session_id}: {e}")


async def process_audio_chunk(session_id: str, audio_data: bytes, user_id: str) -> None:
    """Forward audio chunk to AssemblyAI v3 WebSocket for real transcription."""
    if len(audio_data) < 100:  # Skip very small chunks
        return
    
    # Debug: Log audio data reception
    print(f"Received audio chunk for {session_id}: {len(audio_data)} bytes")
    
    # Get AssemblyAI WebSocket for this session
    if session_id not in assembly_sessions:
        print(f"No AssemblyAI session found for {session_id}, this shouldn't happen")
        return
    
    websocket = assembly_sessions[session_id]
    
    try:
        # Send audio data as binary to AssemblyAI v3 WebSocket
        await websocket.send(audio_data)
        print(f"Sent {len(audio_data)} bytes to AssemblyAI for {session_id}")
    except Exception as e:
        print(f"Error sending audio to AssemblyAI for session {session_id}: {e}")
        # Send error to session
        error_message = {
            "type": "error", 
            "message": f"Failed to process audio: {str(e)}"
        }
        await session_manager.broadcast_to_session(session_id, error_message)
