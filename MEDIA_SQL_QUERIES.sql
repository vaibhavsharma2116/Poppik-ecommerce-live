-- Media Management - Useful SQL Queries
-- Admin Can Use These for Direct Database Operations

-- ==================== INSERT EXAMPLES ====================

-- Example 1: Insert a press release media
INSERT INTO media_links (
  title, 
  description, 
  image_url, 
  redirect_url, 
  category, 
  type, 
  is_active, 
  sort_order
) VALUES (
  'Press Release: New Product Launch',
  'Read about our exciting new product',
  'https://example.com/press-release.jpg',
  'https://example.com/press/product-launch',
  'press',
  'image',
  true,
  1
);

-- Example 2: Insert featured media with video
INSERT INTO media_links (
  title,
  description,
  image_url,
  video_url,
  redirect_url,
  category,
  type,
  is_active,
  sort_order
) VALUES (
  'Customer Testimonial Video',
  'See what our customers are saying',
  'https://example.com/testimonial-thumb.jpg',
  'https://example.com/testimonials/video1.mp4',
  'https://example.com/testimonials',
  'featured',
  'video',
  true,
  2
);

-- Example 3: Insert with validity dates
INSERT INTO media_links (
  title,
  image_url,
  redirect_url,
  category,
  valid_from,
  valid_until,
  is_active
) VALUES (
  'Limited Time Offer',
  'https://example.com/offer.jpg',
  'https://example.com/special-offer',
  'media',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '7 days',
  true
);

-- ==================== SELECT EXAMPLES ====================

-- Get all active media sorted by sort order
SELECT * FROM media_links 
WHERE is_active = true 
ORDER BY sort_order ASC, created_at DESC;

-- Get all media in a specific category
SELECT * FROM media_links 
WHERE category = 'press' 
AND is_active = true
ORDER BY created_at DESC;

-- Get top clicked media
SELECT id, title, click_count, created_at
FROM media_links
ORDER BY click_count DESC
LIMIT 10;

-- Get media with most clicks in last 30 days
SELECT 
  id, 
  title, 
  category,
  click_count,
  created_at
FROM media_links
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
ORDER BY click_count DESC;

-- Get all featured media
SELECT * FROM media_links
WHERE category = 'featured'
AND is_active = true;

-- Get all video content
SELECT * FROM media_links
WHERE type = 'video'
AND is_active = true;

-- Get media that expired (valid_until has passed)
SELECT * FROM media_links
WHERE valid_until IS NOT NULL
AND valid_until < CURRENT_TIMESTAMP
AND is_active = true;

-- Get media expiring soon (within 7 days)
SELECT * FROM media_links
WHERE valid_until IS NOT NULL
AND valid_until BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '7 days'
AND is_active = true;

-- Count media by category
SELECT category, COUNT(*) as total
FROM media_links
WHERE is_active = true
GROUP BY category;

-- Get average clicks per media
SELECT 
  category,
  AVG(click_count) as avg_clicks,
  MAX(click_count) as max_clicks,
  MIN(click_count) as min_clicks
FROM media_links
GROUP BY category;

-- ==================== UPDATE EXAMPLES ====================

-- Activate all media in a category
UPDATE media_links
SET is_active = true
WHERE category = 'featured';

-- Deactivate expired media
UPDATE media_links
SET is_active = false
WHERE valid_until IS NOT NULL
AND valid_until < CURRENT_TIMESTAMP;

-- Update sort order for specific media
UPDATE media_links
SET sort_order = 1, updated_at = CURRENT_TIMESTAMP
WHERE id = 5;

-- Batch update multiple sort orders
UPDATE media_links
SET sort_order = CASE
  WHEN id = 1 THEN 1
  WHEN id = 2 THEN 2
  WHEN id = 3 THEN 3
END,
updated_at = CURRENT_TIMESTAMP
WHERE id IN (1, 2, 3);

-- Reset click counts (for cleanup/testing)
UPDATE media_links
SET click_count = 0
WHERE category = 'media';

-- Update media with new image
UPDATE media_links
SET image_url = 'https://example.com/new-image.jpg',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 5;

-- Extend validity date by 7 days
UPDATE media_links
SET valid_until = valid_until + INTERVAL '7 days',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 5;

-- ==================== DELETE EXAMPLES ====================

-- Delete specific media
DELETE FROM media_links WHERE id = 5;

-- Delete all inactive media
DELETE FROM media_links WHERE is_active = false;

-- Delete expired media
DELETE FROM media_links
WHERE valid_until IS NOT NULL
AND valid_until < CURRENT_TIMESTAMP - INTERVAL '30 days';

