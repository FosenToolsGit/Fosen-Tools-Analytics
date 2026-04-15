-- Migration: google_ads_tables
-- Kjør denne i Supabase SQL editor (prosjekt evfbfiqruxzaraksetok).
-- Oppretter tabellene som src/app/api/sync/google-ads-sync.ts upserter til,
-- og legger google_ads til platform_type enum så sync_logs kan referere den.

-- 1. Utvid platform_type enum (CLAUDE.md dokumenterer at platform_type er enum
--    med ga4/meta/linkedin/mailchimp som mulige verdier)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'platform_type' AND e.enumlabel = 'google_ads'
  ) THEN
    ALTER TYPE platform_type ADD VALUE 'google_ads';
  END IF;
END$$;

-- 2. google_ads_campaigns
CREATE TABLE IF NOT EXISTS public.google_ads_campaigns (
  id               bigserial PRIMARY KEY,
  campaign_id      text NOT NULL,
  campaign_name    text NOT NULL,
  status           text,
  channel_type     text,
  metric_date      date NOT NULL,
  impressions      bigint NOT NULL DEFAULT 0,
  clicks           bigint NOT NULL DEFAULT 0,
  cost_micros      bigint NOT NULL DEFAULT 0,
  cost_nok         numeric(14, 2) NOT NULL DEFAULT 0,
  conversions      numeric(14, 2) NOT NULL DEFAULT 0,
  conversion_value numeric(14, 2) NOT NULL DEFAULT 0,
  ctr              numeric(10, 6) NOT NULL DEFAULT 0,
  average_cpc_nok  numeric(14, 4) NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT google_ads_campaigns_unique UNIQUE (campaign_id, metric_date)
);

CREATE INDEX IF NOT EXISTS google_ads_campaigns_date_idx
  ON public.google_ads_campaigns (metric_date);

-- 3. google_ads_keywords
CREATE TABLE IF NOT EXISTS public.google_ads_keywords (
  id              bigserial PRIMARY KEY,
  campaign_id     text NOT NULL,
  ad_group_id     text NOT NULL,
  ad_group_name   text,
  keyword_text    text NOT NULL,
  match_type      text NOT NULL,
  status          text,
  metric_date     date NOT NULL,
  impressions     bigint NOT NULL DEFAULT 0,
  clicks          bigint NOT NULL DEFAULT 0,
  cost_micros     bigint NOT NULL DEFAULT 0,
  cost_nok        numeric(14, 2) NOT NULL DEFAULT 0,
  conversions     numeric(14, 2) NOT NULL DEFAULT 0,
  ctr             numeric(10, 6) NOT NULL DEFAULT 0,
  average_cpc_nok numeric(14, 4) NOT NULL DEFAULT 0,
  quality_score   int,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT google_ads_keywords_unique UNIQUE (
    campaign_id, ad_group_id, keyword_text, match_type, metric_date
  )
);

CREATE INDEX IF NOT EXISTS google_ads_keywords_date_idx
  ON public.google_ads_keywords (metric_date);
CREATE INDEX IF NOT EXISTS google_ads_keywords_campaign_idx
  ON public.google_ads_keywords (campaign_id);

-- 4. Row Level Security
ALTER TABLE public.google_ads_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_ads_keywords  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read google_ads_campaigns" ON public.google_ads_campaigns;
CREATE POLICY "Authenticated read google_ads_campaigns"
  ON public.google_ads_campaigns
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated read google_ads_keywords" ON public.google_ads_keywords;
CREATE POLICY "Authenticated read google_ads_keywords"
  ON public.google_ads_keywords
  FOR SELECT
  TO authenticated
  USING (true);
