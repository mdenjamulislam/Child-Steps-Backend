
-- 2. User Profiles (Updated to reference Roles)
-- Updated profiles table referencing the roles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE RESTRICT NOT NULL, -- Forces every user to have a valid role
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- 3. Child Profile & Patient Management
CREATE TABLE public.children (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    blood_group VARCHAR(5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
-- 4. Daily Routine Logs
CREATE TABLE public.daily_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    log_date DATE DEFAULT CURRENT_DATE NOT NULL,
    sleep_hours DECIMAL(4,2),
    diet_details TEXT,
    mood VARCHAR(50),
    physical_activity_minutes INT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (child_id, log_date)
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
-- 5. Growth, Milestones & Catalog Management
-- Growth Records
CREATE TABLE public.growth_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    record_date DATE DEFAULT CURRENT_DATE NOT NULL,
    weight_kg DECIMAL(5,2),
    height_cm DECIMAL(5,2),
    head_circumference_cm DECIMAL(5,2),
    bmi DECIMAL(4,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Master Milestones (Managed by Admin/Manager/Staff)
CREATE TABLE public.milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_age_months INT NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('Cognitive', 'Motor Skills', 'Language', 'Social-Emotional'))
);

-- Junction table tracking child milestone achievements
CREATE TABLE public.child_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE NOT NULL,
    achieved_date DATE,
    status VARCHAR(50) DEFAULT 'in-progress' CHECK (status IN ('not-started', 'in-progress', 'achieved')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(child_id, milestone_id)
);

ALTER TABLE public.growth_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_milestones ENABLE ROW LEVEL SECURITY;
-- 6. Vaccination Systems
-- Master Vaccine List (Managed by Admin/Manager/Staff)
CREATE TABLE public.vaccines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    disease_prevented TEXT NOT NULL,
    recommended_age_months INT NOT NULL,
    dose_number INT DEFAULT 1
);

-- Child vaccination tracking
CREATE TABLE public.vaccination_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    vaccine_id UUID REFERENCES public.vaccines(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'administered', 'missed')),
    scheduled_date DATE NOT NULL,
    administered_date DATE,
    administered_by VARCHAR(255),
    notes TEXT,
    UNIQUE(child_id, vaccine_id)
);

ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;
-- 7. Educational Progress & Feedback
CREATE TABLE public.educational_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    grade_level VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    score_or_grade VARCHAR(20),
    teacher_feedback TEXT,
    logged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.educational_records ENABLE ROW LEVEL SECURITY;
-- 8. AI-Powered Suggestions (Skills & Careers)
-- Skill Development suggestions
CREATE TABLE public.child_skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    skill_name VARCHAR(150) NOT NULL,
    category VARCHAR(100) CHECK (category IN ('academic', 'artistic', 'athletic', 'social', 'technical')),
    status VARCHAR(50) DEFAULT 'suggested' CHECK (status IN ('suggested', 'learning', 'acquired')),
    ai_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Career Guidance
CREATE TABLE public.career_guidance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    recommended_path VARCHAR(255) NOT NULL,
    rationale TEXT,
    action_steps JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.child_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_guidance ENABLE ROW LEVEL SECURITY;
-- 9. System Notifications & Alerts
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('vaccine_reminder', 'milestone_alert', 'educational_update', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;