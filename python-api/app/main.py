import os
import asyncio
import json
import websockets
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Set
from urllib.parse import urlencode

import httpx
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path


DOTENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=DOTENV_PATH, override=False)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
# Paragraphizer config (lemur | http | gemini)
PARAGRAPHIZER_PROVIDER = os.getenv("PARAGRAPHIZER_PROVIDER", "gemini").lower()
PARAGRAPHIZER_HTTP_URL = os.getenv("PARAGRAPHIZER_HTTP_URL", "")
PARAGRAPHIZER_HTTP_AUTH_HEADER = os.getenv("PARAGRAPHIZER_HTTP_AUTH_HEADER", "")
PARAGRAPHIZER_MODEL = os.getenv("PARAGRAPHIZER_MODEL", "gemini-2.0-flash-exp")
PARAGRAPHIZER_COOLDOWN_SECONDS = int(os.getenv("PARAGRAPHIZER_COOLDOWN_SECONDS", "5"))  # Reduced since Gemini is faster
PARAGRAPHIZER_RETRY_BACKOFF_SECONDS = int(os.getenv("PARAGRAPHIZER_RETRY_BACKOFF_SECONDS", "10"))

# Google AI API key for Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# AssemblyAI API key validation
if not ASSEMBLYAI_API_KEY:
    print("Warning: ASSEMBLYAI_API_KEY not set")

# Configure Gemini if using it
if PARAGRAPHIZER_PROVIDER == "gemini":
    if not GOOGLE_API_KEY:
        print("Warning: GOOGLE_API_KEY not set but Gemini provider selected")
    else:
        genai.configure(api_key=GOOGLE_API_KEY)
        print(f"Gemini configured with model: {PARAGRAPHIZER_MODEL}")


app = FastAPI(title="Recording Angel Python API", version="0.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session management (replace with database later)
active_sessions: Dict[str, Set[WebSocket]] = {}
session_metadata: Dict[str, Dict] = {}
assembly_sessions: Dict[str, websockets.WebSocketClientProtocol] = {}  # AssemblyAI v3 WebSocket connections

# Time-based buffering for AI refinement (every 10 seconds)
TEXT_BUFFER_SECONDS = 10
session_text_buffers: Dict[str, str] = {}  # Accumulate text for AI processing
session_buffer_timers: Dict[str, asyncio.Task] = {}  # Active buffer timers

# Paragraphizer throttling state
paragraphizer_last_call_at: Dict[str, datetime] = {}


@app.get("/health")
async def health():
    return {"status": "healthy", "time": now_utc().isoformat()}


class TokenRequest(BaseModel):
    # Expiry in seconds; AssemblyAI allows small TTL (e.g., 60 seconds)
    expires_in: Optional[int] = 60


@app.post("/api/webrtc/token")
async def create_webrtc_token(body: TokenRequest):
    """
    Create an ephemeral realtime token for the browser to initialize a WebRTC
    connection to AssemblyAI from a React app.
    """
    if not ASSEMBLYAI_API_KEY:
        raise HTTPException(status_code=500, detail="ASSEMBLYAI_API_KEY is not set")

    expires_in_seconds = body.expires_in or 60

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://streaming.assemblyai.com/v3/token",
                headers={"Authorization": ASSEMBLYAI_API_KEY},
                params={"expires_in_seconds": expires_in_seconds}
            )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to reach AssemblyAI: {e}")

    if response.status_code >= 400:
        try:
            err_json = response.json()
        except Exception:
            err_json = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=err_json)

    return response.json()


# Helper functions for session management
async def add_connection_to_session(session_id: str, websocket: WebSocket, user_id: str):
    """Add a WebSocket connection to a session"""
    if session_id not in active_sessions:
        active_sessions[session_id] = set()
        session_metadata[session_id] = {
            "created_at": now_utc().isoformat(),
            "paragraph_counter": 0,
        }
        # Initialize text buffer for this session
        session_text_buffers[session_id] = ""
    
    active_sessions[session_id].add(websocket)
    print(f"User {user_id} joined session {session_id}. Total connections: {len(active_sessions[session_id])}")

