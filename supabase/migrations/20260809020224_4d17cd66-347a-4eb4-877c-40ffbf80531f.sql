ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS orders_placed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS value_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS value_cycles integer NOT NULL DEFAULT 0;

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
      VALUES (NEW.customer_id, 'order', 'Preview delivered', 'Pay & purchase to unlock your file', '/orders/' || NEW.id);
    ELSIF NEW.status = 'paid' OR NEW.status = 'completed' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.designer_id, 'order', 'Payment received', 'Order marked complete', '/orders/' || NEW.id);
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

WITH agg AS (
  SELECT customer_id, count(*)::int AS cnt, COALESCE(sum(price), 0)::int AS spent,
         COALESCE(sum(25 + price / 10), 0)::int AS pts
  FROM public.orders
  WHERE status IN ('paid', 'completed')
  GROUP BY customer_id
)
UPDATE public.profiles p
SET orders_placed = agg.cnt,
    total_spent = agg.spent,
    value_points = agg.pts % 1000,
    value_cycles = agg.pts / 1000
FROM agg
WHERE p.id = agg.customer_id;