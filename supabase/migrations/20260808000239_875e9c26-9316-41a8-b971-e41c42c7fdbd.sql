REVOKE ALL ON FUNCTION public.block_self_sample_interaction() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.block_self_follow() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_sample_likes() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_site_admin() FROM anon, authenticated;