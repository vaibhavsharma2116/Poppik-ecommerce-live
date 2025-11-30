-- Create system_settings table used by master-admin routes
-- Run this migration to ensure the table exists before the server queries it
CREATE TABLE IF NOT EXISTS public.system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(20) DEFAULT 'string',
  category VARCHAR(50) NOT NULL,
  description TEXT,
  is_editable BOOLEAN DEFAULT TRUE,
  last_modified_by INTEGER REFERENCES public.users(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL
);

-- Optional: small index on category for quick lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);
