-- Migration: brochure_assets storage bucket
-- Privat Storage-bucket for opplastede bilder i brosjyre-editoren.
-- Erstatter base64-dataUrl-i-jsonb-mønsteret slik at brochures.doc-cellen
-- holder seg liten og bilder kan caches/serves separat.
--
-- Path-konvensjon: {user_id}/{uuid}-{filename}
-- RLS: bruker har full kontroll over filer i sin egen mappe.

INSERT INTO storage.buckets (id, name, public)
VALUES ('brochure_assets', 'brochure_assets', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own brochure_assets" ON storage.objects;
CREATE POLICY "Users upload own brochure_assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brochure_assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users read own brochure_assets" ON storage.objects;
CREATE POLICY "Users read own brochure_assets"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'brochure_assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users update own brochure_assets" ON storage.objects;
CREATE POLICY "Users update own brochure_assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'brochure_assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own brochure_assets" ON storage.objects;
CREATE POLICY "Users delete own brochure_assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'brochure_assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
