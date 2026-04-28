-- Migration: brochures
-- Multi-document save for brosjyre-editoren. Erstatter localStorage-basert
-- single-doc-modell med Supabase-lagring så bruker kan ha mange parallele
-- kampanjer (sommer, jul, jubileum osv.).
--
-- RLS: hver bruker eier sine egne brosjyrer. Sharing-via-signed-URL kan
-- legges på senere uten schema-endring.

CREATE TABLE IF NOT EXISTS public.brochures (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  doc         jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brochures_user_id_idx
  ON public.brochures (user_id);

CREATE INDEX IF NOT EXISTS brochures_updated_at_idx
  ON public.brochures (updated_at DESC);

-- Auto-oppdater updated_at ved hver UPDATE
CREATE OR REPLACE FUNCTION public.brochures_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brochures_updated_at_trigger ON public.brochures;
CREATE TRIGGER brochures_updated_at_trigger
  BEFORE UPDATE ON public.brochures
  FOR EACH ROW
  EXECUTE FUNCTION public.brochures_set_updated_at();

ALTER TABLE public.brochures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can view own brochures" ON public.brochures;
CREATE POLICY "users can view own brochures"
  ON public.brochures
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can insert own brochures" ON public.brochures;
CREATE POLICY "users can insert own brochures"
  ON public.brochures
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can update own brochures" ON public.brochures;
CREATE POLICY "users can update own brochures"
  ON public.brochures
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can delete own brochures" ON public.brochures;
CREATE POLICY "users can delete own brochures"
  ON public.brochures
  FOR DELETE
  USING (auth.uid() = user_id);
