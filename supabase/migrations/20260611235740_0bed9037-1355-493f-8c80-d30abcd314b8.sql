ALTER TABLE public.accountant_access_log
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

CREATE INDEX IF NOT EXISTS accountant_access_log_action_idx
  ON public.accountant_access_log(action, created_at DESC);