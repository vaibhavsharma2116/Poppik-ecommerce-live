-- Remove affiliate_commission column from orders table
-- Commission will now be managed directly in affiliate_wallet and affiliate_transactions tables

ALTER TABLE orders 
  DROP COLUMN IF EXISTS affiliate_commission;
