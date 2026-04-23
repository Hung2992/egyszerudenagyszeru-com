
-- Set view to security_invoker so it respects the querying user's RLS
ALTER VIEW public.product_polls_public SET (security_invoker = true);

-- Re-grant after alter
GRANT SELECT ON public.product_polls_public TO anon, authenticated;
