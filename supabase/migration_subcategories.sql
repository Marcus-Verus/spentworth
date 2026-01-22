-- Migration: Add subcategory support for hierarchical categorization
-- This enables "Dining > Fast Food" vs "Dining > Fine Dining" style categories

-- Add subcategory column to transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS subcategory text;

-- Add subcategory column to raw_transactions (for import preview)
ALTER TABLE raw_transactions 
ADD COLUMN IF NOT EXISTS subcategory text;

-- Add subcategory to transaction_overrides
ALTER TABLE transaction_overrides
ADD COLUMN IF NOT EXISTS override_subcategory text;

-- Add set_subcategory to merchant_rules
ALTER TABLE merchant_rules
ADD COLUMN IF NOT EXISTS set_subcategory text;

-- Create index for subcategory queries
CREATE INDEX IF NOT EXISTS idx_tx_user_subcategory ON transactions(user_id, category, subcategory);

-- Comment for documentation
COMMENT ON COLUMN transactions.subcategory IS 'Subcategory for hierarchical categorization (e.g., category=Dining, subcategory=Fast Food)';
COMMENT ON COLUMN raw_transactions.subcategory IS 'Subcategory assigned during import classification';
