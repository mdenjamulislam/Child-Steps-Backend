-- Align an existing child_skills table with the skills API.
-- Safe to run after shema.sql when the table already exists.

ALTER TABLE public.child_skills
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

ALTER TABLE public.child_skills
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION public.set_child_skills_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS child_skills_updated_at ON public.child_skills;
CREATE TRIGGER child_skills_updated_at
  BEFORE UPDATE ON public.child_skills
  FOR EACH ROW EXECUTE FUNCTION public.set_child_skills_updated_at();