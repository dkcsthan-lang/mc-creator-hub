CREATE POLICY "anyone can see designer roles" ON public.user_roles
FOR SELECT TO anon, authenticated
USING (role = 'designer'::app_role);
GRANT SELECT ON public.user_roles TO anon;