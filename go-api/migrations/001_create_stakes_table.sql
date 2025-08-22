-- Create stakes table
CREATE TABLE IF NOT EXISTS stakes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  president_name VARCHAR(100),
  president_email VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stakes_name ON stakes(name);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stakes_updated_at
BEFORE UPDATE ON stakes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 