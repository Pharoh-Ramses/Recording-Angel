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
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/sashabaranov/go-openai"
)

var db *sql.DB

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Verse and Paragraph structures for real-time formatting
type Verse struct {
	VerseNumber int       `json:"verse_number"`
	Text        string    `json:"text"`
	Timestamp   time.Time `json:"timestamp"`
	SpeakerID   string    `json:"speaker_id"`
}

type ParagraphData struct {
	SessionID       string    `json:"session_id"`
	ParagraphNumber int       `json:"paragraph_number"`
	Verses          []Verse   `json:"verses"`
	CompletedAt     time.Time `json:"completed_at"`
}

type StreamingSession struct {
	SessionID       string
	UserID          string
	CurrentParagraph ParagraphData
	VerseNumber     int
	ParagraphNumber int
	LastActivity    time.Time
	SilenceStart    *time.Time
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
		log.Fatal("Error connecting to database:", dbErr)
	}

	// Test database connection
	err = db.Ping()
	if err != nil {
		log.Fatal("Error pinging database:", err)
	}
	log.Println("Database connection successful")

	// Setup router
	r := mux.NewRouter()

	// Health check
	r.HandleFunc("/health", handleHealthCheck).Methods("GET")

	// User routes
	r.HandleFunc("/api/users", handleCreateUser).Methods("POST")
	r.HandleFunc("/api/users/{id}", handleGetUser).Methods("GET")

	// Session routes
	r.HandleFunc("/api/sessions", handleCreateSession).Methods("POST")
	r.HandleFunc("/api/sessions/{id}", handleGetSession).Methods("GET")
	r.HandleFunc("/api/sessions/{id}/end", handleEndSession).Methods("POST")
	r.HandleFunc("/api/sessions/join", handleJoinSession).Methods("GET")

	// Transcription routes
	r.HandleFunc("/api/sessions/{sessionId}/transcriptions", handleCreateTranscription).Methods("POST")
	r.HandleFunc("/api/sessions/{sessionId}/transcriptions", handleGetTranscriptions).Methods("GET")

	// Participant routes
	r.HandleFunc("/api/sessions/{sessionId}/participants", handleAddParticipant).Methods("POST")
	r.HandleFunc("/api/sessions/{sessionId}/participants", handleGetParticipants).Methods("GET")

	// Translation routes
	r.HandleFunc("/api/transcriptions/{transcriptionId}/translations", handleCreateTranslation).Methods("POST")
	r.HandleFunc("/api/transcriptions/{transcriptionId}/translations", handleGetTranslations).Methods("GET")

	// WebSocket route for real-time transcription with verse formatting
	r.HandleFunc("/ws", handleWebSocket)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on port %s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

// Health check handler
func handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"time":   time.Now().String(),
	})
}

// WebSocket handler for real-time transcription with verse formatting
func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("error upgrading websocket:", err)
		return
	}
	defer conn.Close()

	sessionID := r.URL.Query().Get("session_id")
	userID := r.URL.Query().Get("user_id")
	
	if sessionID == "" || userID == "" {
		log.Println("session_id and user_id required for websocket connection")
		return
	}

	log.Printf("WebSocket connection established for session %s, user %s\n", sessionID, userID)

	// Initialize streaming session
	streamSession := &StreamingSession{
		SessionID:       sessionID,
		UserID:          userID,
		VerseNumber:     1,
		ParagraphNumber: 1,
		LastActivity:    time.Now(),
		CurrentParagraph: ParagraphData{
			SessionID:       sessionID,
			ParagraphNumber: 1,
			Verses:          []Verse{},
		},
	}

	// Process incoming audio chunks
	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			log.Println("error reading websocket message:", err)
			break
		}

		if messageType == websocket.BinaryMessage {
			// Check for silence (empty or very small audio chunk)
			if len(p) < 1024 { // Threshold for silence detection
				handleSilence(streamSession, conn)
				continue
			}

			// Process audio chunk
			text, err := processAudioChunk(p)
			if err != nil {
				log.Println("error processing audio chunk:", err)
				continue
			}

			// Skip if no meaningful text
			if len(strings.TrimSpace(text)) < 3 {
				continue
			}

			// Process the transcribed text into verses
			err = processTranscribedText(streamSession, text, conn)
			if err != nil {
				log.Println("error processing transcribed text:", err)
			}

			streamSession.LastActivity = time.Now()
			streamSession.SilenceStart = nil
		}
	}

	// Save any remaining paragraph when connection closes
	if len(streamSession.CurrentParagraph.Verses) > 0 {
		saveParagraphToDatabase(streamSession)
	}

	log.Printf("WebSocket connection closed for session %s\n", sessionID)
}

