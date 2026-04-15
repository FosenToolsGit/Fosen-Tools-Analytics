-- Migration: mailchimp_extended
-- Utvidede tabeller for Mailchimp deep dive:
-- - per-lenke klikk per kampanje
-- - geografisk fordeling av åpninger per kampanje
-- - daglig abonnent-vekst for listen
-- - daglig liste-aktivitet (sendt, åpnet, klikket, unsubs)

CREATE TABLE IF NOT EXISTS public.mailchimp_campaign_links (
  id                bigserial PRIMARY KEY,
  campaign_id       text NOT NULL,
  url               text NOT NULL,
  total_clicks      int NOT NULL DEFAULT 0,
  unique_clicks     int NOT NULL DEFAULT 0,
  click_percentage  numeric(10, 4) NOT NULL DEFAULT 0,
  last_click_at     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mailchimp_campaign_links_unique UNIQUE (campaign_id, url)
);

CREATE INDEX IF NOT EXISTS mailchimp_campaign_links_campaign_idx
  ON public.mailchimp_campaign_links (campaign_id);
CREATE INDEX IF NOT EXISTS mailchimp_campaign_links_clicks_idx
  ON public.mailchimp_campaign_links (total_clicks DESC);

CREATE TABLE IF NOT EXISTS public.mailchimp_campaign_locations (
  id            bigserial PRIMARY KEY,
  campaign_id   text NOT NULL,
  country_code  text NOT NULL,
  region        text,
  opens         int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mailchimp_campaign_locations_unique UNIQUE (campaign_id, country_code, region)
);

CREATE INDEX IF NOT EXISTS mailchimp_campaign_locations_campaign_idx
  ON public.mailchimp_campaign_locations (campaign_id);

CREATE TABLE IF NOT EXISTS public.mailchimp_list_growth (
  id          bigserial PRIMARY KEY,
  list_id     text NOT NULL,
  metric_date date NOT NULL,
  existing    int NOT NULL DEFAULT 0,
  imports     int NOT NULL DEFAULT 0,
  optins      int NOT NULL DEFAULT 0,
  unsubs      int NOT NULL DEFAULT 0,
  cleaned     int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mailchimp_list_growth_unique UNIQUE (list_id, metric_date)
);

CREATE INDEX IF NOT EXISTS mailchimp_list_growth_date_idx
  ON public.mailchimp_list_growth (metric_date DESC);

CREATE TABLE IF NOT EXISTS public.mailchimp_list_daily (
  id          bigserial PRIMARY KEY,
  list_id     text NOT NULL,
  metric_date date NOT NULL,
  emails_sent int NOT NULL DEFAULT 0,
  unique_opens int NOT NULL DEFAULT 0,
  recipient_clicks int NOT NULL DEFAULT 0,
  hard_bounce int NOT NULL DEFAULT 0,
  soft_bounce int NOT NULL DEFAULT 0,
  unsubs      int NOT NULL DEFAULT 0,
  other_adds  int NOT NULL DEFAULT 0,
  other_removes int NOT NULL DEFAULT 0,
  subs        int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mailchimp_list_daily_unique UNIQUE (list_id, metric_date)
);

CREATE INDEX IF NOT EXISTS mailchimp_list_daily_date_idx
  ON public.mailchimp_list_daily (metric_date DESC);

ALTER TABLE public.mailchimp_campaign_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailchimp_campaign_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailchimp_list_growth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailchimp_list_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read mailchimp_campaign_links" ON public.mailchimp_campaign_links;
CREATE POLICY "Authenticated read mailchimp_campaign_links"
  ON public.mailchimp_campaign_links FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read mailchimp_campaign_locations" ON public.mailchimp_campaign_locations;
CREATE POLICY "Authenticated read mailchimp_campaign_locations"
  ON public.mailchimp_campaign_locations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read mailchimp_list_growth" ON public.mailchimp_list_growth;
CREATE POLICY "Authenticated read mailchimp_list_growth"
  ON public.mailchimp_list_growth FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read mailchimp_list_daily" ON public.mailchimp_list_daily;
CREATE POLICY "Authenticated read mailchimp_list_daily"
  ON public.mailchimp_list_daily FOR SELECT TO authenticated USING (true);
