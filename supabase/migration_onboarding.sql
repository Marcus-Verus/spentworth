-- Migration: Add onboarding_completed to user_prefs
-- This adds a field to track whether users have completed the onboarding flow

-- Add the onboarding_completed column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_prefs' 
    AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE user_prefs 
    ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- For existing users who have the localStorage flag set, 
-- we'll default to false and let them see onboarding again once
-- (better safe than annoying)

