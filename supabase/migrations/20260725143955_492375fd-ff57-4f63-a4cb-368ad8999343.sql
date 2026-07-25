
-- ============ Column additions ============
ALTER TABLE public.samples
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS gallery_paths text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS server_id text,
  ADD COLUMN IF NOT EXISTS preview_path text,
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS allowed_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS completed_orders integer NOT NULL DEFAULT 0;

ALTER TABLE public.designer_applications
  ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS years_experience integer;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS budget_min integer,
  ADD COLUMN IF NOT EXISTS budget_max integer,
  ADD COLUMN IF NOT EXISTS watermark_path text,
  ADD COLUMN IF NOT EXISTS expired boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS title text;

-- ============ follows ============
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  designer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, designer_id)
);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT SELECT ON public.follows TO anon;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "follows public read" ON public.follows;
CREATE POLICY "follows public read" ON public.follows FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "users follow" ON public.follows;
CREATE POLICY "users follow" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "users unfollow" ON public.follows;
CREATE POLICY "users unfollow" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- ============ messages ============
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  attachment_path text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON public.messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "participants read messages" ON public.messages;
CREATE POLICY "participants read messages" ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
DROP POLICY IF EXISTS "send messages" ON public.messages;
CREATE POLICY "send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "recipient marks read" ON public.messages;
CREATE POLICY "recipient marks read" ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

-- ============ sample_likes ============
CREATE TABLE IF NOT EXISTS public.sample_likes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sample_id uuid NOT NULL REFERENCES public.samples(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sample_id)
);
GRANT SELECT, INSERT, DELETE ON public.sample_likes TO authenticated;
GRANT SELECT ON public.sample_likes TO anon;
GRANT ALL ON public.sample_likes TO service_role;
ALTER TABLE public.sample_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "likes public read" ON public.sample_likes;
CREATE POLICY "likes public read" ON public.sample_likes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "users like" ON public.sample_likes;
CREATE POLICY "users like" ON public.sample_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users unlike" ON public.sample_likes;
CREATE POLICY "users unlike" ON public.sample_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ Notification triggers ============
CREATE OR REPLACE FUNCTION public.notify_new_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE follower_name text;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone') INTO follower_name FROM public.profiles WHERE id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (NEW.designer_id, 'follow', 'New follower', follower_name || ' started following you', '/');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_new_follow ON public.follows;
CREATE TRIGGER trg_notify_new_follow AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_follow();

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sender_name text;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone') INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (NEW.recipient_id, 'message', 'New message', sender_name || ': ' || left(NEW.body, 80), '/messages/' || NEW.sender_id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- Order status change notifier + completed_orders increment
CREATE OR REPLACE FUNCTION public.on_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'accepted' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.customer_id, 'order', 'Order accepted', 'Your order has been accepted', '/orders/' || NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.customer_id, 'order', 'Order rejected', 'Your order was rejected', '/orders/' || NEW.id);
    ELSIF NEW.status = 'delivered' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.customer_id, 'order', 'Preview delivered', 'Pay & purchase to unlock your file', '/orders/' || NEW.id);
    ELSIF NEW.status = 'paid' OR NEW.status = 'completed' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.designer_id, 'order', 'Payment received', 'Order marked complete', '/orders/' || NEW.id);
      UPDATE public.profiles SET completed_orders = completed_orders + 1 WHERE id = NEW.designer_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_on_order_status_change ON public.orders;
CREATE TRIGGER trg_on_order_status_change AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.on_order_status_change();

-- Notify designer of new order
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (NEW.designer_id, 'order', 'New order request', 'You received a new order', '/orders/' || NEW.id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_new_order ON public.orders;
CREATE TRIGGER trg_notify_new_order AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();

-- ============ Realtime publication ============
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.follows; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sample_likes; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
