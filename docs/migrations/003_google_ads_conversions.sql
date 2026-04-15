-- Migration: google_ads_conversions
-- Kjør i Supabase SQL editor (prosjekt evfbfiqruxzaraksetok).
--
-- Lagrer konverteringer per kampanje + action + dag. Viktig fordi Google Ads
-- bare teller en liten del av handlingene som "primary conversions" — men
-- all_conversions inneholder alle trackede actions (add_to_cart, begin_checkout,
-- purchase osv.) også de som ikke er merket som primary. Dette gir oss full
-- funnel-sikt selv når konverteringssporingen i Google Ads er ufullstendig.

CREATE TABLE IF NOT EXISTS public.google_ads_conversions (
  id                       bigserial PRIMARY KEY,
  campaign_id              text NOT NULL,
  campaign_name            text,
  conversion_action_name   text NOT NULL,
  metric_date              date NOT NULL,
  conversions              numeric(14, 2) NOT NULL DEFAULT 0,
  conversions_value        numeric(14, 2) NOT NULL DEFAULT 0,
  all_conversions          numeric(14, 2) NOT NULL DEFAULT 0,
  all_conversions_value    numeric(14, 2) NOT NULL DEFAULT 0,
  created_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT google_ads_conversions_unique UNIQUE (
    campaign_id, conversion_action_name, metric_date
  )
);

CREATE INDEX IF NOT EXISTS google_ads_conversions_date_idx
  ON public.google_ads_conversions (metric_date);
CREATE INDEX IF NOT EXISTS google_ads_conversions_campaign_idx
  ON public.google_ads_conversions (campaign_id);

ALTER TABLE public.google_ads_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read google_ads_conversions" ON public.google_ads_conversions;
CREATE POLICY "Authenticated read google_ads_conversions"
  ON public.google_ads_conversions
  FOR SELECT
  TO authenticated
  USING (true);
