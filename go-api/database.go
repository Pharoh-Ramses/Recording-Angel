package main

import (
	"time"

	"github.com/google/uuid"
)

// Database operations for the new schema

// User operations
func CreateUser(user User) error {
	query := `
		INSERT INTO users (id, full_name, email, ward, stake, password, profile_picture, status, role, last_activity_date, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err := db.Exec(query, user.ID, user.FullName, user.Email, user.Ward, user.Stake,
		user.Password, user.ProfilePicture, user.Status, user.Role, user.LastActivityDate, user.CreatedAt)
	return err
}

func GetUserByID(id string) (*User, error) {
	query := `
		SELECT id, full_name, email, ward, stake, password, profile_picture, status, role, last_activity_date, created_at
		FROM users WHERE id = $1
	`
	var user User
	err := db.QueryRow(query, id).Scan(&user.ID, &user.FullName, &user.Email, &user.Ward, &user.Stake,
		&user.Password, &user.ProfilePicture, &user.Status, &user.Role, &user.LastActivityDate, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func GetUserByEmail(email string) (*User, error) {
	query := `
		SELECT id, full_name, email, ward, stake, password, profile_picture, status, role, last_activity_date, created_at
		FROM users WHERE email = $1
	`
	var user User
	err := db.QueryRow(query, email).Scan(&user.ID, &user.FullName, &user.Email, &user.Ward, &user.Stake,
		&user.Password, &user.ProfilePicture, &user.Status, &user.Role, &user.LastActivityDate, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Session operations
func CreateSession(session Session) error {
	query := `
		INSERT INTO sessions (id, code, host_id, created_at)
		VALUES ($1, $2, $3, $4)
	`
	_, err := db.Exec(query, session.ID, session.Code, session.HostID, session.CreatedAt)
	return err
}

func GetSessionByID(id string) (*Session, error) {
	query := `
		SELECT id, code, host_id, created_at, ended_at
		FROM sessions WHERE id = $1
	`
	var session Session
	err := db.QueryRow(query, id).Scan(&session.ID, &session.Code, &session.HostID, &session.CreatedAt, &session.EndedAt)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func GetSessionByCode(code string) (*Session, error) {
	query := `
		SELECT id, code, host_id, created_at, ended_at
		FROM sessions WHERE code = $1
	`
	var session Session
	err := db.QueryRow(query, code).Scan(&session.ID, &session.Code, &session.HostID, &session.CreatedAt, &session.EndedAt)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func EndSession(sessionID string) error {
	query := `
		UPDATE sessions SET ended_at = $1 WHERE id = $2
	`
	_, err := db.Exec(query, time.Now(), sessionID)
	return err
}

// Transcription operations
func CreateTranscription(transcription Transcription) error {
	query := `
		INSERT INTO transcriptions (id, session_id, text, language, timestamp, speaker_id)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := db.Exec(query, transcription.ID, transcription.SessionID, transcription.Text,
		transcription.Language, transcription.Timestamp, transcription.SpeakerID)
	return err
}

func GetTranscriptionsBySessionID(sessionID string) ([]Transcription, error) {
	query := `
		SELECT id, session_id, text, language, timestamp, speaker_id
		FROM transcriptions WHERE session_id = $1 ORDER BY timestamp ASC
	`
	rows, err := db.Query(query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transcriptions []Transcription
	for rows.Next() {
		var t Transcription
		err := rows.Scan(&t.ID, &t.SessionID, &t.Text, &t.Language, &t.Timestamp, &t.SpeakerID)
		if err != nil {
			return nil, err
		}
		transcriptions = append(transcriptions, t)
	}
	return transcriptions, nil
}

// Session participant operations
func AddSessionParticipant(participant SessionParticipant) error {
	query := `
		INSERT INTO session_participants (id, session_id, user_id, role)
		VALUES ($1, $2, $3, $4)
	`
	_, err := db.Exec(query, participant.ID, participant.SessionID, participant.UserID, participant.Role)
	return err
}

func GetSessionParticipants(sessionID string) ([]SessionParticipant, error) {
	query := `
		SELECT id, session_id, user_id, role
		FROM session_participants WHERE session_id = $1
	`
	rows, err := db.Query(query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var participants []SessionParticipant
	for rows.Next() {
		var p SessionParticipant
		err := rows.Scan(&p.ID, &p.SessionID, &p.UserID, &p.Role)
		if err != nil {
			return nil, err
		}
		participants = append(participants, p)
	}
	return participants, nil
}

// Translation operations
func CreateTranslation(translation Translation) error {
	query := `
		INSERT INTO translations (id, original_transcription_id, langage, translated_text, source_language, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := db.Exec(query, translation.ID, translation.OriginalTranscriptionID, translation.Language,
		translation.TranslatedText, translation.SourceLanguage, translation.CreatedAt)
	return err
}

func GetTranslationsByTranscriptionID(transcriptionID string) ([]Translation, error) {
	query := `
		SELECT id, original_transcription_id, langage, translated_text, source_language, created_at, update_at
		FROM translations WHERE original_transcription_id = $1
	`
	rows, err := db.Query(query, transcriptionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var translations []Translation
	for rows.Next() {
		var t Translation
		err := rows.Scan(&t.ID, &t.OriginalTranscriptionID, &t.Language, &t.TranslatedText,
			&t.SourceLanguage, &t.CreatedAt, &t.UpdatedAt)
		if err != nil {
			return nil, err
		}
		translations = append(translations, t)
	}
	return translations, nil
}

// Helper function to generate UUIDs
func GenerateUUID() string {
	return uuid.New().String()
}
