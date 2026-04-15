-- Migration: analytics_anomalies
-- Lagrer anomalier oppdaget av det automatiske varsel-systemet.
-- Bruker får varsel når noe uvanlig skjer, kan acknowledgere dem,
-- og historikken holdes for å se over tid om problemet gjentar seg.

CREATE TABLE IF NOT EXISTS public.analytics_anomalies (
  id              bigserial PRIMARY KEY,
  category        text NOT NULL,
  severity        text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title           text NOT NULL,
  description     text NOT NULL,
  metric_context  jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggested_action text,
  target_type     text,  -- 'campaign', 'platform', 'search_term', 'global'
  target_id       text,  -- campaign_id, platform key, etc.
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'acknowledged', 'resolved', 'expired')),
  acknowledged_at timestamptz,
  acknowledged_by text,
  detected_at     timestamptz NOT NULL DEFAULT now(),
  -- Dedup-nøkkel: samme kategori + target innenfor 24t regnes som samme anomali
  dedup_key       text GENERATED ALWAYS AS (
    category || '|' || COALESCE(target_type, '') || '|' || COALESCE(target_id, '')
  ) STORED
);

CREATE INDEX IF NOT EXISTS analytics_anomalies_status_idx
  ON public.analytics_anomalies (status, detected_at DESC);
CREATE INDEX IF NOT EXISTS analytics_anomalies_severity_idx
  ON public.analytics_anomalies (severity);
CREATE INDEX IF NOT EXISTS analytics_anomalies_dedup_idx
  ON public.analytics_anomalies (dedup_key, detected_at DESC);

ALTER TABLE public.analytics_anomalies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read analytics_anomalies" ON public.analytics_anomalies;
CREATE POLICY "Authenticated read analytics_anomalies"
  ON public.analytics_anomalies
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated write analytics_anomalies" ON public.analytics_anomalies;
CREATE POLICY "Authenticated write analytics_anomalies"
  ON public.analytics_anomalies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
