-- Create session_languages table
CREATE TABLE IF NOT EXISTS session_languages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL,
  language_name VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (session_id, language_code)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_session_languages_session_id ON session_languages(session_id);
CREATE INDEX IF NOT EXISTS idx_session_languages_language_code ON session_languages(language_code);

-- Add trigger to update the updated_at timestamp
CREATE TRIGGER update_session_languages_updated_at
BEFORE UPDATE ON session_languages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 