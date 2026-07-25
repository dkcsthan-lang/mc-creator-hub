
REVOKE EXECUTE ON FUNCTION public.notify_new_follow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_order_status_change() FROM PUBLIC, anon, authenticated;
