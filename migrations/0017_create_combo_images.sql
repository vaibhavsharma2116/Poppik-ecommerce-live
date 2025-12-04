-- Create combo_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS combo_images (
  id SERIAL PRIMARY KEY,
  combo_id INTEGER NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create index for combo_id for faster queries
CREATE INDEX IF NOT EXISTS combo_images_combo_id_idx ON combo_images(combo_id);
