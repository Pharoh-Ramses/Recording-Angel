package main

import "time"

// Enums
type Status string

const (
	StatusPending  Status = "PENDING"
	StatusApproved Status = "APPROVED"
	StatusRejected Status = "REJECTED"
)

type Role string

const (
	RoleMember           Role = "MEMBER"
	RoleBishop           Role = "BISHOP"
	RoleStakePresident   Role = "STAKEPRESIDENT"
	RoleMissionary       Role = "MISSIONARY"
	RoleMissionPresident Role = "MISSIONPRESIDENT"
	RoleAdmin            Role = "ADMIN"
)

// Database structs matching the Drizzle schema
type User struct {
	ID               string    `json:"id" db:"id"`
	FullName         string    `json:"full_name" db:"full_name"`
	Email            string    `json:"email" db:"email"`
	Ward             int       `json:"ward" db:"ward"`
	Stake            int       `json:"stake" db:"stake"`
	Password         string    `json:"-" db:"password"`
	ProfilePicture   string    `json:"profile_picture" db:"profile_picture"`
	Status           Status    `json:"status" db:"status"`
	Role             Role      `json:"role" db:"role"`
	LastActivityDate time.Time `json:"last_activity_date" db:"last_activity_date"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}

type Session struct {
	ID        string     `json:"id" db:"id"`
	Code      string     `json:"code" db:"code"`
	HostID    string     `json:"host_id" db:"host_id"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	EndedAt   *time.Time `json:"ended_at" db:"ended_at"`
}

type Transcription struct {
	ID        string    `json:"id" db:"id"`
	SessionID string    `json:"session_id" db:"session_id"`
	Text      string    `json:"text" db:"text"`
	Language  string    `json:"language" db:"language"`
	Timestamp time.Time `json:"timestamp" db:"timestamp"`
	SpeakerID string    `json:"speaker_id" db:"speaker_id"`
}

type SessionParticipant struct {
	ID        string `json:"id" db:"id"`
	SessionID string `json:"session_id" db:"session_id"`
	UserID    string `json:"user_id" db:"user_id"`
	Role      Role   `json:"role" db:"role"`
}

type Translation struct {
	ID                     string     `json:"id" db:"id"`
	OriginalTranscriptionID string     `json:"original_transcription_id" db:"original_transcription_id"`
	Language               string     `json:"language" db:"langage"`
	TranslatedText         string     `json:"translated_text" db:"translated_text"`
	SourceLanguage         string     `json:"source_language" db:"source_language"`
	CreatedAt              time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt              *time.Time `json:"updated_at" db:"update_at"`
}
