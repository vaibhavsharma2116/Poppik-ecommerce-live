-- Create job_positions table
CREATE TABLE IF NOT EXISTS job_positions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  job_id VARCHAR(50) UNIQUE,
  experience_level VARCHAR(50) NOT NULL,
  work_experience VARCHAR(50) NOT NULL,
  education VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  about_role TEXT NOT NULL,
  responsibilities JSONB NOT NULL,
  requirements JSONB NOT NULL,
  skills JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create job_applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  position_id INTEGER NOT NULL REFERENCES job_positions(id) ON DELETE CASCADE,
  resume_url VARCHAR(500),
  cover_letter TEXT,
  experience_years INTEGER,
  current_company VARCHAR(200),
  linkedin_url VARCHAR(500),
  portfolio_url VARCHAR(500),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_positions_is_active ON job_positions(is_active);
CREATE INDEX IF NOT EXISTS idx_job_positions_department ON job_positions(department);
CREATE INDEX IF NOT EXISTS idx_job_positions_location ON job_positions(location);
CREATE INDEX IF NOT EXISTS idx_job_positions_slug ON job_positions(slug);
CREATE INDEX IF NOT EXISTS idx_job_applications_position_id ON job_applications(position_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_email ON job_applications(email);
