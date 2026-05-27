-- 022_newsletter_wizard_drafts.sql
-- Work-in-progress lagring for nyhetsbrev-byggeren.
--
-- Skiller seg fra 018_mailchimp_drafts.sql (som er audit-trail for
-- ALLEREDE-publiserte nyhetsbrev). Denne tabellen lagrer wizard-state
-- mellom sesjoner — så brukeren kan generere og jobbe på flere
-- nyhetsbrev parallelt og over flere uker uten å miste arbeid.
--
-- Flyt:
--   1. Bruker bygger nyhetsbrev i /innleggsbygger/nyhetsbrev-bygger
--   2. UI auto-lagrer state hvert ~4 sek til denne tabellen
--   3. Bruker kan komme tilbake senere, laste utkast, fortsette
--   4. Når bruker trykker "Opprett kampanje i Mailchimp" — kampanjen
--      pushes til Mailchimp + status settes til 'pushed' + source_draft_id
--      i mailchimp_drafts peker tilbake hit.

CREATE TABLE IF NOT EXISTS newsletter_wizard_drafts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Bruker-vennlig tittel (auto-utledet fra themeInput eller subject_line).
  title         text NOT NULL DEFAULT 'Utkast',

  -- Hele wizard-tilstanden som JSON — gjenopprettes 1:1 i UI ved load.
  -- Inkluderer themeInput, focus, products, content, images, social etc.
  wizard_state  jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Status:
  --   'draft'    — work-in-progress, ikke pushet til Mailchimp
  --   'pushed'   — pushet til Mailchimp (campaign_id i mailchimp_drafts)
  --   'archived' — bruker har arkivert (skjult fra default liste)
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'pushed', 'archived')),

  -- Når draft ble pushed: peker til mailchimp_drafts.id for audit-link.
  mailchimp_draft_id uuid REFERENCES mailchimp_drafts(id) ON DELETE SET NULL,

  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_wizard_drafts_user
  ON newsletter_wizard_drafts (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_wizard_drafts_status
  ON newsletter_wizard_drafts (status);

-- RLS: bruker eier sine egne utkast
ALTER TABLE newsletter_wizard_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own wizard drafts" ON newsletter_wizard_drafts;
CREATE POLICY "Users see own wizard drafts"
  ON newsletter_wizard_drafts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own wizard drafts" ON newsletter_wizard_drafts;
CREATE POLICY "Users insert own wizard drafts"
  ON newsletter_wizard_drafts FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own wizard drafts" ON newsletter_wizard_drafts;
CREATE POLICY "Users update own wizard drafts"
  ON newsletter_wizard_drafts FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own wizard drafts" ON newsletter_wizard_drafts;
CREATE POLICY "Users delete own wizard drafts"
  ON newsletter_wizard_drafts FOR DELETE
  USING (user_id = auth.uid());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_newsletter_wizard_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS newsletter_wizard_drafts_updated_at ON newsletter_wizard_drafts;
CREATE TRIGGER newsletter_wizard_drafts_updated_at
  BEFORE UPDATE ON newsletter_wizard_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_wizard_drafts_updated_at();
