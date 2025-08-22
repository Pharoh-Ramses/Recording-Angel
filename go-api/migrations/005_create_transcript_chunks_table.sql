-- Create transcript_chunks table
CREATE TABLE IF NOT EXISTS transcript_chunks (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  speaker_id INTEGER REFERENCES users(id),
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  start_time TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transcript_chunks_session_id ON transcript_chunks(session_id);
CREATE INDEX IF NOT EXISTS idx_transcript_chunks_speaker_id ON transcript_chunks(speaker_id);
CREATE INDEX IF NOT EXISTS idx_transcript_chunks_start_time ON transcript_chunks(start_time); 