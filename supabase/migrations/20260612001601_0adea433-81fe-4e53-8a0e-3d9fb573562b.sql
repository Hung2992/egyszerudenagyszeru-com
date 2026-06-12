
ALTER TABLE public.pending_accountant_invites
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  ADD COLUMN IF NOT EXISTS resend_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;

UPDATE public.pending_accountant_invites
  SET expires_at = invited_at + interval '7 days'
  WHERE expires_at < invited_at;
