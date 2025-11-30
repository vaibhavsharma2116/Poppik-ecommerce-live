-- Migration: create admin_permissions table
-- Adds role-based permission table used by master-admin routes
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id SERIAL PRIMARY KEY,
    role varchar(30) NOT NULL,
    module varchar(50) NOT NULL,
    can_create boolean DEFAULT false,
    can_read boolean DEFAULT true,
    can_update boolean DEFAULT false,
    can_delete boolean DEFAULT false,
    can_export boolean DEFAULT false,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
);

-- Optional index for faster lookup by role
CREATE INDEX IF NOT EXISTS idx_admin_permissions_role ON public.admin_permissions (role);
