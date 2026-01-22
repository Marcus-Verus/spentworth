-- Migration: Add custom ticker and fallback rate settings
-- Run this SQL in Supabase SQL Editor

-- Add custom ticker column (allows any ticker symbol with premium Alpha Vantage API)
ALTER TABLE user_prefs ADD COLUMN IF NOT EXISTS custom_ticker text;

-- Add custom fallback annual return (default 7% = 0.07)
ALTER TABLE user_prefs ADD COLUMN IF NOT EXISTS fallback_annual_return numeric(5,4) NOT NULL DEFAULT 0.07;

-- Add comment explaining the columns
COMMENT ON COLUMN user_prefs.custom_ticker IS 'Custom ticker symbol (premium feature). When set, overrides default_ticker.';
COMMENT ON COLUMN user_prefs.fallback_annual_return IS 'Annual return rate to use when price data unavailable. Default 0.07 (7%).';
