# Recording Angel Service

A modern web application for enhancing church meetings by providing real-time transcription and congregation engagement tools using AI-powered speech recognition.

## Overview

The Recording Angel Service provides real-time transcription and engagement tools for various church roles:

- **Audience Members**: Follow along with live transcriptions and view meeting materials
- **Speakers**: Access timing cues and speaking aids
- **Leadership**: Manage meetings, track participation, and access analytics
- **Technical Staff**: Monitor transcription quality and manage sessions

## Project Structure

- **`vite-app/`** - Main React application (React Router 7)
- **`python-api/`** - Current working API (FastAPI + AssemblyAI)
- **`marketing/`** - Next.js marketing website
- **`go-api/`** - Future API implementation (development)
- `views/` - Legacy HTML mockups for reference

## Features

- Real-time audio transcription using AssemblyAI
- WebSocket-based live updates
- Session management and participant tracking
- Mobile-responsive React interface
- RESTful API with FastAPI

## Development

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+ and uv
- AssemblyAI API key

### Quick Start

1. **Start the API server:**
   ```bash
   cd python-api
   cp .env.example .env  # Add your AssemblyAI API key
   uv run fastapi dev app/main.py
   ```

2. **Start the React app:**
   ```bash
   cd vite-app
   npm install
   npm run dev
   ```

3. **Optional - Marketing site:**
   ```bash
   cd marketing
   npm install
   npm run dev
   ```

### Build Commands

See [AGENTS.md](AGENTS.md) for complete build, test, and lint commands.

## Tech Stack

- **Frontend**: React 19 + React Router 7 + Tailwind CSS
- **API**: FastAPI + AssemblyAI + WebSockets
- **Marketing**: Next.js 15
- **Future**: Go migration planned

## License

All rights reserved.
