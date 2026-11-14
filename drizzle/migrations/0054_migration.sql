CREATE TABLE public.social_partner_followups (
  partner_id uuid PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  interest text NOT NULL DEFAULT 'new' CHECK (interest IN ('new','contacted','interested','not_interested','contract')),
  note text CHECK (char_length(note) <= 1000),
  next_contact_on date,
  updated_by uuid NOT NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.social_partner_followups TO authenticated;
GRANT ALL ON public.social_partner_followups TO service_role;
ALTER TABLE public.social_partner_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage partner followups" ON public.social_partner_followups
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND updated_by = auth.uid());
CREATE OR REPLACE FUNCTION public.social_followup_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); NEW.updated_by := auth.uid(); RETURN NEW; END $$;
CREATE TRIGGER social_followup_touch BEFORE INSERT OR UPDATE ON public.social_partner_followups FOR EACH ROW EXECUTE FUNCTION public.social_followup_touch();