async def remove_connection_from_session(session_id: str, websocket: WebSocket, user_id: str):
    """Remove a WebSocket connection from a session"""
    if session_id in active_sessions:
        active_sessions[session_id].discard(websocket)
        if len(active_sessions[session_id]) == 0:
            # Clean up empty session
            del active_sessions[session_id]
            del session_metadata[session_id]
            
            # Clean up text buffer and timer
            if session_id in session_text_buffers:
                del session_text_buffers[session_id]
            if session_id in session_buffer_timers:
                session_buffer_timers[session_id].cancel()
                del session_buffer_timers[session_id]
                
            print(f"Session {session_id} cleaned up - no active connections")
        else:
            print(f"User {user_id} left session {session_id}. Remaining connections: {len(active_sessions[session_id])}")

async def broadcast_to_session(session_id: str, message: dict, exclude_websocket: Optional[WebSocket] = None):
    """Broadcast a message to all connections in a session"""
    if session_id not in active_sessions:
        return
    
    # Create list of websockets to avoid set modification during iteration
    websockets_to_send = list(active_sessions[session_id])
    if exclude_websocket:
        websockets_to_send = [ws for ws in websockets_to_send if ws != exclude_websocket]
    
    # Send to all connections, removing any that are closed
    disconnected = []
    for websocket in websockets_to_send:
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"Failed to send to websocket: {e}")
            disconnected.append(websocket)
    
    # Clean up disconnected websockets
    for ws in disconnected:
        active_sessions[session_id].discard(ws)

def split_into_sentences(text: str) -> list[str]:
    """Split text into sentences for verse formatting"""
    import re
    if not text.strip():
        return []
    
    # Simple sentence splitting - matches the React app expectation
    sentences = re.split(r'[.!?]+', text)
    return [s.strip() for s in sentences if s.strip()]

async def start_buffer_timer(session_id: str):
    """Start a timer to process accumulated text after TEXT_BUFFER_SECONDS"""
    # Cancel any existing timer for this session
    if session_id in session_buffer_timers:
        session_buffer_timers[session_id].cancel()
    
    # Create new timer task
    async def timer_task():
        try:
            await asyncio.sleep(TEXT_BUFFER_SECONDS)
            await process_buffered_text(session_id)
        except asyncio.CancelledError:
            pass  # Timer was cancelled, which is fine
    
    session_buffer_timers[session_id] = asyncio.create_task(timer_task())

async def process_buffered_text(session_id: str):
    """Process accumulated text buffer and send for AI refinement"""
    if session_id not in session_text_buffers:
        return
    
    buffered_text = session_text_buffers[session_id].strip()
    if not buffered_text:
        return
    
    # Clear the buffer since we're processing it
    session_text_buffers[session_id] = ""
    
    # Remove this session's timer since it completed
    if session_id in session_buffer_timers:
        del session_buffer_timers[session_id]
    
    # Get metadata for paragraph numbering
    metadata = session_metadata.get(session_id, {})
    metadata["paragraph_counter"] = metadata.get("paragraph_counter", 0) + 1
    
    # Send buffered text completion message
    buffered_message = {
        "type": "text_buffer_complete",
        "data": {
            "session_id": session_id,
            "paragraph_number": metadata["paragraph_counter"],
            "buffered_text": buffered_text,
            "completed_at": now_utc().isoformat()
        }
    }
    
    # Broadcast the buffered text
    await broadcast_to_session(session_id, buffered_message)
    print(f"Session {session_id}: Sent buffered text ({len(buffered_text)} chars) for paragraph {metadata['paragraph_counter']}")
    
    # Fire-and-forget: refine with AI and broadcast when ready
    asyncio.create_task(refine_and_broadcast_paragraph(session_id, buffered_message["data"]))

