-- Migration: google_ads_search_terms
-- Kjør i Supabase SQL editor (prosjekt evfbfiqruxzaraksetok).
--
-- Lagrer faktiske søketermer som trigget Google Ads-annonsene våre.
-- To kilder (source-kolonnen skiller dem):
--   'search_term'  — fra search_term_view (Search-kampanjer, gir ekte term)
--   'pmax_insight' — fra campaign_search_term_insight (Performance Max,
--                    gir kategori-label; ingen cost-data, kun impressions/clicks)

CREATE TABLE IF NOT EXISTS public.google_ads_search_terms (
  id               bigserial PRIMARY KEY,
  source           text NOT NULL CHECK (source IN ('search_term', 'pmax_insight')),
  campaign_id      text NOT NULL,
  campaign_name    text,
  ad_group_id      text NOT NULL DEFAULT '',
  ad_group_name    text,
  search_term      text NOT NULL,
  status           text,
  metric_date      date NOT NULL,
  impressions      bigint NOT NULL DEFAULT 0,
  clicks           bigint NOT NULL DEFAULT 0,
  cost_micros      bigint NOT NULL DEFAULT 0,
  cost_nok         numeric(14, 2) NOT NULL DEFAULT 0,
  conversions      numeric(14, 2) NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT google_ads_search_terms_unique UNIQUE (
    source, campaign_id, ad_group_id, search_term, metric_date
  )
);

CREATE INDEX IF NOT EXISTS google_ads_search_terms_date_idx
  ON public.google_ads_search_terms (metric_date);
CREATE INDEX IF NOT EXISTS google_ads_search_terms_campaign_idx
  ON public.google_ads_search_terms (campaign_id);
CREATE INDEX IF NOT EXISTS google_ads_search_terms_source_idx
  ON public.google_ads_search_terms (source);

ALTER TABLE public.google_ads_search_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read google_ads_search_terms" ON public.google_ads_search_terms;
CREATE POLICY "Authenticated read google_ads_search_terms"
  ON public.google_ads_search_terms
  FOR SELECT
  TO authenticated
  USING (true);
