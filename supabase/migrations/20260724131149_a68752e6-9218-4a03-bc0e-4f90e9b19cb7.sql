
-- ===== Roles =====
CREATE TYPE public.app_role AS ENUM ('customer', 'designer', 'admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== Profiles =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  bio text,
  avatar_url text,
  banner_url text,
  gif_avatar_url text,
  membership text NOT NULL DEFAULT 'free', -- free/silver/golden/ultimate/legacy/booster
  designer_tag text, -- hero/diamond/greater
  is_banned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles public read" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Auto profile + role on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Admin bootstrap for redboiiop15@gmail.com =====
CREATE OR REPLACE FUNCTION public.grant_site_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) = 'redboiiop15@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_confirmed_grant_admin
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_site_admin();

-- ===== Designer applications =====
CREATE TABLE public.designer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact text NOT NULL,
  intro text NOT NULL,
  category text NOT NULL,
  portfolio_url text,
  age_group text NOT NULL,
  why_join text NOT NULL,
  extra text,
  samples_paths text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending', -- pending/approved/rejected
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.designer_applications TO authenticated;
GRANT ALL ON public.designer_applications TO service_role;
ALTER TABLE public.designer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own applications" ON public.designer_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users insert own application" ON public.designer_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins update applications" ON public.designer_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_apps_updated_at BEFORE UPDATE ON public.designer_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Samples =====
CREATE TABLE public.samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  game_type text NOT NULL DEFAULT 'minecraft',
  image_url text NOT NULL,
  price integer NOT NULL CHECK (price >= 10),
  status text NOT NULL DEFAULT 'pending', -- pending/approved/rejected
  views integer NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.samples TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.samples TO authenticated;
GRANT ALL ON public.samples TO service_role;
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved samples public read" ON public.samples FOR SELECT TO anon, authenticated
  USING (status = 'approved');
CREATE POLICY "designers read own samples" ON public.samples FOR SELECT TO authenticated
  USING (auth.uid() = designer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "designers insert own samples" ON public.samples FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = designer_id AND public.has_role(auth.uid(), 'designer'));
CREATE POLICY "designers update own samples" ON public.samples FOR UPDATE TO authenticated
  USING (auth.uid() = designer_id) WITH CHECK (auth.uid() = designer_id);
CREATE POLICY "designers delete own samples" ON public.samples FOR DELETE TO authenticated
  USING (auth.uid() = designer_id);
CREATE POLICY "admins manage samples" ON public.samples FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_samples_updated_at BEFORE UPDATE ON public.samples FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Sample ratings =====
CREATE TABLE public.sample_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id uuid NOT NULL REFERENCES public.samples(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sample_id, user_id)
);
GRANT SELECT ON public.sample_ratings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sample_ratings TO authenticated;
GRANT ALL ON public.sample_ratings TO service_role;
ALTER TABLE public.sample_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings public read" ON public.sample_ratings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "users manage own ratings" ON public.sample_ratings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== Orders =====
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  designer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  details text NOT NULL,
  reference_url text,
  attachment_paths text[] NOT NULL DEFAULT '{}',
  price integer NOT NULL CHECK (price >= 10),
  deadline date,
  status text NOT NULL DEFAULT 'requested', -- requested/accepted/rejected/delivered/paid/cancelled
  deliverable_path text,
  delivered_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read orders" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = designer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "customers create orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "participants update orders" ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = designer_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = customer_id OR auth.uid() = designer_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Reports =====
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sample_id uuid REFERENCES public.samples(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users create reports" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "admins read reports" ON public.reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = reporter_id);
CREATE POLICY "admins update reports" ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== Mock purchases (memberships/tags/slots) =====
CREATE TABLE public.mock_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL, -- membership/tag/slots
  item_key text NOT NULL,  -- silver/golden/ultimate/legacy/booster/hero/diamond/greater/slot1/slot5/slot10
  price integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mock_purchases TO authenticated;
GRANT ALL ON public.mock_purchases TO service_role;
ALTER TABLE public.mock_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own purchases" ON public.mock_purchases FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users create own purchases" ON public.mock_purchases FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ===== Designer ranks =====
CREATE TABLE public.user_ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rank text NOT NULL, -- legendry/goat/awarded/professional
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);
GRANT SELECT ON public.user_ranks TO anon, authenticated;
GRANT ALL ON public.user_ranks TO service_role;
ALTER TABLE public.user_ranks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ranks public read" ON public.user_ranks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage ranks" ON public.user_ranks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== Designer slots =====
CREATE TABLE public.designer_slots (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_slots integer NOT NULL DEFAULT 3,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.designer_slots TO anon, authenticated;
GRANT INSERT, UPDATE ON public.designer_slots TO authenticated;
GRANT ALL ON public.designer_slots TO service_role;
ALTER TABLE public.designer_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slots public read" ON public.designer_slots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage slots" ON public.designer_slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== Notifications =====
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- ===== Storage RLS =====
-- avatars: public read, owner write (path prefix = user id)
CREATE POLICY "avatars public read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- samples: public read, designer write in own folder
CREATE POLICY "samples public read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'samples');
CREATE POLICY "samples owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'samples' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "samples owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'samples' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "samples owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'samples' AND auth.uid()::text = (storage.foldername(name))[1]);

-- applications: private; owner + admin
CREATE POLICY "applications owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'applications' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "applications owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'applications' AND auth.uid()::text = (storage.foldername(name))[1]);

-- order-files: private; participants only (path prefix = order id, membership resolved via orders row)
CREATE POLICY "order-files participants read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-files' AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND (o.customer_id = auth.uid() OR o.designer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY "order-files participants write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'order-files' AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND (o.customer_id = auth.uid() OR o.designer_id = auth.uid())
    )
  );

-- Indexes
CREATE INDEX idx_samples_status_created ON public.samples(status, created_at DESC);
CREATE INDEX idx_samples_designer ON public.samples(designer_id);
CREATE INDEX idx_samples_category ON public.samples(category);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_designer ON public.orders(designer_id);
CREATE INDEX idx_notifs_user ON public.notifications(user_id, read, created_at DESC);
