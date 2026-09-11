CREATE TABLE public.comm_opt_outs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms','whatsapp','voice','email')),
  address TEXT NOT NULL,
  reason TEXT,
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opted_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partner_id, channel, address)
);
GRANT SELECT ON public.comm_opt_outs TO authenticated;
GRANT ALL ON public.comm_opt_outs TO service_role;
ALTER TABLE public.comm_opt_outs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partnerek a saját leiratkozóikat látják" ON public.comm_opt_outs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()));

CREATE TABLE public.comm_inbound_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('sms','whatsapp','voice')),
  from_address TEXT NOT NULL,
  body TEXT NOT NULL,
  provider_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.comm_inbound_messages TO service_role;
ALTER TABLE public.comm_inbound_messages ENABLE ROW LEVEL SECURITY;