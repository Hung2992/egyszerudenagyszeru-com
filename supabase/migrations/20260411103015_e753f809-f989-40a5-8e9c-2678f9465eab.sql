ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS card_holder_name text,
ADD COLUMN IF NOT EXISTS card_last4 text;