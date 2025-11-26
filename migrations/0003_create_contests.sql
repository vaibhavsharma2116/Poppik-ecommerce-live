-- Create contests table
CREATE TABLE IF NOT EXISTS contests (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  content TEXT NOT NULL,
  image_url TEXT NOT NULL,
  banner_image_url TEXT,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  featured BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for slug and active status
CREATE INDEX idx_contests_slug ON contests(slug);
CREATE INDEX idx_contests_is_active ON contests(is_active);
CREATE INDEX idx_contests_valid_dates ON contests(valid_from, valid_until);
