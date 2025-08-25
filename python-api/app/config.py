"""Configuration management for Recording Angel API."""

import os
from pathlib import Path
from typing import Literal

import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
DOTENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=DOTENV_PATH, override=False)


class Config:
    """Application configuration."""
    
    # API Keys
    ASSEMBLYAI_API_KEY: str = os.getenv("ASSEMBLYAI_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    
    # Paragraphizer configuration
    PARAGRAPHIZER_PROVIDER: Literal["lemur", "http", "gemini"] = os.getenv(
        "PARAGRAPHIZER_PROVIDER", "gemini"
    ).lower()
    PARAGRAPHIZER_HTTP_URL: str = os.getenv("PARAGRAPHIZER_HTTP_URL", "")
    PARAGRAPHIZER_HTTP_AUTH_HEADER: str = os.getenv("PARAGRAPHIZER_HTTP_AUTH_HEADER", "")
    PARAGRAPHIZER_MODEL: str = os.getenv("PARAGRAPHIZER_MODEL", "gemini-2.0-flash-exp")
    PARAGRAPHIZER_COOLDOWN_SECONDS: int = int(os.getenv("PARAGRAPHIZER_COOLDOWN_SECONDS", "5"))
    PARAGRAPHIZER_RETRY_BACKOFF_SECONDS: int = int(os.getenv("PARAGRAPHIZER_RETRY_BACKOFF_SECONDS", "10"))
    
    # Text buffering configuration
    TEXT_BUFFER_SECONDS: int = 10
    
    # FastAPI configuration
    TITLE: str = "Recording Angel Python API"
    VERSION: str = "0.1.0"
    
    def __post_init__(self) -> None:
        """Post-initialization validation and setup."""
        self._validate_keys()
        self._configure_ai_providers()
    
    def _validate_keys(self) -> None:
        """Validate required API keys."""
        if not self.ASSEMBLYAI_API_KEY:
            print("Warning: ASSEMBLYAI_API_KEY not set")
        
        if self.PARAGRAPHIZER_PROVIDER == "gemini" and not self.GOOGLE_API_KEY:
            print("Warning: GOOGLE_API_KEY not set but Gemini provider selected")
    
    def _configure_ai_providers(self) -> None:
        """Configure AI providers based on settings."""
        if self.PARAGRAPHIZER_PROVIDER == "gemini" and self.GOOGLE_API_KEY:
            genai.configure(api_key=self.GOOGLE_API_KEY)
            print(f"Gemini configured with model: {self.PARAGRAPHIZER_MODEL}")


# Global configuration instance
config = Config()
config.__post_init__()
