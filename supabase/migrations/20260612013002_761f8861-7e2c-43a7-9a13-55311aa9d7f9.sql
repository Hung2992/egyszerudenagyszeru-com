
REVOKE EXECUTE ON FUNCTION public.get_partner_stats(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_partner_payout(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_partner_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_partner_payout(uuid, text) TO authenticated;
