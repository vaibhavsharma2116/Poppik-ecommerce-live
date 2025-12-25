-- Add product_shades column to offers table to store per-product selected shade mapping
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "product_shades" jsonb;
