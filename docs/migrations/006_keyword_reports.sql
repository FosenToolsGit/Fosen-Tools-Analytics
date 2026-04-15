-- Migration: keyword_reports + storage bucket
-- Historikk over automatisk genererte ukentlige søkeords-rapporter.
-- Excel-filene lagres i Supabase Storage bucket 'weekly-reports'.

CREATE TABLE IF NOT EXISTS public.keyword_reports (
  id               bigserial PRIMARY KEY,
  report_date      date NOT NULL,
  period_from      date NOT NULL,
  period_to        date NOT NULL,
  storage_path     text NOT NULL,
  file_size_bytes  bigint,
  signals_total    int NOT NULL DEFAULT 0,
  signals_scale_up int NOT NULL DEFAULT 0,
  signals_cut      int NOT NULL DEFAULT 0,
  signals_negative int NOT NULL DEFAULT 0,
  signals_new      int NOT NULL DEFAULT 0,
  total_cost_nok   numeric(14, 2) NOT NULL DEFAULT 0,
  total_value_nok  numeric(14, 2) NOT NULL DEFAULT 0,
  triggered_by     text NOT NULL DEFAULT 'cron',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS keyword_reports_date_idx
  ON public.keyword_reports (report_date DESC);

ALTER TABLE public.keyword_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read keyword_reports" ON public.keyword_reports;
CREATE POLICY "Authenticated read keyword_reports"
  ON public.keyword_reports
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated write keyword_reports" ON public.keyword_reports;
CREATE POLICY "Authenticated write keyword_reports"
  ON public.keyword_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket opprettes manuelt via Supabase Dashboard eller egen SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('weekly-reports', 'weekly-reports', false)
-- ON CONFLICT DO NOTHING;
--
-- Eller via Storage UI: Create bucket 'weekly-reports', Private, ingen file-type restriction.
