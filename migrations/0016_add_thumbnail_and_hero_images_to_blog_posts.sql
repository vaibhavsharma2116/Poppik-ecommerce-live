-- Add thumbnail_url and hero_image_url columns to blog_posts table
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- Create indexes for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_blog_posts_thumbnail_url ON blog_posts(thumbnail_url);
CREATE INDEX IF NOT EXISTS idx_blog_posts_hero_image_url ON blog_posts(hero_image_url);
