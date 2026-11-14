-- AI meta changes may only be applied by backend/service code
REVOKE EXECUTE ON FUNCTION public.apply_meta_action(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_meta_action(uuid, uuid) TO service_role;

-- Drop inventory reservations go only through the drop-reserve function (service role)
REVOKE EXECUTE ON FUNCTION public.reserve_drop_slot(uuid, uuid, text, integer, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_drop_slot(uuid, uuid, text, integer, uuid, text, text) TO service_role;

-- Sales velocity is used only by procurement triggers
REVOKE EXECUTE ON FUNCTION public.calc_reorder_quantity(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calc_reorder_quantity(uuid, text) TO service_role;

-- Raffle drawing: never anonymous
REVOKE EXECUTE ON FUNCTION public.draw_raffle_winners(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.draw_raffle_winners(uuid) TO authenticated, service_role;

-- Knowledge usage bump: admins only
CREATE OR REPLACE FUNCTION public.bump_ai_knowledge_usage(_document_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.ai_knowledge_documents
  SET usage_count = usage_count + 1,
      last_used_at = now(),
      quality_score = LEAST(quality_score + 0.05, 5.0)
  WHERE id = ANY(COALESCE(_document_ids[1:50], '{}'::uuid[]));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.bump_ai_knowledge_usage(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bump_ai_knowledge_usage(uuid[]) TO authenticated, service_role;