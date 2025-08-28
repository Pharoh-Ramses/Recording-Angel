"""Recording Angel Python API - Main application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import config
from app.database import create_tables
from app.routers import health, webrtc, websocket, auth, sessions

# Create FastAPI application
app = FastAPI(
    title=config.TITLE,
    version=config.VERSION,
    description="Real-time audio transcription API with AI paragraph organization and simple API token authentication"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(webrtc.router)
app.include_router(websocket.router)


@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    # Create database tables
    create_tables()
    print("Database tables created/verified")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