func handleSilence(session *StreamingSession, conn *websocket.Conn) {
	now := time.Now()
	
	// Start tracking silence
	if session.SilenceStart == nil {
		session.SilenceStart = &now
		return
	}
	
	// Check if silence has lasted long enough to trigger paragraph break
	silenceDuration := now.Sub(*session.SilenceStart)
	if silenceDuration > 2*time.Second && len(session.CurrentParagraph.Verses) > 0 {
		// Complete current paragraph
		session.CurrentParagraph.CompletedAt = now
		
		// Save to database
		err := saveParagraphToDatabase(session)
		if err != nil {
			log.Println("error saving paragraph to database:", err)
		}
		
		// Send complete paragraph to client
		err = conn.WriteJSON(map[string]interface{}{
			"type": "paragraph_complete",
			"data": session.CurrentParagraph,
		})
		if err != nil {
			log.Println("error sending paragraph to client:", err)
		}
		
		log.Printf("Paragraph %d completed with %d verses", 
			session.CurrentParagraph.ParagraphNumber, 
			len(session.CurrentParagraph.Verses))
		
		// Start new paragraph
		session.ParagraphNumber++
		session.CurrentParagraph = ParagraphData{
			SessionID:       session.SessionID,
			ParagraphNumber: session.ParagraphNumber,
			Verses:          []Verse{},
		}
		
		session.SilenceStart = nil
	}
}

func processTranscribedText(session *StreamingSession, text string, conn *websocket.Conn) error {
	// Split text into sentences (verses)
	sentences := splitIntoSentences(text)
	
	for _, sentence := range sentences {
		if len(strings.TrimSpace(sentence)) == 0 {
			continue
		}
		
		// Create verse
		verse := Verse{
			VerseNumber: session.VerseNumber,
			Text:        strings.TrimSpace(sentence),
			Timestamp:   time.Now(),
			SpeakerID:   session.UserID,
		}
		
		// Add to current paragraph
		session.CurrentParagraph.Verses = append(session.CurrentParagraph.Verses, verse)
		session.VerseNumber++
		
		// Send verse to client in real-time
		err := conn.WriteJSON(map[string]interface{}{
			"type": "verse",
			"data": verse,
		})
		if err != nil {
			return err
		}
		
		log.Printf("Verse %d: %s", verse.VerseNumber, verse.Text)
	}
	
	return nil
}

func saveParagraphToDatabase(session *StreamingSession) error {
	// Convert paragraph to JSON for storage
	jsonData, err := json.Marshal(session.CurrentParagraph)
	if err != nil {
		return err
	}
	
	// Create transcription record
	transcription := Transcription{
		ID:        GenerateUUID(),
		SessionID: session.SessionID,
		Text:      string(jsonData),
		Language:  "en",
		Timestamp: session.CurrentParagraph.CompletedAt,
		SpeakerID: session.UserID,
	}
	
	return CreateTranscription(transcription)
}

func splitIntoSentences(text string) []string {
	// Simple sentence splitting
	sentences := strings.FieldsFunc(text, func(c rune) bool {
		return c == '.' || c == '!' || c == '?'
	})
	
	var result []string
	for _, sentence := range sentences {
		cleaned := strings.TrimSpace(sentence)
		if len(cleaned) > 0 {
			if !strings.HasSuffix(cleaned, ".") && !strings.HasSuffix(cleaned, "!") && !strings.HasSuffix(cleaned, "?") {
				cleaned += "."
			}
			result = append(result, cleaned)
		}
	}
	return result
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
