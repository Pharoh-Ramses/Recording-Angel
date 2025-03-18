# Recording Angel Service

A real-time audio transcription & translation service built with Golang, OpenAI Whisper, and PostgreSQL.

## Overview

This project provides a backend system for capturing, processing, and transcribing and translating audio in real-time. It uses WebSockets for streaming audio data, OpenAI's Whisper API for speech-to-text conversion, and PostgreSQL for storing transcription results.

## Tech Stack

- **Backend**: Golang with Gorilla WebSocket
- **AI Services**: OpenAI Whisper API
- **Database**: PostgreSQL
- **Frontend** (planned): NextJS

## Features

- Real-time audio streaming via WebSockets
- Speech-to-text conversion using OpenAI Whisper
- Session management for tracking transcriptions
- Persistent storage of transcription data
- Health check endpoint for monitoring
- Comprehensive testing infrastructure

## Getting Started

### Prerequisites

- Go (1.16 or later)
- PostgreSQL database
- OpenAI API key
- Git

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/audio-transcription-service.git
   cd audio-transcription-service
   ```

2. Install dependencies:
   ```
   go mod download
   ```

3. Set up environment variables:
   Create a `.env` file with the following variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   POSTGRES_CONN_STR=postgres://username:password@localhost:5432/captioning_db
   ```

4. Initialize the database:
   ```
   psql -U postgres -c "CREATE DATABASE captioning_db;"
   ```
   (Note: You may need to create the necessary tables. Run the SQL scripts in the `/sql` directory if provided)

5. Start the server:
   ```
   go run main.go
   ```

## API Endpoints

### HTTP Endpoints

- `GET /health` - Health check endpoint

### WebSocket Endpoints

- `WS /ws` - WebSocket endpoint for audio streaming

## Project Structure

```
audio-transcription-service/
├── main.go                    # Application entry point
├── handlers/                  # HTTP and WebSocket handlers
├── models/                    # Data models
├── db/                        # Database operations
├── api/                       # External API integrations
├── config/                    # Configuration management
├── utils/                     # Utility functions
└── tests/                     # Tests
```

## Development

### Running Tests

```
go test ./...
```

### Building the Application

```
go build -o transcription-service
```

## Frontend Integration

For frontend development, a NextJS application is planned with the following features:
- Audio capture and streaming
- WebSocket client implementation
- Responsive caption display
- User interface for controls

To set up the frontend (when available):
1. Create a NextJS application:
   ```
   npx create-next-app captioning-client
   ```

2. Configure environment variables:
   Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_WS_URL=ws://localhost:8080
   BACKEND_URL=http://localhost:8080
   ```

## Future Enhancements

- User authentication
- Rate limiting for API calls
- Enhanced error reporting
- Logging and monitoring
- Performance optimizations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)
