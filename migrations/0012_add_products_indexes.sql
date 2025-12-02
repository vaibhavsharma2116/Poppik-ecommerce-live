-- Migration: 0012_add_products_indexes.sql
-- Adds indexes to speed up /api/products queries and lookups

-- Index on created_at for ordering recent products
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);

-- Index on slug for fast lookups by slug
CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);

-- Case-insensitive index on name for searches
CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products (LOWER(name));

-- Indexes on category/subcategory to speed up category filters
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_category_subcategory ON products (category, subcategory);

-- Index on product_images.product_id to speed up image joins
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images (product_id);

-- Index on product_shades.product_id to speed up shade lookups
CREATE INDEX IF NOT EXISTS idx_product_shades_product_id ON product_shades (product_id);

-- Optional: index on price if you filter/sort by price frequently
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);

-- Note: For very large tables consider CREATE INDEX CONCURRENTLY or using a background job
-- If your migration runner wraps migrations in a transaction, CONCURRENTLY won't work.
