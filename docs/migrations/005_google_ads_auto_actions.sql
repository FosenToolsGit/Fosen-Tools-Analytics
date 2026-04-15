-- Migration: google_ads_auto_actions
-- Audit trail for automatiserte handlinger mot Google Ads API.
-- Hver gang systemet legger til negative keywords, pauser keywords, osv.
-- logges det her slik at endringer er sporbare og reverserbare.

CREATE TABLE IF NOT EXISTS public.google_ads_auto_actions (
  id              bigserial PRIMARY KEY,
  action_type     text NOT NULL,
  target_resource text,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL CHECK (status IN ('pending', 'applied', 'failed', 'reverted')),
  applied_by      text,
  applied_at      timestamptz,
  reverted_at     timestamptz,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS google_ads_auto_actions_created_idx
  ON public.google_ads_auto_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS google_ads_auto_actions_status_idx
  ON public.google_ads_auto_actions (status);

ALTER TABLE public.google_ads_auto_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read google_ads_auto_actions" ON public.google_ads_auto_actions;
CREATE POLICY "Authenticated read google_ads_auto_actions"
  ON public.google_ads_auto_actions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated write google_ads_auto_actions" ON public.google_ads_auto_actions;
CREATE POLICY "Authenticated write google_ads_auto_actions"
  ON public.google_ads_auto_actions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