-- Delete media with zero clicks
DELETE FROM media_links
WHERE click_count = 0
AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

-- ==================== ANALYTICS QUERIES ====================

-- Media engagement report
SELECT 
  id,
  title,
  category,
  click_count,
  created_at,
  updated_at,
  ROUND(100.0 * click_count / NULLIF((SELECT MAX(click_count) FROM media_links), 0), 2) as engagement_percentage
FROM media_links
ORDER BY click_count DESC;

-- Daily media clicks (if tracking timestamp was added)
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_media,
  SUM(click_count) as total_clicks,
  AVG(click_count) as avg_clicks
FROM media_links
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Media performance by type
SELECT 
  type,
  COUNT(*) as total_media,
  SUM(click_count) as total_clicks,
  AVG(click_count) as avg_clicks
FROM media_links
WHERE is_active = true
GROUP BY type;

-- Category performance
SELECT 
  category,
  COUNT(*) as total_media,
  SUM(click_count) as total_clicks,
  ROUND(AVG(click_count), 2) as avg_clicks,
  MIN(click_count) as min_clicks,
  MAX(click_count) as max_clicks
FROM media_links
GROUP BY category
ORDER BY total_clicks DESC;

-- Recently created media
SELECT 
  id,
  title,
  category,
  type,
  is_active,
  created_at
FROM media_links
ORDER BY created_at DESC
LIMIT 20;

-- Most viewed this week
SELECT 
  id,
  title,
  category,
  click_count,
  created_at
FROM media_links
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY click_count DESC;

-- ==================== MAINTENANCE QUERIES ====================

-- Check table size
SELECT 
  pg_size_pretty(pg_total_relation_size('media_links')) as table_size;

-- Check index sizes
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
WHERE tablename = 'media_links';

-- Verify foreign key constraints
SELECT 
  constraint_name,
  table_name,
  column_name,
  foreign_table_name
FROM information_schema.key_column_usage
WHERE table_name = 'media_links';

-- Check for missing indexes
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename = 'media_links'
ORDER BY indexname;

-- ==================== BULK OPERATIONS ====================

-- Import from another table
INSERT INTO media_links (title, image_url, redirect_url, category)
SELECT name, thumbnail_url, link_url, 'media'
FROM old_media_table
WHERE status = 'active';

-- Export active media
COPY (
  SELECT id, title, description, image_url, redirect_url, category, click_count
  FROM media_links
  WHERE is_active = true
  ORDER BY sort_order
)
TO '/tmp/media_export.csv' 
WITH (FORMAT csv, HEADER true);

-- Audit all changes
SELECT 
  id,
  title,
  created_at,
  updated_at,
  (updated_at - created_at) as time_since_creation,
  CASE 
    WHEN updated_at > created_at THEN 'Modified'
    ELSE 'Original'
  END as status
FROM media_links
ORDER BY updated_at DESC;

-- ==================== QUICK STATS ====================

-- Quick overview
SELECT 
  COUNT(*) as total_media,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_media,
  SUM(CASE WHEN is_active THEN 0 ELSE 1 END) as inactive_media,
  SUM(click_count) as total_clicks,
  ROUND(AVG(click_count), 2) as avg_clicks_per_media
FROM media_links;

-- Media health check
SELECT 
  'Total Media' as metric,
  COUNT(*) as value
FROM media_links

UNION ALL

SELECT 'Active' as metric, COUNT(*) as value
FROM media_links WHERE is_active = true

UNION ALL

SELECT 'Inactive' as metric, COUNT(*) as value
FROM media_links WHERE is_active = false

UNION ALL

SELECT 'With Video' as metric, COUNT(*) as value
FROM media_links WHERE video_url IS NOT NULL

UNION ALL

SELECT 'Total Clicks' as metric, SUM(click_count) as value
FROM media_links;

-- ==================== TROUBLESHOOTING ====================

-- Check for duplicate titles
SELECT title, COUNT(*) as count
FROM media_links
GROUP BY title
HAVING COUNT(*) > 1;

-- Find media without images
SELECT id, title, created_at
FROM media_links
WHERE image_url IS NULL OR image_url = '';

-- Find media without redirect URLs
SELECT id, title, created_at
FROM media_links
WHERE redirect_url IS NULL OR redirect_url = '';

-- Find orphaned records (if foreign key was added)
-- This depends on your schema - adjust as needed

-- Check data types and constraints
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'media_links'
ORDER BY ordinal_position;
