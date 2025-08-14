# Recording Angel API Documentation

## Base URL
```
http://localhost:8090
```

## Authentication
Currently no authentication is required. All endpoints are publicly accessible.

## HTTP API Endpoints

### Health Check
```http
GET /health
```
Returns server status and timestamp.

**Response:**
```json
{
  "status": "healthy",
  "time": "2025-08-14 15:31:48.123456789 +0000 UTC"
}
```

### Users

#### Create User
```http
POST /api/users
Content-Type: application/json
```

**Request Body:**
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "ward": 1,
  "stake": 1,
  "password": "hashedpassword",
  "profile_picture": "avatar.jpg",
  "status": "PENDING",
  "role": "MEMBER"
}
```

**Response:** Returns created user with generated ID and timestamps.

#### Get User
```http
GET /api/users/{id}
```

### Sessions

#### Create Session
```http
POST /api/sessions
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "ABC123",
  "host_id": "user-uuid-here"
}
```

**Response:** Returns created session with generated ID.

#### Get Session
```http
GET /api/sessions/{id}
```

#### End Session
```http
POST /api/sessions/{id}/end
```

#### Join Session
```http
GET /api/sessions/join?code=ABC123
```

### Transcriptions

#### Create Transcription
```http
POST /api/sessions/{sessionId}/transcriptions
Content-Type: application/json
```

#### Get Transcriptions
```http
GET /api/sessions/{sessionId}/transcriptions
```

### Participants

#### Add Participant
```http
POST /api/sessions/{sessionId}/participants
Content-Type: application/json
```

#### Get Participants
```http
GET /api/sessions/{sessionId}/participants
```

### Translations

#### Create Translation
```http
POST /api/transcriptions/{transcriptionId}/translations
Content-Type: application/json
```

#### Get Translations
```http
GET /api/transcriptions/{transcriptionId}/translations
```

## WebSocket API

### Real-time Audio Transcription
```
ws://localhost:8090/ws?session_id={SESSION_ID}&user_id={USER_ID}
```

**Connection Parameters:**
- `session_id` (required): Session identifier
- `user_id` (required): User identifier

**Sending Audio Data:**
Send binary WebM audio chunks as WebSocket binary messages.

**Receiving Transcriptions:**
The server sends JSON messages with transcribed text:

#### Verse Message
```json
{
  "type": "verse",
  "data": {
    "verse_number": 1,
    "text": "This is a transcribed sentence.",
    "timestamp": "2025-08-14T15:31:48.123Z",
    "speaker_id": "user-uuid"
  }
}
```

#### Paragraph Complete Message
```json
{
  "type": "paragraph_complete",
  "data": {
    "session_id": "session-uuid",
    "paragraph_number": 1,
    "verses": [
      {
        "verse_number": 1,
        "text": "First sentence.",
        "timestamp": "2025-08-14T15:31:48.123Z",
        "speaker_id": "user-uuid"
      },
      {
        "verse_number": 2,
        "text": "Second sentence.",
        "timestamp": "2025-08-14T15:31:49.456Z",
        "speaker_id": "user-uuid"
      }
    ],
    "completed_at": "2025-08-14T15:31:50.789Z"
  }
}
```

## React Client Examples

### WebSocket Connection
```typescript
import { useEffect, useRef, useState } from 'react';

interface Verse {
  verse_number: number;
  text: string;
  timestamp: string;
  speaker_id: string;
}

interface Paragraph {
  session_id: string;
  paragraph_number: number;
  verses: Verse[];
  completed_at: string;
}

export function useAudioTranscription(sessionId: string, userId: string) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(
      `ws://localhost:8090/ws?session_id=${sessionId}&user_id=${userId}`
    );

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'verse') {
        setVerses(prev => [...prev, message.data]);
      } else if (message.type === 'paragraph_complete') {
        setParagraphs(prev => [...prev, message.data]);
        setVerses([]); // Clear verses for new paragraph
      }
    };

    return () => {
      ws.current?.close();
    };
  }, [sessionId, userId]);

  const sendAudio = (audioData: ArrayBuffer) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(audioData);
    }
  };

  return { verses, paragraphs, sendAudio };
}
```

### Audio Recording
```typescript
import { useRef, useState } from 'react';

export function useAudioRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async (onAudioData: (data: ArrayBuffer) => void) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      mediaRecorder.current.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const arrayBuffer = await event.data.arrayBuffer();
          onAudioData(arrayBuffer);
        }
      };

      // Send audio chunks every 1 second
      mediaRecorder.current.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  return { startRecording, stopRecording, isRecording };
}
```

### Complete Example Component
```typescript
import React from 'react';
import { useAudioTranscription } from './hooks/useAudioTranscription';
import { useAudioRecording } from './hooks/useAudioRecording';

export function TranscriptionView() {
  const sessionId = 'your-session-id';
  const userId = 'your-user-id';
  
  const { verses, paragraphs, sendAudio } = useAudioTranscription(sessionId, userId);
  const { startRecording, stopRecording, isRecording } = useAudioRecording();

  const handleStartRecording = () => {
    startRecording(sendAudio);
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <button
          onClick={isRecording ? stopRecording : handleStartRecording}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Current Verses</h3>
        {verses.map((verse) => (
          <p key={verse.verse_number} className="mb-1">
            {verse.verse_number}: {verse.text}
          </p>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Completed Paragraphs</h3>
        {paragraphs.map((paragraph) => (
          <div key={paragraph.paragraph_number} className="mb-4 p-3 border rounded">
            <h4 className="font-medium">Paragraph {paragraph.paragraph_number}</h4>
            {paragraph.verses.map((verse) => (
              <p key={verse.verse_number} className="text-sm">
                {verse.text}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Data Models

### User
```typescript
interface User {
  id: string;
  full_name: string;
  email: string;
  ward: number;
  stake: number;
  password: string; // Not returned in API responses
  profile_picture: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  role: 'MEMBER' | 'BISHOP' | 'STAKEPRESIDENT' | 'MISSIONARY' | 'MISSIONPRESIDENT' | 'ADMIN';
  last_activity_date: string;
  created_at: string;
}
```

### Session
```typescript
interface Session {
  id: string;
  code: string;
  host_id: string;
  created_at: string;
  ended_at: string | null;
}
```

### Transcription
```typescript
interface Transcription {
  id: string;
  session_id: string;
  text: string;
  language: string;
  timestamp: string;
  speaker_id: string;
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `400` - Bad Request (Invalid JSON, missing parameters)
- `404` - Not Found (User, session, etc. not found)
- `500` - Internal Server Error

WebSocket errors are logged on the server side. Connection issues should be handled with reconnection logic in the client.