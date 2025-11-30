-- Migration: create admin_activity_logs table
-- Records admin actions performed in the admin dashboard
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id SERIAL PRIMARY KEY,
    admin_id integer NOT NULL,
    action varchar(100) NOT NULL,
    module varchar(50) NOT NULL,
    description text NOT NULL,
    target_type varchar(50),
    target_id integer,
    old_value jsonb,
    new_value jsonb,
    ip_address varchar(45),
    user_agent text,
    status varchar(20) DEFAULT 'success',
    created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON public.admin_activity_logs (admin_id);
