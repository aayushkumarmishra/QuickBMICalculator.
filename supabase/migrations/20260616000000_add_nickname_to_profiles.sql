-- Add optional nickname column to tracker_profiles
ALTER TABLE tracker_profiles ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Update comment for clarity
COMMENT ON COLUMN tracker_profiles.nickname IS 'Optional identifier/nickname for the profile (e.g. Gym, Delhi, Younger)';
