"""Health check router."""

from fastapi import APIRouter

from app.utils.time import now_utc

router = APIRouter()


@router.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "time": now_utc().isoformat()}
