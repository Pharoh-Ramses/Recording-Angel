# Simple API Token Authentication Implementation

This document outlines the changes made to implement simple API token authentication, making the Python API and Vite app independent.

## Changes Made

### Python API Changes

1. **Updated Configuration** (`python-api/app/config.py`)
   - Added `API_TOKEN` configuration
   - Added validation warning if API token is not set

2. **Simplified Authentication** (`python-api/app/auth.py`)
   - Replaced complex JWT authentication with simple API token validation
   - Removed user management, password hashing, and JWT token handling
   - Added `verify_api_token()` and `require_api_token()` functions

3. **Updated Auth Router** (`python-api/app/routers/auth.py`)
   - Removed all JWT-based endpoints (register, login, refresh, logout, etc.)
   - Added simple health check endpoint

4. **Updated Sessions Router** (`python-api/app/routers/sessions.py`)
   - Replaced JWT user authentication with API token authentication
   - Removed user-specific access controls
   - Simplified session management (no user role checks)

5. **Updated WebSocket Router** (`python-api/app/routers/websocket.py`)
   - Changed from JWT token to API token authentication
   - Removed user validation and role-based access controls
   - Simplified connection validation

6. **Updated WebRTC Router** (`python-api/app/routers/webrtc.py`)
   - Added API token authentication

7. **Updated Main App** (`python-api/app/main.py`)
   - Removed users router
   - Updated description to reflect simple API token authentication

8. **Updated Environment Example** (`python-api/env.example`)
   - Added `API_TOKEN` environment variable

### Vite App Changes

1. **Created API Client** (`vite-app/app/lib/api-client.ts`)
   - Simple HTTP client for making authenticated API requests
   - Uses API token from environment variables

2. **Created Configuration** (`vite-app/app/config.ts`)
   - Centralized configuration for API URLs and tokens

3. **Updated WebSocket Hook** (`vite-app/app/hooks/useWebSocketTranscription.ts`)
   - Changed from JWT token to API token authentication
   - Uses centralized configuration

4. **Removed Webhook System**
   - Deleted `vite-app/app/routes/api/webhooks.ts`
   - Deleted `vite-app/app/lib/webhooks/sync.ts`

5. **Removed Database Dependencies**
   - Deleted `vite-app/app/lib/db/schema.ts`
   - Deleted `vite-app/drizzle.config.ts`
   - Removed database-related dependencies from `package.json`

## Environment Setup

### Python API (.env)
```bash
# API Keys
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# Simple API token for client authentication
API_TOKEN=your-api-token-here

# ... other existing config
```

### Vite App (.env)
```bash
# API Configuration
VITE_API_TOKEN=your-api-token-here
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
```

## Usage

### Making API Calls from Vite App
```typescript
import { apiClient } from '~/lib/api-client';

// GET request
const sessions = await apiClient.get('/api/sessions');

// POST request
const newSession = await apiClient.post('/api/sessions', {
  code: 'ABC123',
  host_id: 'user123',
  // ... other session data
});
```

### WebSocket Connection
The WebSocket connection automatically includes the API token:
```typescript
const { connectionStatus, sendAudio } = useWebSocketTranscription({
  sessionId: 'session123',
  userId: 'user123',
  // API token is automatically included from config
});
```

## Benefits

1. **Simplified Architecture**: No complex JWT token management
2. **Independent Services**: API and client are completely independent
3. **Easy Configuration**: Single API token for all authentication
4. **Reduced Complexity**: Removed user management, webhooks, and database sync
5. **Clerk Integration**: Vite app can use Clerk for user authentication while API uses simple token

## Security Notes

- The API token should be kept secure and not exposed in client-side code
- In production, consider using environment-specific tokens
- The API token provides full access to the API - treat it like a master key
