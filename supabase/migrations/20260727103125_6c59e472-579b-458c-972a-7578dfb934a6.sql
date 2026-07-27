
CREATE POLICY "sponsors upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sponsors' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "sponsors public read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'sponsors');
