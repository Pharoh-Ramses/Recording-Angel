package main

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

// HTTP handlers for the new schema

// User handlers
func handleCreateUser(w http.ResponseWriter, r *http.Request) {
	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	user.ID = GenerateUUID()
	user.CreatedAt = time.Now()
	user.LastActivityDate = time.Now()

	if err := CreateUser(user); err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func handleGetUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["id"]

	user, err := GetUserByID(userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// Session handlers
func handleCreateSession(w http.ResponseWriter, r *http.Request) {
	var session Session
	if err := json.NewDecoder(r.Body).Decode(&session); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	session.ID = GenerateUUID()
	session.CreatedAt = time.Now()

	if err := CreateSession(session); err != nil {
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

func handleGetSession(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["id"]

	session, err := GetSessionByID(sessionID)
	if err != nil {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

func handleJoinSession(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Session code required", http.StatusBadRequest)
		return
	}

	session, err := GetSessionByCode(code)
	if err != nil {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

func handleEndSession(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["id"]

	if err := EndSession(sessionID); err != nil {
		http.Error(w, "Failed to end session", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "session ended"})
}

// Transcription handlers
func handleCreateTranscription(w http.ResponseWriter, r *http.Request) {
	var transcription Transcription
	if err := json.NewDecoder(r.Body).Decode(&transcription); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	transcription.ID = GenerateUUID()
	transcription.Timestamp = time.Now()

	if err := CreateTranscription(transcription); err != nil {
		http.Error(w, "Failed to create transcription", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transcription)
}

func handleGetTranscriptions(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionId"]

	transcriptions, err := GetTranscriptionsBySessionID(sessionID)
	if err != nil {
		http.Error(w, "Failed to get transcriptions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transcriptions)
}

// Session participant handlers
func handleAddParticipant(w http.ResponseWriter, r *http.Request) {
	var participant SessionParticipant
	if err := json.NewDecoder(r.Body).Decode(&participant); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	participant.ID = GenerateUUID()

	if err := AddSessionParticipant(participant); err != nil {
		http.Error(w, "Failed to add participant", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(participant)
}

func handleGetParticipants(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionId"]

	participants, err := GetSessionParticipants(sessionID)
	if err != nil {
		http.Error(w, "Failed to get participants", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(participants)
}

// Translation handlers
func handleCreateTranslation(w http.ResponseWriter, r *http.Request) {
	var translation Translation
	if err := json.NewDecoder(r.Body).Decode(&translation); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	translation.ID = GenerateUUID()
	translation.CreatedAt = time.Now()

	if err := CreateTranslation(translation); err != nil {
		http.Error(w, "Failed to create translation", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(translation)
}

func handleGetTranslations(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	transcriptionID := vars["transcriptionId"]

	translations, err := GetTranslationsByTranscriptionID(transcriptionID)
	if err != nil {
		http.Error(w, "Failed to get translations", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(translations)
}
