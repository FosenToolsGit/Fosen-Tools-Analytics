-- Migration: google_ads_campaign_settings
-- Kjør i Supabase SQL editor (prosjekt evfbfiqruxzaraksetok).
--
-- Per-kampanje konfigurasjon brukt av analyse-siden:
-- - business_model: hva kampanjen primært skal optimere for
--   * purchase: e-handel-kampanjer. ROAS = kjøp-verdi / kostnad
--   * leads:    B2B-kampanjer der folk tar kontakt. ROAS = leads * antatt verdi / kostnad
--   * mixed:    begge — viser begge metrikker
-- - estimated_lead_value_nok: gjetting på hva én lead er verdt i kroner
-- - notes: fri tekst

CREATE TABLE IF NOT EXISTS public.google_ads_campaign_settings (
  campaign_id              text PRIMARY KEY,
  business_model           text NOT NULL DEFAULT 'purchase'
    CHECK (business_model IN ('purchase', 'leads', 'mixed')),
  estimated_lead_value_nok numeric(14, 2) NOT NULL DEFAULT 500,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_ads_campaign_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read google_ads_campaign_settings" ON public.google_ads_campaign_settings;
CREATE POLICY "Authenticated read google_ads_campaign_settings"
  ON public.google_ads_campaign_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated write google_ads_campaign_settings" ON public.google_ads_campaign_settings;
CREATE POLICY "Authenticated write google_ads_campaign_settings"
  ON public.google_ads_campaign_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
