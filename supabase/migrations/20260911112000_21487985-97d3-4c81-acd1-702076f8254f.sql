
CREATE TABLE public.comm_provider_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  label text NOT NULL,
  driver text NOT NULL CHECK (driver IN ('twilio','gatewayapi','http_generic')),
  channels text[] NOT NULL DEFAULT ARRAY['sms']::text[],
  endpoint text,
  credentials_encrypted text,
  default_sender text,
  priority integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  last_ok_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_provider_accounts TO authenticated;
GRANT ALL ON public.comm_provider_accounts TO service_role;
ALTER TABLE public.comm_provider_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner manages own provider accounts"
ON public.comm_provider_accounts FOR ALL TO authenticated
USING (
  (partner_id IS NOT NULL AND partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (partner_id IS NOT NULL AND partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TABLE public.comm_sender_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('sms','whatsapp','voice')),
  sender text NOT NULL,
  label text,
  verified boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_sender_numbers TO authenticated;
GRANT ALL ON public.comm_sender_numbers TO service_role;
ALTER TABLE public.comm_sender_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner manages own senders"
ON public.comm_sender_numbers FOR ALL TO authenticated
USING (
  (partner_id IS NOT NULL AND partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (partner_id IS NOT NULL AND partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);

CREATE INDEX idx_comm_provider_accounts_partner ON public.comm_provider_accounts(partner_id, active, priority);
CREATE INDEX idx_comm_sender_numbers_partner ON public.comm_sender_numbers(partner_id, channel, active);

CREATE TRIGGER trg_comm_provider_accounts_updated
BEFORE UPDATE ON public.comm_provider_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_comm_sender_numbers_updated
BEFORE UPDATE ON public.comm_sender_numbers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
