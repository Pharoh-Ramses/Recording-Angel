-- Create wards table
CREATE TABLE IF NOT EXISTS wards (
  id SERIAL PRIMARY KEY,
  stake_id INTEGER NOT NULL REFERENCES stakes(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  bishop_name VARCHAR(100),
  bishop_email VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (stake_id, name)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wards_stake_id ON wards(stake_id);
CREATE INDEX IF NOT EXISTS idx_wards_name ON wards(name);

-- Add trigger to update the updated_at timestamp
CREATE TRIGGER update_wards_updated_at
BEFORE UPDATE ON wards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 