REVOKE EXECUTE ON FUNCTION public.can_manage_drops(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_drops(uuid) TO authenticated, service_role;