-- 1. Sponsor ads: gif add-on + admin note, default pending
ALTER TABLE public.sponsor_ads ADD COLUMN IF NOT EXISTS gif_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.sponsor_ads ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE public.sponsor_ads ALTER COLUMN status SET DEFAULT 'draft';

-- 2. Purchase requests
CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_role text NOT NULL DEFAULT 'creator',
  item_type text NOT NULL,
  item_key text NOT NULL,
  item_label text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.purchase_requests TO authenticated;
GRANT ALL ON public.purchase_requests TO service_role;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase requests read own or admin" ON public.purchase_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "purchase requests insert own" ON public.purchase_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "purchase requests update own or admin" ON public.purchase_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_purchase_requests_updated_at BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Designer badge on public profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designer_badge text;

-- 4. Designer slots: default 5, owners may create their own row
ALTER TABLE public.designer_slots ALTER COLUMN total_slots SET DEFAULT 5;
GRANT SELECT, INSERT, UPDATE ON public.designer_slots TO authenticated;
GRANT SELECT ON public.designer_slots TO anon;
GRANT ALL ON public.designer_slots TO service_role;

DROP POLICY IF EXISTS "designers insert own slots" ON public.designer_slots;
CREATE POLICY "designers insert own slots" ON public.designer_slots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. Orders: designer payment QR
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_qr_path text;

-- 6. Notify designer when customer submits payment
CREATE OR REPLACE FUNCTION public.on_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  gained integer;
  new_points integer;
  new_cycles integer;
  new_count integer;
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
      VALUES (NEW.customer_id, 'order', 'Your order has been delivered', 'Please check your order — pay & purchase to unlock your file', '/orders/' || NEW.id);
    ELSIF NEW.status = 'payment_pending' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.designer_id, 'order', 'Customer submitted payment', 'The customer has paid — please verify and approve to release the file', '/orders/' || NEW.id);
    ELSIF NEW.status = 'paid' OR NEW.status = 'completed' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.designer_id, 'order', 'Payment confirmed', 'Order marked complete', '/orders/' || NEW.id);
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.customer_id, 'order', 'Payment approved', 'Your file is unlocked — download it now', '/orders/' || NEW.id);
      UPDATE public.profiles SET completed_orders = completed_orders + 1 WHERE id = NEW.designer_id;

      gained := 25 + (COALESCE(NEW.price, 0) / 10);
      SELECT value_points + gained, value_cycles, orders_placed + 1
        INTO new_points, new_cycles, new_count
      FROM public.profiles WHERE id = NEW.customer_id;

      IF new_points IS NOT NULL THEN
        WHILE new_points >= 1000 LOOP
          new_points := new_points - 1000;
          new_cycles := new_cycles + 1;
        END LOOP;

        UPDATE public.profiles
          SET orders_placed = new_count,
              total_spent = total_spent + COALESCE(NEW.price, 0),
              value_points = new_points,
              value_cycles = new_cycles
        WHERE id = NEW.customer_id;

        IF new_count >= 80 AND NOT EXISTS (
          SELECT 1 FROM public.user_ranks
          WHERE user_id = NEW.customer_id AND rank = 'supreme' AND expires_at > now()
        ) THEN
          INSERT INTO public.user_ranks (user_id, rank, expires_at)
          VALUES (NEW.customer_id, 'supreme', now() + interval '1 year');
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;