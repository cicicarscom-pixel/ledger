-- Add zernio_profile_id column to social_accounts table
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS zernio_profile_id TEXT;
