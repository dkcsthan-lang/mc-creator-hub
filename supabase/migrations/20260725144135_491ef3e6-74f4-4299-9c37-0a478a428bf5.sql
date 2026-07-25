
DROP POLICY IF EXISTS "admins insert notifications" ON public.notifications;
CREATE POLICY "admins insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Notify designer when their sample is approved/rejected
CREATE OR REPLACE FUNCTION public.on_sample_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.designer_id, 'sample', 'Sample approved', NEW.title || ' is now live', '/samples/' || NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.designer_id, 'sample', 'Sample rejected', NEW.title || ' was rejected', '/dashboard');
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.on_sample_status_change() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_on_sample_status_change ON public.samples;
CREATE TRIGGER trg_on_sample_status_change AFTER UPDATE ON public.samples
  FOR EACH ROW EXECUTE FUNCTION public.on_sample_status_change();
