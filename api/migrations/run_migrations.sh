#!/bin/bash

# Get the absolute path to the api directory
API_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Load environment variables from the api directory's .env file
if [ -f "$API_DIR/.env" ]; then
  export $(cat "$API_DIR/.env" | grep -v '^#' | xargs)
else
  echo "Error: .env file not found in $API_DIR"
  exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable not set"
  echo "Please ensure DATABASE_URL is defined in $API_DIR/.env"
  exit 1
fi

# Run migrations in order
echo "Running database migrations..."

# Function to run a migration file
run_migration() {
  echo "Running migration: $1"
  psql "$DATABASE_URL" -f "$1"
  if [ $? -ne 0 ]; then
    echo "Error running migration: $1"
    exit 1
  fi
}

# Ensure we're in the migrations directory
cd "$(dirname "$0")"

# Run migrations in order
run_migration "001_create_stakes_table.sql"
run_migration "002_create_wards_table.sql"
# Note: users table already exists in the database
run_migration "004_create_enhanced_sessions_table.sql"
run_migration "005_create_transcript_chunks_table.sql"
run_migration "006_create_speakers_table.sql"
run_migration "007_create_hymns_table.sql"
run_migration "008_create_announcements_table.sql"
run_migration "009_create_session_languages_table.sql"

echo "All migrations completed successfully!" 