-- ── Module 8: Skill Development — Database Migration ──────────────────────────
-- Run this in your Supabase SQL Editor to create the public.child_skills table.

CREATE TYPE skill_category AS ENUM (
  'academic',
  'artistic',
  'athletic',
  'social',
  'technical'
);

CREATE TYPE skill_status AS ENUM (
  'suggested',
  'learning',
  'acquired'
);

DROP TABLE IF EXISTS public.child_skills CASCADE;

CREATE TABLE public.child_skills (
  id                  UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id            UUID           NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  skill_name          TEXT           NOT NULL,
  category            skill_category NOT NULL,
  status              skill_status   NOT NULL DEFAULT 'suggested',
  ai_generated        BOOLEAN        NOT NULL DEFAULT FALSE,

  -- Stores rationale + recommended_activities as structured JSONB:
  -- {
  --   "rationale": "...",
  --   "recommended_activities": ["...", "...", "..."]
  -- }
  metadata            JSONB          NOT NULL DEFAULT '{}',

  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on every row mutation
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER child_skills_updated_at
  BEFORE UPDATE ON public.child_skills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for efficient per-child lookups
CREATE INDEX IF NOT EXISTS idx_child_skills_child_id ON public.child_skills(child_id);
CREATE INDEX IF NOT EXISTS idx_child_skills_status   ON public.child_skills(status);

-- Row Level Security (backend uses service role key so RLS is effectively bypassed)
ALTER TABLE public.child_skills ENABLE ROW LEVEL SECURITY;
