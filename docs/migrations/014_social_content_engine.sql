-- Migration: Social content engine (Innholdsmotor)
-- Tre tabeller:
--   social_drafts: AI-genererte innlegg som venter på godkjenning/planlegging
--   social_feedback: rejection/edit-grunner som forbedrer prompts over tid
--   social_corpus: kunnskaps-base (voice, visual-rules, plattformer, archetypes, produkter, topp-poster, avviste)
--
-- Pattern: SHARED read (alle innlogga kan se), eier-write (kun creator kan endre/slette).
-- Samme mønster som utm_links — vi deler historikken på tvers av team.

-- =========================================================================
-- social_corpus: kunnskaps-base
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.social_corpus (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- kind = type kunnskap:
  --   voice              : skrivestil-doktrine
  --   visual_rules       : visuelle regler (kun FT-palett, ingen AI-HDFI osv)
  --   palette            : farger
  --   typography         : fonter
  --   platform           : per-plattform regler (slug=facebook/instagram/linkedin)
  --   archetype          : visuell archetype (slug=foto/definisjon/statement/kontrast/milepael/sitat/sertifikat)
  --   topic_template     : prompt-mal per topic-type (slug=leveranse/prosess/produktlansering/...)
  --   product            : produkt-info (slug=hdfi/cadlab/...)
  --   top_post           : eksempel på topp-innlegg som funket
  --   rejected_pattern   : eksempel på avvist innhold som IKKE skal gjentas
  --   company            : selskap-kontekst
  kind          text NOT NULL,
  slug          text NOT NULL,                -- unik per kind, f.eks. "facebook", "leveranse", "hdfi"
  title         text NOT NULL,
  content       text NOT NULL,                -- markdown / fri tekst
  metadata      jsonb NOT NULL DEFAULT '{}',  -- char-cap, engagement-lift, etc
  active        boolean NOT NULL DEFAULT true,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, slug)
);

CREATE INDEX IF NOT EXISTS social_corpus_kind_idx
  ON public.social_corpus (kind, active);
CREATE INDEX IF NOT EXISTS social_corpus_updated_idx
  ON public.social_corpus (updated_at DESC);

CREATE OR REPLACE FUNCTION public.social_corpus_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS social_corpus_updated_at ON public.social_corpus;
CREATE TRIGGER social_corpus_updated_at
  BEFORE UPDATE ON public.social_corpus
  FOR EACH ROW EXECUTE FUNCTION public.social_corpus_set_updated_at();

ALTER TABLE public.social_corpus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read social_corpus" ON public.social_corpus;
CREATE POLICY "Authenticated read social_corpus"
  ON public.social_corpus FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated insert social_corpus" ON public.social_corpus;
CREATE POLICY "Authenticated insert social_corpus"
  ON public.social_corpus FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update social_corpus" ON public.social_corpus;
CREATE POLICY "Authenticated update social_corpus"
  ON public.social_corpus FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated delete social_corpus" ON public.social_corpus;
CREATE POLICY "Authenticated delete social_corpus"
  ON public.social_corpus FOR DELETE TO authenticated USING (true);


-- =========================================================================
-- social_drafts: utkast som venter på handling
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.social_drafts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- topic_kind: hva slags innlegg er dette
  --   leveranse / prosess / produktlansering / bransje_kontekst /
  --   milepael / edukativ / evergreen / kampanje
  topic_kind      text NOT NULL,
  -- archetype: visuell stil (matcher social_corpus.slug for kind='archetype')
  archetype       text NOT NULL DEFAULT 'foto',
  -- Topic-context (input til AI):
  title           text NOT NULL,             -- intern arbeidstittel
  source_url      text,                      -- valgfri kilde-URL (fosen-tools.no produktside)
  source_data     jsonb NOT NULL DEFAULT '{}', -- scrapet data fra URL
  brief           text,                      -- bruker-input (kunde, vinkling, detaljer)
  user_photos     jsonb NOT NULL DEFAULT '[]', -- [{path, public_url, alt?}]
  -- AI-output (per plattform):
  captions        jsonb NOT NULL DEFAULT '{}', -- {facebook, instagram, linkedin}
  -- AI-genererte bilder (archetype != 'foto'):
  ai_images       jsonb NOT NULL DEFAULT '[]', -- [{storage_path, public_url, archetype, prompt}]
  -- Status-flyt: draft → approved → scheduled → posted (eller rejected)
  status          text NOT NULL DEFAULT 'draft',
  scheduled_at    timestamptz,
  posted_at       timestamptz,
  posted_links    jsonb NOT NULL DEFAULT '{}', -- {facebook?: url, instagram?: url, linkedin?: url}
  -- Metadata
  model_used      text,                       -- "gemini-2.0-flash" osv
  generation_cost numeric(10, 4) DEFAULT 0,   -- USD-cost-estimat
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_drafts_status_idx
  ON public.social_drafts (status, scheduled_at);
