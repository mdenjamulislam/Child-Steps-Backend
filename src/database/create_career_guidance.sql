-- -- Module 11: Career Development Guidance � Database Migration -----------------
-- Run this in your Supabase SQL Editor to create the public.career_guidance table.

DROP TABLE IF EXISTS public.career_guidance CASCADE;

CREATE TABLE public.career_guidance (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id          UUID          NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,

  -- AI-generated recommended career path (e.g., "Digital Arts & Design")
  recommended_path  TEXT          NOT NULL,

  -- AI rationale explaining why this path fits the child profile
  rationale         TEXT          NOT NULL,

  -- Array of structured action steps returned by the AI
  -- Each element: { "title": "...", "description": "...", "difficulty": "Beginner|Intermediate|Advanced" }
  action_steps      JSONB         NOT NULL DEFAULT '[]',

  -- Snapshot metadata at generation time
  generated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on every row mutation
CREATE OR REPLACE FUNCTION public.set_career_guidance_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER career_guidance_updated_at
  BEFORE UPDATE ON public.career_guidance
  FOR EACH ROW EXECUTE FUNCTION public.set_career_guidance_updated_at();

-- Indexes for efficient per-child lookups
CREATE INDEX IF NOT EXISTS idx_career_guidance_child_id
  ON public.career_guidance(child_id);

CREATE INDEX IF NOT EXISTS idx_career_guidance_generated_at
  ON public.career_guidance(generated_at DESC);

-- Row Level Security (backend uses service role key so RLS is effectively bypassed)
ALTER TABLE public.career_guidance ENABLE ROW LEVEL SECURITY;
