-- Add promo and wallet discount tracking columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_discount INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS redeem_amount INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS affiliate_wallet_amount INTEGER DEFAULT 0;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_promo_code ON orders(promo_code);
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_code ON orders(affiliate_code);
