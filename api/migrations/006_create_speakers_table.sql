-- Create speakers table
CREATE TABLE IF NOT EXISTS speakers (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  topic VARCHAR(200),
  order_index INTEGER NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_speakers_session_id ON speakers(session_id);
CREATE INDEX IF NOT EXISTS idx_speakers_user_id ON speakers(user_id);
CREATE INDEX IF NOT EXISTS idx_speakers_order_index ON speakers(order_index);

-- Add trigger to update the updated_at timestamp
CREATE TRIGGER update_speakers_updated_at
BEFORE UPDATE ON speakers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 