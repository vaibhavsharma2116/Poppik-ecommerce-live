-- Migration 0015: Create admin_permissions table (if missing) and add affiliate columns to combos/offers

BEGIN;

-- Create admin_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(100) NOT NULL,
  module TEXT NOT NULL,
  can_create BOOLEAN DEFAULT FALSE,
  can_read BOOLEAN DEFAULT TRUE,
  can_update BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_export BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Add affiliate columns to combos table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='combos' AND column_name='affiliate_commission'
  ) THEN
    ALTER TABLE combos ADD COLUMN affiliate_commission NUMERIC(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='combos' AND column_name='affiliate_user_discount'
  ) THEN
    ALTER TABLE combos ADD COLUMN affiliate_user_discount NUMERIC(5,2) DEFAULT 0;
  END IF;
END$$;

-- Add affiliate columns to offers table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='offers' AND column_name='affiliate_commission'
  ) THEN
    ALTER TABLE offers ADD COLUMN affiliate_commission NUMERIC(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='offers' AND column_name='affiliate_user_discount'
  ) THEN
    ALTER TABLE offers ADD COLUMN affiliate_user_discount NUMERIC(5,2) DEFAULT 0;
  END IF;
END$$;

COMMIT;