async def setup_assemblyai_session(session_id: str, sample_rate: int) -> websockets.WebSocketClientProtocol:
    """Setup AssemblyAI v3 Universal-Streaming WebSocket connection for a session"""
    if not ASSEMBLYAI_API_KEY:
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
        "Authorization": ASSEMBLYAI_API_KEY
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
    """Listen for messages from AssemblyAI WebSocket"""
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
    """Handle messages from AssemblyAI WebSocket"""
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
        await broadcast_to_session(session_id, live_message)
        
        # For final turns, add to text buffer for AI processing
        if end_of_turn and (turn_is_formatted or "turn_is_formatted" in data):
            # Add text to session buffer
            if session_id not in session_text_buffers:
                session_text_buffers[session_id] = ""
            
            # Add space if buffer already has content
            if session_text_buffers[session_id]:
                session_text_buffers[session_id] += " "
            session_text_buffers[session_id] += transcript_text
            
            print(f"Session {session_id}: Added to buffer (now {len(session_text_buffers[session_id])} chars)")
            
            # Start/restart the buffer timer
            await start_buffer_timer(session_id)
    
    elif msg_type == "Termination":
        audio_duration = data.get("audio_duration_seconds", 0)
        print(f"AssemblyAI session terminated for {session_id}: {audio_duration}s audio")
        
        # Process any remaining buffered text
        if session_id in session_text_buffers and session_text_buffers[session_id].strip():
            await process_buffered_text(session_id)
        
    else:
        # Handle errors or unknown message types
        print(f"Unknown AssemblyAI message type for {session_id}: {data}")
        
        if "error" in data:
            error_message = {
                "type": "error",
                "message": f"Transcription error: {data.get('error', 'Unknown error')}"
            }
            await broadcast_to_session(session_id, error_message)

async def refine_and_broadcast_paragraph(session_id: str, paragraph_data: dict) -> None:
    """Send paragraph verses to AssemblyAI LeMUR to refine into a clean paragraph, then broadcast."""
    try:
        # Throttle per session to avoid hitting rate limits
        now = now_utc()
        last_call = paragraphizer_last_call_at.get(session_id)
        if last_call is not None:
            delta = (now - last_call).total_seconds()
            if delta < PARAGRAPHIZER_COOLDOWN_SECONDS:
                delay = PARAGRAPHIZER_COOLDOWN_SECONDS - delta
                print(f"Paragraphizer cooling down {delay:.1f}s for session {session_id}")
                asyncio.create_task(_refine_after_delay(session_id, paragraph_data, delay))
                return

        # Get buffered text directly (new approach) or fall back to verses (legacy)
        text = paragraph_data.get("buffered_text", "")
        if not text:
            # Legacy fallback for any remaining verse-based messages
            verses = paragraph_data.get("verses", [])
            text = "\n".join(v.get("text", "") for v in verses)
        if not text:
            return

        refined_text = None

        # Neutral instruction: no formatting/rewriting beyond grouping
        instruction = (
            "Group the provided lines into coherent paragraphs. "
            "Do not change, add, or remove any words or characters from the input. "
            "Return only the same text, with paragraph breaks inserted where appropriate."
        )

        if PARAGRAPHIZER_PROVIDER == "gemini":
            # Use Google Gemini
            if not GOOGLE_API_KEY:
                print("Gemini selected but GOOGLE_API_KEY not configured; skipping refinement")
            else:
                try:
                    model = genai.GenerativeModel(PARAGRAPHIZER_MODEL)
                    
                    # Create the prompt for Gemini
                    prompt = f"""Task: {instruction}

Text to organize:
{text}

Please return only the reorganized text with appropriate paragraph breaks."""

                    response = model.generate_content(
                        prompt,
                        generation_config=genai.types.GenerationConfig(
                            temperature=0.1,
                            max_output_tokens=2000,
                        )
                    )
                    
                    if response.text:
                        refined_text = response.text.strip()
                    else:
                        print(f"Gemini returned empty response for session {session_id}")
                        
                except Exception as e:
                    print(f"Gemini API error for session {session_id}: {e}")
                    # Could implement retry logic here if needed

        elif PARAGRAPHIZER_PROVIDER == "http":
            if not PARAGRAPHIZER_HTTP_URL:
                print("Paragraphizer HTTP URL not configured; skipping refinement")
            else:
                headers = {"Content-Type": "application/json"}
                if PARAGRAPHIZER_HTTP_AUTH_HEADER:
                    # Expected format: "Authorization: Bearer xyz" or any header string "Header-Name: value"
                    try:
                        header_name, header_value = PARAGRAPHIZER_HTTP_AUTH_HEADER.split(":", 1)
                        headers[header_name.strip()] = header_value.strip()
                    except ValueError:
                        print("PARAGRAPHIZER_HTTP_AUTH_HEADER is malformed; expected 'Header-Name: value'")

                payload = {
                    "model": PARAGRAPHIZER_MODEL,
                    "instruction": instruction,
                    "text": text,
                    "session_id": session_id,
                    "paragraph_number": paragraph_data.get("paragraph_number")
                }

                async with httpx.AsyncClient(timeout=45) as client:
                    resp = await client.post(PARAGRAPHIZER_HTTP_URL, headers=headers, json=payload)
                    if resp.status_code == 429:
                        retry_after = resp.headers.get("Retry-After")
                        try:
                            backoff = float(retry_after)
                        except (TypeError, ValueError):
                            backoff = PARAGRAPHIZER_RETRY_BACKOFF_SECONDS
                        print(f"HTTP paragraphizer rate limited; retrying in {backoff}s")
                        asyncio.create_task(_refine_after_delay(session_id, paragraph_data, backoff))
                        return
                    if resp.status_code < 400:
                        data = resp.json()
                        refined_text = data.get("refined_text") or data.get("text") or data.get("response")
                    else:
                        print(f"HTTP paragraphizer failed ({resp.status_code}): {resp.text}")
        else:
            # Default to LeMUR
            url = "https://api.assemblyai.com/lemur/v3/generate/task"
            headers = {"Authorization": ASSEMBLYAI_API_KEY, "Content-Type": "application/json"}
            payload = {
                "final_model": PARAGRAPHIZER_MODEL,
                "input_text": text,
                "prompt": instruction,
                "temperature": 0,
                "max_output_size": 2000
            }

            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 429:
                    retry_after = resp.headers.get("Retry-After")
                    try:
                        backoff = float(retry_after)
                    except (TypeError, ValueError):
                        backoff = PARAGRAPHIZER_RETRY_BACKOFF_SECONDS
                    print(f"LeMUR rate limited; retrying in {backoff}s")
                    asyncio.create_task(_refine_after_delay(session_id, paragraph_data, backoff))
                    return
                if resp.status_code < 400:
                    data = resp.json()
                    refined_text = data.get("response") or data.get("responses") or data.get("result") or data.get("text")
                else:
                    print(f"LeMUR refine failed ({resp.status_code}): {resp.text}")

        # If refinement succeeded, broadcast paragraph_refined
        if refined_text and refined_text.strip():
            paragraphizer_last_call_at[session_id] = now
            refined_message = {
                "type": "paragraph_refined",
                "data": {
                    "session_id": session_id,
                    "paragraph_number": paragraph_data.get("paragraph_number"),
                    "refined_text": refined_text.strip(),
                    "completed_at": now_utc().isoformat()
                }
            }
            print(f"Session {session_id}: Broadcasting paragraph_refined {refined_message['data']['paragraph_number']}")
            await broadcast_to_session(session_id, refined_message)
    except Exception as e:
        print(f"Error refining paragraph with LeMUR: {e}")

