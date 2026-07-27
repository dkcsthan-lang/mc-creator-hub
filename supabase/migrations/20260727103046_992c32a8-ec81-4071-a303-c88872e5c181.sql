
ALTER TABLE public.samples
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS attachment_path text;

CREATE TABLE IF NOT EXISTS public.sponsor_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  destination_url text NOT NULL,
  image_path text NOT NULL,
  duration_days integer NOT NULL,
  price integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sponsor_ads TO anon, authenticated;
GRANT INSERT, UPDATE ON public.sponsor_ads TO authenticated;
GRANT ALL ON public.sponsor_ads TO service_role;

ALTER TABLE public.sponsor_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sponsor ads public read active" ON public.sponsor_ads
  FOR SELECT TO anon, authenticated
  USING (status = 'active' AND expires_at > now());

CREATE POLICY "sponsor ads owner read" ON public.sponsor_ads
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "sponsor ads insert own" ON public.sponsor_ads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sponsor ads admin manage" ON public.sponsor_ads
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = user_id)
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = user_id);

CREATE TRIGGER trg_sponsor_ads_updated
BEFORE UPDATE ON public.sponsor_ads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
