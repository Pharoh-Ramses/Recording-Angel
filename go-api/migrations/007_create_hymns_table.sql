-- Create hymns table
CREATE TABLE IF NOT EXISTS hymns (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  number INTEGER,
  title VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('opening', 'sacrament', 'intermediate', 'closing')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_hymns_session_id ON hymns(session_id);
CREATE INDEX IF NOT EXISTS idx_hymns_order_index ON hymns(order_index);

-- Add trigger to update the updated_at timestamp
CREATE TRIGGER update_hymns_updated_at
BEFORE UPDATE ON hymns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 