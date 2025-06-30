-- Drop the existing sessions table if it exists
DROP TABLE IF EXISTS transcript_chunks;
DROP TABLE IF EXISTS sessions;

-- Create enhanced sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  ward_id INTEGER NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  participants INTEGER DEFAULT 0,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_ward_id ON sessions(ward_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions(created_by);

-- Add trigger to update the updated_at timestamp
CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 