async def _refine_after_delay(session_id: str, paragraph_data: dict, delay_seconds: float) -> None:
    try:
        await asyncio.sleep(max(0.0, delay_seconds))
        await refine_and_broadcast_paragraph(session_id, paragraph_data)
    except Exception as e:
        print(f"Error in delayed refine: {e}")

async def cleanup_assemblyai_session(session_id: str):
    """Cleanup AssemblyAI v3 WebSocket session"""
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
    """Forward audio chunk to AssemblyAI v3 WebSocket for real transcription"""
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
        await broadcast_to_session(session_id, error_message)


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str = Query(..., description="Session ID"),
    user_id: str = Query(..., description="User ID"),
    sample_rate: int = Query(16000, description="Audio sample rate"),
    encoding: str = Query("pcm_s16le", description="Audio encoding")
):
    """
    WebSocket endpoint for real-time audio transcription.
    
    Expected flow:
    1. React app connects with session_id, user_id, sample_rate, encoding
    2. Sends PCM16 audio chunks as binary WebSocket messages
    3. Receives JSON responses with transcription verses and completed paragraphs
    """
    await websocket.accept()
    
    try:
        # Add connection to session
        await add_connection_to_session(session_id, websocket, user_id)
        
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
        metadata = session_metadata.get(session_id, {})
        metadata["current_speaker"] = user_id
        
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": f"Connected to session {session_id} with real AssemblyAI transcription",
            "config": {
                "sample_rate": sample_rate,
                "encoding": encoding,
                "session_id": session_id,
                "user_id": user_id,
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
        await remove_connection_from_session(session_id, websocket, user_id)
        
        # Clean up AssemblyAI session if no more connections
        if session_id not in active_sessions or len(active_sessions[session_id]) == 0:
            await cleanup_assemblyai_session(session_id)
        
        print(f"WebSocket disconnected: session={session_id}, user={user_id}")


