DROP POLICY IF EXISTS "Authenticated users can read aggregate memory signals" ON public.ai_agent_memory_signals;
CREATE POLICY "Admins read memory signals" ON public.ai_agent_memory_signals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "product_embeddings public read" ON public.product_embeddings;
CREATE POLICY "Admins read product embeddings" ON public.product_embeddings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Authenticated can read playbook" ON public.ai_build_playbook;
CREATE POLICY "Admins read playbook" ON public.ai_build_playbook FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));