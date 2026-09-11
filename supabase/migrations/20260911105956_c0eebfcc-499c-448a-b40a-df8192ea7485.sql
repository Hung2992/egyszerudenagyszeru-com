REVOKE EXECUTE ON FUNCTION public.dispatch_messaging_outbox() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.messaging_outbox_wake() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_order_shipped_messaging() FROM PUBLIC, anon, authenticated;