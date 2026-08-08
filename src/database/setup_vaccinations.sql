-- ─────────────────────────────────────────────────────────────────────────────
-- Module 5: Vaccination Reminder System — Database Setup
-- Run this script once in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Master Vaccines Catalog ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vaccines (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  description           TEXT,
  recommended_age_months INTEGER NOT NULL,  -- months after birth
  doses_required        INTEGER NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Per-Child Vaccination Records ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vaccination_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id          UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  vaccine_id        UUID NOT NULL REFERENCES public.vaccines(id) ON DELETE CASCADE,
  scheduled_date    DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'administered', 'skipped')),
  administered_date DATE,
  administered_by   TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, vaccine_id)
);

-- ── 3. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vaccination_records_child_id
  ON public.vaccination_records (child_id);

CREATE INDEX IF NOT EXISTS idx_vaccination_records_status
  ON public.vaccination_records (status);

CREATE INDEX IF NOT EXISTS idx_vaccination_records_scheduled_date
  ON public.vaccination_records (scheduled_date);

-- ── 4. Auto-update updated_at trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vaccination_records_updated_at ON public.vaccination_records;
CREATE TRIGGER trg_vaccination_records_updated_at
  BEFORE UPDATE ON public.vaccination_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE public.vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;

-- Vaccines catalog: publicly readable (no login required for catalog)
DROP POLICY IF EXISTS "vaccines_select_all" ON public.vaccines;
CREATE POLICY "vaccines_select_all"
  ON public.vaccines FOR SELECT USING (true);

-- Vaccination records: parents can only see records for their own children
DROP POLICY IF EXISTS "vaccination_records_parent_access" ON public.vaccination_records;
CREATE POLICY "vaccination_records_parent_access"
  ON public.vaccination_records FOR ALL
  USING (
    child_id IN (
      SELECT id FROM public.children WHERE parent_id = auth.uid()
    )
  );

-- ── 6. Seed Standard WHO/EPI Vaccine Schedule ─────────────────────────────────
INSERT INTO public.vaccines (name, description, recommended_age_months, doses_required) VALUES

-- At Birth
('BCG',
 'Bacillus Calmette–Guérin vaccine. Protects against tuberculosis (TB) meningitis and disseminated TB.',
 0, 1),

('Hepatitis B (Birth Dose)',
 'First dose of Hepatitis B vaccine given at birth to prevent mother-to-child transmission.',
 0, 1),

-- 6 Weeks
('OPV-1 (Oral Polio)',
 'First dose of Oral Polio Vaccine. Protects against poliomyelitis.',
 1, 1),

('DPT-HepB-Hib-1',
 'Pentavalent vaccine: Diphtheria, Pertussis, Tetanus, Hepatitis B, and Haemophilus influenzae type b — dose 1.',
 1, 1),

('IPV-1 (Inactivated Polio)',
 'First dose of Inactivated Poliovirus Vaccine. Boosts protection against all poliovirus types.',
 1, 1),

-- 10 Weeks
('OPV-2 (Oral Polio)',
 'Second dose of Oral Polio Vaccine.',
 2, 1),

('DPT-HepB-Hib-2',
 'Pentavalent vaccine — dose 2.',
 2, 1),

-- 14 Weeks
('OPV-3 (Oral Polio)',
 'Third dose of Oral Polio Vaccine.',
 3, 1),

('DPT-HepB-Hib-3',
 'Pentavalent vaccine — dose 3.',
 3, 1),

('IPV-2 (Inactivated Polio)',
 'Second dose of Inactivated Poliovirus Vaccine.',
 3, 1),

-- 9 Months
('Measles-Rubella (MR-1)',
 'First dose of Measles-Rubella vaccine. Protects against measles and rubella.',
 9, 1),

-- 12 Months
('Pneumococcal (PCV)',
 'Pneumococcal Conjugate Vaccine. Protects against pneumococcal diseases including pneumonia and meningitis.',
 12, 1),

-- 15 Months
('MMR (Measles-Mumps-Rubella)',
 'Combined vaccine protecting against measles, mumps, and rubella. Booster at 15 months.',
 15, 1),

-- 18 Months
('DPT Booster',
 'Booster dose of Diphtheria, Pertussis, and Tetanus vaccine.',
 18, 1),

-- 24 Months
('Typhoid',
 'Typhoid conjugate vaccine. Protects against typhoid fever caused by Salmonella Typhi.',
 24, 1)

ON CONFLICT DO NOTHING;
