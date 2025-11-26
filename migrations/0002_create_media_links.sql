-- Migration: Create media_links table for managing clickable media with redirect URLs
CREATE TABLE IF NOT EXISTS media_links (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  video_url TEXT,
  redirect_url TEXT NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'media',
  type VARCHAR(50) NOT NULL DEFAULT 'image',
  click_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_media_links_is_active ON media_links(is_active);
CREATE INDEX IF NOT EXISTS idx_media_links_category ON media_links(category);
CREATE INDEX IF NOT EXISTS idx_media_links_type ON media_links(type);
CREATE INDEX IF NOT EXISTS idx_media_links_sort_order ON media_links(sort_order);
CREATE INDEX IF NOT EXISTS idx_media_links_created_at ON media_links(created_at);

-- Add comments for documentation
COMMENT ON TABLE media_links IS 'Stores media items with clickable redirects for admin management';
COMMENT ON COLUMN media_links.title IS 'Title of the media item';
COMMENT ON COLUMN media_links.image_url IS 'URL to the image/thumbnail';
COMMENT ON COLUMN media_links.video_url IS 'Optional URL to video content';
COMMENT ON COLUMN media_links.redirect_url IS 'URL where users are redirected on click';
COMMENT ON COLUMN media_links.category IS 'Category classification (media, press, featured, news, etc.)';
COMMENT ON COLUMN media_links.type IS 'Type of media (image, video, carousel)';
COMMENT ON COLUMN media_links.click_count IS 'Number of times this media has been clicked';
COMMENT ON COLUMN media_links.is_active IS 'Whether this media is currently active/visible';
COMMENT ON COLUMN media_links.sort_order IS 'Display order in UI';
COMMENT ON COLUMN media_links.valid_from IS 'Media becomes active from this date';
COMMENT ON COLUMN media_links.valid_until IS 'Media becomes inactive after this date';
COMMENT ON COLUMN media_links.metadata IS 'Additional JSON metadata (alt_text, tags, etc.)';
