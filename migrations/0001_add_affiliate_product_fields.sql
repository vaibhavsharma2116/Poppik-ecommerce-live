-- Migration: add affiliate fields to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS affiliate_commission numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_user_discount numeric(5,2) DEFAULT 0;

-- Optional: backfill values if you want to derive from global settings
-- UPDATE products SET affiliate_commission = 10.00 WHERE affiliate_commission IS NULL;

-- Note: run this migration using your DB migration tool (drizzle/psql etc.)
