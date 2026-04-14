
-- Notification rules
CREATE TABLE public.notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  name TEXT NOT NULL,
  email_template TEXT,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}',
  channels TEXT[] DEFAULT ARRAY['email'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notification rules" ON public.notification_rules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Notification log
CREATE TABLE public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.notification_rules(id),
  recipient_email TEXT,
  recipient_user_id UUID REFERENCES auth.users(id),
  channel TEXT DEFAULT 'email',
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notification log" ON public.notification_log FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Customer groups
CREATE TABLE public.customer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB DEFAULT '{}',
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage customer groups" ON public.customer_groups FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Customer group members
CREATE TABLE public.customer_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.customer_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.customer_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage group members" ON public.customer_group_members FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Wishlists
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.shop_products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlist" ON public.wishlists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins view all wishlists" ON public.wishlists FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Review settings (single row config)
CREATE TABLE public.review_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_approve BOOLEAN DEFAULT false,
  min_word_count INTEGER DEFAULT 3,
  require_purchase BOOLEAN DEFAULT false,
  spam_filter_enabled BOOLEAN DEFAULT true,
  banned_words TEXT[] DEFAULT ARRAY[]::TEXT[],
  max_reviews_per_product INTEGER DEFAULT 1,
  allow_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.review_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage review settings" ON public.review_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read review settings" ON public.review_settings FOR SELECT USING (true);

-- Tax rates
CREATE TABLE public.tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 27,
  country TEXT DEFAULT 'HU',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  applies_to TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tax rates" ON public.tax_rates FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read tax rates" ON public.tax_rates FOR SELECT USING (true);

-- Invoice settings (single row config)
CREATE TABLE public.invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix TEXT DEFAULT 'INV',
  next_number INTEGER DEFAULT 1,
  company_name TEXT,
  company_address TEXT,
  company_tax_number TEXT,
  company_bank_account TEXT,
  footer_note TEXT,
  auto_generate BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invoice settings" ON public.invoice_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
