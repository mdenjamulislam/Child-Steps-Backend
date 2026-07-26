-- 1. Role-Based Access Control (RBAC) Foundation
-- Create roles table
CREATE TABLE public.roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'super_admin', 'admin', 'manager', 'staff', 'parent', 'teacher', 'guardian'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create permissions table
CREATE TABLE public.permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'manage_users', 'edit_vaccines', 'view_all_profiles', 'access_ai_logs'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for Role-Permission mapping (Many-to-Many)
CREATE TABLE public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);




-- Seed Roles
INSERT INTO public.roles (name, description) VALUES
('super_admin', 'Full system control, managing system admins, managers, and staff.'),
('admin', 'Access to application-wide configurations, reports, and user listings.'),
('manager', 'Oversees core templates such as milestone lists, vaccine guidelines, and staff operations.'),
('staff', 'Assists in content moderation, records management, and basic database updates.'),
('parent', 'End-user: Registers children, tracks growth, schedules vaccinations.'),
('teacher', 'End-user: Records educational scores and notes for linked children.'),
('guardian', 'End-user: Co-tracks child profile alongside primary parent.');

-- Seed Essential Permissions
INSERT INTO public.permissions (name, description) VALUES
('manage_roles', 'Ability to change user roles and assign access levels.'),
('manage_users', 'Ability to register, suspend, or delete user profiles.'),
('edit_system_catalogs', 'Ability to add or modify standard vaccines and milestone databases.'),
('view_system_logs', 'Ability to view backend analytical records and error tracking.');

-- Assign Permissions to Super Admin (using subqueries to match IDs)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'super_admin';

-- Assign Limited Permissions to Admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'admin' AND p.name IN ('manage_users', 'edit_system_catalogs');