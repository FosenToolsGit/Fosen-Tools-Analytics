-- Migration: utm_links
-- Sentralt register over alle genererte UTM-linker. Brukes av
-- /innleggsbygger/utm til å lage konsistente sporings-URLer og
-- krysskoble dem med GA4-trafikkdata for å vise klikk + konverteringer
-- per kampanje.

CREATE TABLE IF NOT EXISTS public.utm_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label           text NOT NULL,                -- "HDFI vs generisk - Facebook"
  base_url        text NOT NULL,                -- "https://fosen-tools.no/kundesenter/kontakt-oss"
  utm_source      text NOT NULL,                -- "facebook" / "instagram" / "FTNett" osv.
  utm_medium      text NOT NULL,                -- "organic" / "email" / "bio" / "story"
  utm_campaign    text NOT NULL,                -- "hdfi-vs-generisk" / "ig-bio" osv.
  utm_content     text,                         -- valgfri (A/B-variant)
  utm_term        text,                         -- valgfri (keyword/segment)
  full_url        text NOT NULL,                -- generert fra base_url + params
  notes           text,                         -- valgfri kommentar
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS utm_links_campaign_idx
  ON public.utm_links (utm_campaign);
CREATE INDEX IF NOT EXISTS utm_links_source_medium_idx
  ON public.utm_links (utm_source, utm_medium);
CREATE INDEX IF NOT EXISTS utm_links_created_idx
  ON public.utm_links (created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.utm_links_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS utm_links_updated_at ON public.utm_links;
CREATE TRIGGER utm_links_updated_at
  BEFORE UPDATE ON public.utm_links
  FOR EACH ROW
  EXECUTE FUNCTION public.utm_links_set_updated_at();

ALTER TABLE public.utm_links ENABLE ROW LEVEL SECURITY;

-- Alle innlogga (firma-medlemmer) kan lese alle linker — vi deler historikken
DROP POLICY IF EXISTS "Authenticated read utm_links" ON public.utm_links;
CREATE POLICY "Authenticated read utm_links"
  ON public.utm_links
  FOR SELECT TO authenticated USING (true);

-- Alle innlogga kan opprette nye linker
DROP POLICY IF EXISTS "Authenticated insert utm_links" ON public.utm_links;
CREATE POLICY "Authenticated insert utm_links"
  ON public.utm_links
  FOR INSERT TO authenticated WITH CHECK (true);

-- Bare eier kan oppdatere/slette egne linker
DROP POLICY IF EXISTS "Owner update utm_links" ON public.utm_links;
CREATE POLICY "Owner update utm_links"
  ON public.utm_links
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner delete utm_links" ON public.utm_links;
CREATE POLICY "Owner delete utm_links"
  ON public.utm_links
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
