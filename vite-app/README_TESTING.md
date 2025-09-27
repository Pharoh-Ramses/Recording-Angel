# Vite App - Testing Setup

This guide shows how to test the vite-app with the simplified Python API.

## Prerequisites

1. **Python API Running**: Make sure the Python API is running on port 8080
   ```bash
   cd ../python-api
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
   ```

2. **Environment Variables**: The app is configured to connect to `ws://localhost:8080`

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Open Browser
Navigate to `http://localhost:5173` (or the port shown in terminal)

## What's Different in Testing Mode

### ✅ Simplified Authentication
- **No Clerk Authentication**: Bypassed for fast testing
- **No Login Required**: Direct access to transcription interface
- **Visual Indicator**: Yellow banner shows "Testing Mode" at the top

### ✅ API Integration
- **WebSocket URL**: `ws://localhost:8080` (Python API)
- **No API Token**: Authentication bypassed
- **Real Transcription**: AssemblyAI integration working
- **Real Translation**: Gemini 2.0 Flash translation working

### ✅ User Experience
- **Auto-generated IDs**: Session and user IDs created automatically
- **Direct Connection**: WebSocket connects immediately
- **Full Features**: Recording, transcription, translation all work

## Testing Features

### 1. **Basic Transcription**
- Click "Start Recording" to begin
- Speak into your microphone
- See live transcription appear in real-time
- Click "Stop" to end recording

### 2. **Translation Testing**
- Select a target language from the dropdown (e.g., Spanish)
- Enable "Show translation instead of original" toggle
- Start recording and speak
- See both original and translated text

### 3. **Display Modes**
- **Live Stream**: Real-time transcription as you speak
- **Paragraphs**: AI-organized paragraphs (updates every 10 seconds)

## Troubleshooting

### WebSocket Connection Issues
```bash
# Check if Python API is running
curl http://localhost:8080/health

# Check WebSocket connection
# Open browser dev tools → Network → WS tab
```

### Audio/Microphone Issues
- **Browser Permissions**: Allow microphone access when prompted
- **HTTPS Required**: Some browsers require HTTPS for microphone access
- **Audio Format**: Make sure your browser supports Web Audio API

### Translation Issues
```bash
# Test Gemini translation directly
cd ../python-api
python test_gemini.py
```

## Configuration

### Environment Variables (Optional)
Create a `.env.local` file in the vite-app directory:

```env
# WebSocket URL (default: ws://localhost:8080)
VITE_WS_URL=ws://localhost:8080

# API URL (not used in testing mode)
VITE_API_URL=http://localhost:8080
```

## Development Notes

### Files Modified for Testing
- `app/routes/home.tsx`: Removed RequireAuth wrapper
- `app/config.ts`: Updated WebSocket URL to port 8080
- `app/hooks/useWebSocketTranscription.ts`: Removed API token from connection

### Reverting to Production
To restore full authentication and production features:

1. **Restore Authentication**:
   ```tsx
   // In app/routes/home.tsx
   import { RequireAuth } from "../components/ProtectedRoute";
   import { useUser } from "@clerk/clerk-react";

   // Wrap component with RequireAuth
   <RequireAuth>
     <AudioTranscription ... />
   </RequireAuth>
   ```

2. **Restore API Token**:
   ```typescript
   // In app/hooks/useWebSocketTranscription.ts
   const wsUrl = `${serverUrl}/ws?...&api_token=${encodeURIComponent(config.apiToken)}`;
   ```

3. **Update Config**:
   ```typescript
   // In app/config.ts
   wsUrl: 'ws://localhost:8000', // Back to original port
   ```

## Next Steps

Once testing is complete, you can:

1. **Re-enable Authentication**: Restore Clerk integration
2. **Add Session Management**: Implement proper session handling
3. **Enable User Management**: Add user profiles and permissions
4. **Production Deployment**: Set up proper environment variables

The testing setup allows you to focus on core functionality without authentication overhead! 🚀