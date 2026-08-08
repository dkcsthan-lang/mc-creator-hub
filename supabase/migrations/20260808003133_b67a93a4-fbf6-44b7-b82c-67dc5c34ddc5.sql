CREATE POLICY "chat-files owner write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-files' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "chat-files participants read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-files' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.attachment_path = objects.name
        AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);