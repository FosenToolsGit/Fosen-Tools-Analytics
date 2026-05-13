-- Migration: Storage-bucket for social-engine bilder
-- Brukes både for opplastede foto OG AI-genererte bilder.
-- Samme path-baserte RLS som brochure_assets.

INSERT INTO storage.buckets (id, name, public)
VALUES ('social_assets', 'social_assets', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: bruker eier filer under sin egen user_id/
DROP POLICY IF EXISTS "Users can upload to own folder social_assets" ON storage.objects;
CREATE POLICY "Users can upload to own folder social_assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'social_assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view all social_assets" ON storage.objects;
CREATE POLICY "Users can view all social_assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'social_assets');

DROP POLICY IF EXISTS "Users can update own social_assets" ON storage.objects;
CREATE POLICY "Users can update own social_assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'social_assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own social_assets" ON storage.objects;
CREATE POLICY "Users can delete own social_assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'social_assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
