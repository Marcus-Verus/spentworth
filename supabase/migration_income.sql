-- Add monthly_income column to user_prefs
-- Run this migration in Supabase SQL editor

ALTER TABLE user_prefs 
ADD COLUMN IF NOT EXISTS monthly_income numeric(12,2) DEFAULT NULL;

COMMENT ON COLUMN user_prefs.monthly_income IS 'User monthly income for savings rate calculation';