CREATE INDEX IF NOT EXISTS social_drafts_topic_idx
  ON public.social_drafts (topic_kind);
CREATE INDEX IF NOT EXISTS social_drafts_created_idx
  ON public.social_drafts (created_at DESC);

CREATE OR REPLACE FUNCTION public.social_drafts_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS social_drafts_updated_at ON public.social_drafts;
CREATE TRIGGER social_drafts_updated_at
  BEFORE UPDATE ON public.social_drafts
  FOR EACH ROW EXECUTE FUNCTION public.social_drafts_set_updated_at();

ALTER TABLE public.social_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read social_drafts" ON public.social_drafts;
CREATE POLICY "Authenticated read social_drafts"
  ON public.social_drafts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated insert social_drafts" ON public.social_drafts;
CREATE POLICY "Authenticated insert social_drafts"
  ON public.social_drafts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update social_drafts" ON public.social_drafts;
CREATE POLICY "Authenticated update social_drafts"
  ON public.social_drafts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Owner delete social_drafts" ON public.social_drafts;
CREATE POLICY "Owner delete social_drafts"
  ON public.social_drafts FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- =========================================================================
-- social_feedback: rejection/edit-grunner — mater inn i fremtidige prompts
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.social_feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- kind:
  --   rejected_draft    : hele draften ble avvist
  --   rejected_caption  : kun caption på én plattform avvist
  --   rejected_image    : AI-bilde avvist
  --   edited_caption    : caption ble endret før godkjenning
  --   manual_rule       : manuelt lagt inn regel (ikke knyttet til draft)
  --   auto_top          : auto-flagged som topp-post (positive eksempel)
  kind          text NOT NULL,
  draft_id      uuid REFERENCES public.social_drafts(id) ON DELETE CASCADE,
  platform      text,                         -- facebook/instagram/linkedin/null
  before_text   text,                         -- original AI-output
  after_text    text,                         -- bruker-edit hvis kind='edited_caption'
  reason        text NOT NULL,                -- "for langt", "AI-HDFI", "feil tone", ...
  metadata      jsonb NOT NULL DEFAULT '{}',
  active        boolean NOT NULL DEFAULT true,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_feedback_kind_idx
  ON public.social_feedback (kind, active);
CREATE INDEX IF NOT EXISTS social_feedback_draft_idx
  ON public.social_feedback (draft_id);
CREATE INDEX IF NOT EXISTS social_feedback_created_idx
  ON public.social_feedback (created_at DESC);

ALTER TABLE public.social_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read social_feedback" ON public.social_feedback;
CREATE POLICY "Authenticated read social_feedback"
  ON public.social_feedback FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated insert social_feedback" ON public.social_feedback;
CREATE POLICY "Authenticated insert social_feedback"
  ON public.social_feedback FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update social_feedback" ON public.social_feedback;
CREATE POLICY "Authenticated update social_feedback"
  ON public.social_feedback FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Owner delete social_feedback" ON public.social_feedback;
CREATE POLICY "Owner delete social_feedback"
  ON public.social_feedback FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- =========================================================================
-- social_assets: opplastede bilder (separat fra brochure_assets)
-- Storage-bucket "social_assets" må opprettes manuelt eller via 015-migrasjon.
-- =========================================================================
-- (Stub for fremtidig bruk — kan legges til via egen migrasjon hvis ønskelig)
