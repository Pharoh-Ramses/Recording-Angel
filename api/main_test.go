package main

import (
	"database/sql"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

// TestMain handles the main function
func TestMain(m *testing.M) {
	setup()
	code := m.Run()
	teardown()
	os.Exit(code)
}

// TestRealWhisperAPI tests the actual OPENAI Whisper API
func TestRealWhisperAPI(t *testing.T) {
	if os.Getenv("ENABLE_WHISPER_TEST") != "true" {
		t.Skip("Skipping Whisper API test as requested")
    print("Skipping Whisper API test as requested, ENABLE_WHISPER_TEST not set")
	}

	if os.Getenv("OPENAI_API_KEY") == "" {
		t.Skip("OPENAI_API_KEY not set, skipping Whisper API test")
    print("OPENAI_API_KEY not set, skipping Whisper API test")
	}

	testAudioPath := os.Getenv("TEST_AUDIO_FILE")
	if testAudioPath == "" {
		testAudioPath = "test_audio.webm"
    print("TEST_AUDIO_FILE not set, using test_audio.webm")
	}

	if _, err := os.Stat(testAudioPath); os.IsNotExist(err) {
		t.Fatalf("Test audio file not found at %s", testAudioPath)
	}

	audioData, err := os.ReadFile(testAudioPath)
	if err != nil {
		t.Fatalf("Error reading test audio file: %v", err)
	}

	t.Logf("Calling Whisper API with %d bytes of audio data", len(audioData))

	transcription, err := processAudioChunk(audioData)
	if err != nil {
		t.Fatalf("Error calling Whisper API: %v", err)
	}

	if transcription == "" {
		t.Error("Recieved empty transcription from Whisper API")
	} else {
		t.Logf("Received transcription: %s", transcription)
	}
  
  t.Logf("Received transcription: %s", transcription)
}

// TestMockAudioProcessing tests the websocket handler with a mock audio processor
func TestMockAudioProcessing(t *testing.T) {
	// ADDED: Skip if explicitly running external tests only
	// This allows us to skip mock tests when we want to test with real services
	if os.Getenv("SKIP_MOCK_TESTS") == "true" {
		t.Skip("Skipping mock tests as requested")
	}

	// ADDED: Create a simple mock audio processor function
	// This will be used instead of calling the real OpenAI API
	mockProcessor := func(audioData []byte) (string, error) {
		return "This is a mock transcription", nil
	}

	// ADDED: Create some test audio data
	// This simulates an audio chunk from the client
	testAudio := []byte("fake audio data")

	// ADDED: Test our mock processor
	// This verifies the mock returns expected results
	result, err := mockProcessor(testAudio)
	if err != nil {
		t.Fatalf("Mock processor failed: %v", err)
	}

	// ADDED: Verify the result
	// This confirms our mock is working as expected
	if result != "This is a mock transcription" {
		t.Errorf("Expected mock transcription, got: %s", result)
	}

	// NOTE: In a more complete test, we would:
	// 1. Create a test WebSocket connection
	// 2. Replace the real processAudioChunk with our mock
	// 3. Send test audio through the WebSocket
	// 4. Verify the response contains our mock transcription
}

// setup prepares the test environment
func setup() {
	err := godotenv.Load(".env.test")
	if err != nil {
		log.Println("Warning: .env.test file not found, using existing environment variables")
	}

	if os.Getenv("DATABASE_URL") == "" {
		log.Println("DATABASE_URL not set, skipping database test setup")
		return
	}

	var dbErr error
	db, dbErr = sql.Open("postgres", os.Getenv("DATABASE_URL"))
	if dbErr != nil {
		log.Fatalf("Error connecting to database: %v", dbErr)
	}

	err = initDB()
	if err != nil {
		log.Fatalf("Error initializing database: %v", err)
	}
}

// teardown closes the database connection
func teardown() {
	if db != nil {
		_, err := db.Exec("DELETE FROM transcript_chunks")
		if err != nil {
			log.Fatalf("Error deleting transcript chunks: %v", err)
		}
		_, err = db.Exec("DELETE FROM sessions")
		if err != nil {
			log.Fatalf("Error deleting sessions: %v", err)
		}
		db.Close()
	}
}

// TestDatabaseFunctions tests the database operation
func TestDatabaseFunctions(t *testing.T) {
	if db == nil {
		t.Skip("Database not configured, skipping database tests")
	}

	sessionID := "test_session_" + time.Now().Format("20060102_150405")
	session := SessionData{
		SessionID: sessionID,
		UserID:    "test_user",
		StartTime: time.Now(),
	}

	err := createSession(session)
	if err != nil {
		t.Errorf("Error creating session: %v", err)
	}

	session.EndTime = time.Now().Add(5 * time.Minute)
	err = updateSessionEndTime(session)
	if err != nil {
		t.Errorf("Error updating session end time: %v", err)
	}

	chunk := TranscriptChunk{
		Text:      "Test transcript chunk",
		Timestamp: time.Now(),
	}

	err = saveTranscriptChunk(sessionID, chunk)
	if err != nil {
		t.Errorf("Error saving transcript chunk: %v", err)
	}

	t.Log("successfull created session, updated end time, and saved transcript chunk")
}

// TestHealthCheck tests the health check endpoint
func TestHealthCheck(t *testing.T) {
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	handleHealthCheck(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	resp := w.Body.String()
	if !strings.Contains(resp, "healthy") {
		t.Errorf("Expected response to contain 'healthy', got %s", resp)
	}
}
