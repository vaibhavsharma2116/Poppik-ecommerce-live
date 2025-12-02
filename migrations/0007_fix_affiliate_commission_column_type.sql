-- Fix affiliate_commission column type in orders table
-- Change from integer to numeric(10,2) to properly store decimal values

ALTER TABLE orders 
  ALTER COLUMN affiliate_commission TYPE numeric(10,2) USING affiliate_commission::numeric(10,2),
  ALTER COLUMN affiliate_commission SET DEFAULT 0,
  ALTER COLUMN affiliate_commission SET NOT NULL;
