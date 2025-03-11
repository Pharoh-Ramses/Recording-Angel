package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/sashabaranov/go-openai"
)

var db *sql.DB

type SessionData struct {
	SessionID string
	UserID    string
	StartTime time.Time
	EndTime   time.Time
}

type TranscriptChunk struct {
	Text      string    `json:"text"`
	Timestamp time.Time `json:"timestamp"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {

	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: Error loading .env file:", err)
	}

	// Connect to database
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("DATABASE_URL environment variable not set")
	}

	var dbErr error
	db, dbErr = sql.Open("postgres", connStr)
	if dbErr != nil {
		log.Fatal("Error connecting to database:", err)
	}

	// Test database connection
	err = db.Ping()
	if err != nil {
		log.Fatal("Error pinging database:", err)
	}
	log.Println("Database connection successful")

	// Initialize database tables
	err = initDB()
	if err != nil {
		log.Fatal("Error initializing database:", err)
	}

	// Setup http server
	http.HandleFunc("/health", handleHealthCheck)
	http.HandleFunc("ws", handleWebSocket)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on port %s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// initDB initializes the database tables
func initDB() error {
	// Create sessions table
	_, err := db.Exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      start_time timestamp NOT NULL,
      end_time timestamp
  )`)
	if err != nil {
		return err
	}

	// Create transcritps_chunks table
	_, err = db.Exec(`
    CREATE TABLE IF NOT EXISTS transcript_chunks (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(50) REFERENCES sessions(id),
      text text NOT NULL,
      start_time timestamp NOT NULL
  )`)
	return err

}

// Health check handler
func handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"time":   time.Now().String(),
	})
}

// WebSocket handler
func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("error upgrading websocket:", err)
		return
	}
	defer conn.Close()

	// Create a new session in the database
	sessionID := fmt.Sprintf("session_%d", time.Now().Unix())
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		userID = "anonymous"
	}

	session := SessionData{
		SessionID: sessionID,
		UserID:    userID,
		StartTime: time.Now(),
	}

	err = createSession(session)
	if err != nil {
		log.Println("error creating session:", err)
		return
	}

	log.Printf("WebSocket connection established for session %s\n", sessionID)

	// Process incoming audio chunks

	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			log.Println("error reading websocket message:", err)
			break
		}

		if messageType == websocket.BinaryMessage {
			// Process audio chunk
			text, err := processAudioChunk(p)
			if err != nil {
				log.Println("error processing audio chunk:", err)
				continue
			}

			// Store the transcript chunk
			chunk := TranscriptChunk{
				Text:      text,
				Timestamp: time.Now(),
			}

			// Save to database
			err = saveTranscriptChunk(sessionID, chunk)
			if err != nil {
				log.Println("error creating transcript chunk:", err)
			}

			// Send basck to client
			err = conn.WriteJSON(chunk)
			if err != nil {
				log.Println("error writing websocket message:", err)
				break
			}
		}
	}

	// End the session
	session.EndTime = time.Now()
	err = updateSessionEndTime(session)
	if err != nil {
		log.Println("error updating session end time:", err)
	}
	log.Printf("WebSocket connection closed for session %s\n", sessionID)
}

// Database functions

func createSession(session SessionData) error {
	query := `
    INSERT INTO sessions (id, user_id, start_time)
    VALUES ($1, $2, $3)
`
	_, err := db.Exec(query, session.SessionID, session.UserID, session.StartTime)
	return err
}

func updateSessionEndTime(session SessionData) error {
	query := `
    UPDATE sessions
    SET end_time = $1
    WHERE id = $2
  `
	_, err := db.Exec(query, session.EndTime, session.SessionID)
	return err
}

func saveTranscriptChunk(sessionId string, chunk TranscriptChunk) error {
	query := `
    INSERT INTO transcript_chunks (session_id, text, start_time)
    VALUES ($1, $2, $3)
  `
	_, err := db.Exec(query, sessionId, chunk.Text, chunk.Timestamp)
	return err
}

func processAudioChunk(audioData []byte) (string, error) {
	// Initialize OpenAI API client
	openaiKey := os.Getenv("OPENAI_API_KEY")
	if openaiKey == "" {
		return "", errors.New("OPENAI_API_KEY environment variable not set")
	}
	client := openai.NewClient(openaiKey)

	// Create a temporary audio file
	tmpFile, err := os.CreateTemp("", "audio-*.webm")
	if err != nil {
		return "", fmt.Errorf("error creating temp file: %w", err)
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	// Write audio data to temp file
	_, err = tmpFile.Write(audioData)
	if err != nil {
		return "", fmt.Errorf("error writing audio data to temp file: %w", err)
	}

	// Close file to flush changes before reading
	tmpFile.Close()

	// Create request to openai whisper api
	req := openai.AudioRequest{
		Model:    openai.Whisper1,
		FilePath: tmpFile.Name(),
	}

	// Set a timeout for the API Call

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Call the Whisper API

	resp, err := client.CreateTranscription(ctx, req)
	if err != nil {
		return "", fmt.Errorf("error calling whisper api: %w", err)
	}

	return resp.Text, nil
}
