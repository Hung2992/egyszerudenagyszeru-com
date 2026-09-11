REVOKE EXECUTE ON FUNCTION public.enqueue_marketing_automation(text, text, jsonb, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.marketing_on_profile_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.marketing_on_order_insert() FROM anon, authenticated;