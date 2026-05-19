-- 018_mailchimp_drafts.sql
-- Audit-trail for nyhetsbrev opprettet via nyhetsbrev-byggeren.
-- (Opprinnelig laget 11. mai som 012; nummerert om til 018 siden 012 ble brukt til pricetag.)
-- Idempotent — tabellen finnes allerede i Supabase, denne fila er for dokumentasjon.

CREATE TABLE IF NOT EXISTS mailchimp_drafts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Mailchimp-referanse
  campaign_id   text NOT NULL,
  edit_url      text,

  -- Innhold-snapshot
  theme         text,
  theme_title   text,
  subject_line  text,
  preview_text  text,

  -- Hvilke produkter ble inkludert
  product_urls  text[] NOT NULL DEFAULT '{}'::text[],

  -- Bilder
  midt_image_url   text,
  footer_image_url text,

  -- Full input som JSON (for re-bygging/debugging)
  payload jsonb NOT NULL,

  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mailchimp_drafts_created_at
  ON mailchimp_drafts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mailchimp_drafts_campaign_id
  ON mailchimp_drafts (campaign_id);
CREATE INDEX IF NOT EXISTS idx_mailchimp_drafts_theme
  ON mailchimp_drafts (theme);

-- RLS: bruker eier sine egne drafts
ALTER TABLE mailchimp_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own drafts" ON mailchimp_drafts;
CREATE POLICY "Users see own drafts"
  ON mailchimp_drafts FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users insert own drafts" ON mailchimp_drafts;
CREATE POLICY "Users insert own drafts"
  ON mailchimp_drafts FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users update own drafts" ON mailchimp_drafts;
CREATE POLICY "Users update own drafts"
  ON mailchimp_drafts FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own drafts" ON mailchimp_drafts;
CREATE POLICY "Users delete own drafts"
  ON mailchimp_drafts FOR DELETE
  USING (user_id = auth.uid());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_mailchimp_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mailchimp_drafts_updated_at ON mailchimp_drafts;
CREATE TRIGGER mailchimp_drafts_updated_at
  BEFORE UPDATE ON mailchimp_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_mailchimp_drafts_updated_at();
