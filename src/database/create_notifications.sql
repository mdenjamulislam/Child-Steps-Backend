-- ── Module 9: Notifications and Alerts — Database Migration ──────────────────────────
-- Run this in your Supabase SQL Editor to create the public.notifications table.

CREATE TYPE notification_type AS ENUM (
  'vaccine_reminder',
  'milestone_alert',
  'educational_update',
  'system_notice'
);

DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
  id                  UUID              DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id          UUID              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type                notification_type NOT NULL,
  title               TEXT              NOT NULL,
  message             TEXT              NOT NULL,
  reference_id        UUID,             -- Optional: ID of the vaccine/milestone/etc to prevent duplicates
  is_read             BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on every row mutation
CREATE OR REPLACE FUNCTION public.set_notifications_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_notifications_updated_at();

-- Indexes for efficient querying by profile and read status
CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON public.notifications(is_read);

-- Ensure we don't generate duplicate automated alerts by indexing reference_id + type
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_ref_type 
  ON public.notifications(reference_id, type) 
  WHERE reference_id IS NOT NULL;

-- Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
