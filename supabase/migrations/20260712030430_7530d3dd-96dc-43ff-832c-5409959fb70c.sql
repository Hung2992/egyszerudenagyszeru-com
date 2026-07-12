-- Új drops_manager szerepkör hozzáadása
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'drops_manager';

COMMIT;

-- Segéd security definer, amely admin VAGY drops_manager jogot fogad el
CREATE OR REPLACE FUNCTION public.can_manage_drops(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role, 'drops_manager'::public.app_role)
  );
$$;

-- Meglévő drop-tábla policy-k kiterjesztése a drops_manager szerepre.
-- Ha bármelyik hiányzik, csendben átugorjuk.
DO $$
BEGIN
  -- product_drops
  DROP POLICY IF EXISTS "Admins manage drops" ON public.product_drops;
  DROP POLICY IF EXISTS "Drop managers manage drops" ON public.product_drops;
  CREATE POLICY "Drop managers manage drops"
    ON public.product_drops
    FOR ALL TO authenticated
    USING (public.can_manage_drops(auth.uid()))
    WITH CHECK (public.can_manage_drops(auth.uid()));

  -- drop_raffle_entries — csak olvasás/export a drops_manager számára
  DROP POLICY IF EXISTS "Drop managers view raffle entries" ON public.drop_raffle_entries;
  CREATE POLICY "Drop managers view raffle entries"
    ON public.drop_raffle_entries
    FOR SELECT TO authenticated
    USING (public.can_manage_drops(auth.uid()));

  -- drop_reservations
  DROP POLICY IF EXISTS "Drop managers view reservations" ON public.drop_reservations;
  CREATE POLICY "Drop managers view reservations"
    ON public.drop_reservations
    FOR SELECT TO authenticated
    USING (public.can_manage_drops(auth.uid()));

  -- drop_notifications
  DROP POLICY IF EXISTS "Drop managers view notifications" ON public.drop_notifications;
  CREATE POLICY "Drop managers view notifications"
    ON public.drop_notifications
    FOR SELECT TO authenticated
    USING (public.can_manage_drops(auth.uid()));
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

GRANT EXECUTE ON FUNCTION public.can_manage_drops(uuid) TO authenticated;