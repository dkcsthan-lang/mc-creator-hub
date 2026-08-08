CREATE OR REPLACE FUNCTION public.grant_site_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) IN ('redboiiop15@gmail.com','askwiththemask@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE lower(u.email) = 'askwiththemask@gmail.com'
  AND u.email_confirmed_at IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.block_self_sample_interaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT designer_id INTO owner_id FROM public.samples WHERE id = NEW.sample_id;
  IF owner_id IS NOT NULL AND owner_id = NEW.user_id THEN
    RAISE EXCEPTION 'You cannot interact with your own sample';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_block_self_like ON public.sample_likes;
CREATE TRIGGER trg_block_self_like BEFORE INSERT ON public.sample_likes
  FOR EACH ROW EXECUTE FUNCTION public.block_self_sample_interaction();

DROP TRIGGER IF EXISTS trg_block_self_rating ON public.sample_ratings;
CREATE TRIGGER trg_block_self_rating BEFORE INSERT OR UPDATE ON public.sample_ratings
  FOR EACH ROW EXECUTE FUNCTION public.block_self_sample_interaction();

CREATE OR REPLACE FUNCTION public.block_self_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.follower_id = NEW.designer_id THEN
    RAISE EXCEPTION 'You cannot follow yourself';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_block_self_follow ON public.follows;
CREATE TRIGGER trg_block_self_follow BEFORE INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.block_self_follow();

CREATE OR REPLACE FUNCTION public.sync_sample_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.samples SET likes = GREATEST(0, COALESCE(likes,0) + 1) WHERE id = NEW.sample_id;
    RETURN NEW;
  ELSE
    UPDATE public.samples SET likes = GREATEST(0, COALESCE(likes,0) - 1) WHERE id = OLD.sample_id;
    RETURN OLD;
  END IF;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_sample_likes_ins ON public.sample_likes;
CREATE TRIGGER trg_sync_sample_likes_ins AFTER INSERT ON public.sample_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_sample_likes();
DROP TRIGGER IF EXISTS trg_sync_sample_likes_del ON public.sample_likes;
CREATE TRIGGER trg_sync_sample_likes_del AFTER DELETE ON public.sample_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_sample_likes();

UPDATE public.samples s
SET likes = COALESCE((SELECT count(*) FROM public.sample_likes l WHERE l.sample_id = s.id), 0);