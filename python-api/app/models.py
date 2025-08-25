"""Pydantic models for Recording Angel API."""

from typing import Optional
from pydantic import BaseModel


class TokenRequest(BaseModel):
    """Request model for WebRTC token creation."""
    expires_in: Optional[int] = 60  # Expiry in seconds
