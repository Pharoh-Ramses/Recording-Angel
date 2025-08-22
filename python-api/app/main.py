import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path


DOTENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=DOTENV_PATH, override=False)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")


app = FastAPI(title="Recording Angel Python API", version="0.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

    Frontend flow:
    1) POST here to get a short-lived token.
    2) Use that token with AssemblyAI's WebRTC client to start streaming.
    """
    if not ASSEMBLYAI_API_KEY:
        raise HTTPException(status_code=500, detail="ASSEMBLYAI_API_KEY is not set")

    # Prefer Universal-Streaming v3 token endpoint; fall back to legacy v2 if needed
    v3_url = "https://streaming.assemblyai.com/v3/token"
    v2_url = "https://api.assemblyai.com/v2/realtime/token"

    headers = {
        "authorization": ASSEMBLYAI_API_KEY,
        "content-type": "application/json",
    }
    expires_in = max(1, int(body.expires_in or 60))

    async def request_token(url: str):
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, read=10.0)) as client:
            # v3 expects JSON body { expires_in }; some docs show query params — JSON is safe for both
            return await client.post(url, headers=headers, json={"expires_in": expires_in})

    try:
        resp = await request_token(v3_url)
        if resp.status_code >= 400:
            # Try legacy once if v3 complains (e.g., region/feature gated)
            legacy_resp = await request_token(v2_url)
            resp = legacy_resp
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to reach AssemblyAI: {e}")

    if resp.status_code >= 400:
        try:
            err_json = resp.json()
        except Exception:
            err_json = {"message": resp.text}
        raise HTTPException(status_code=resp.status_code, detail=err_json)

    data = resp.json() or {}
    # Normalize response shape and add server-side expires_at for convenience
    if "token" not in data and "realtime_token" in data:
        data["token"] = data.get("realtime_token")
    data.setdefault("expires_in", expires_in)
    expires_at = now_utc() + timedelta(seconds=data["expires_in"]) 
    data["expires_at"] = expires_at.isoformat()
    return data


