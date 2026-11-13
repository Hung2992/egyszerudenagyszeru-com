CREATE TABLE public.ai_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_month date NOT NULL UNIQUE CHECK (billing_month = date_trunc('month', billing_month)::date),
  credits numeric NOT NULL CHECK (credits >= 0),
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL CHECK (currency IN ('HUF','USD','EUR')),
  invoice_ref text,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_invoices TO authenticated;
GRANT ALL ON public.ai_invoices TO service_role;
ALTER TABLE public.ai_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ai invoices" ON public.ai_invoices FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.empyrean_record_ai_invoice(_month date, _credits numeric, _amount numeric, _currency text, _ref text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE m date := date_trunc('month', _month)::date;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  IF m > current_date OR _credits < 0 OR _amount < 0 OR _currency NOT IN ('HUF','USD','EUR') THEN RAISE EXCEPTION 'invalid invoice' USING ERRCODE='22023'; END IF;
  INSERT INTO ai_invoices(billing_month, credits, amount, currency, invoice_ref, created_by) VALUES (m, _credits, _amount, _currency, _ref, auth.uid())
  ON CONFLICT (billing_month) DO UPDATE SET credits=EXCLUDED.credits, amount=EXCLUDED.amount, currency=EXCLUDED.currency, invoice_ref=EXCLUDED.invoice_ref, created_by=EXCLUDED.created_by, created_at=now();
  INSERT INTO empyrean_audit_log(actor_id, action, target, detail) VALUES (auth.uid(),'ai_invoice.record','ai_invoices', jsonb_build_object('month',m,'credits',_credits,'amount',_amount,'currency',_currency,'ref',_ref));
END $$;
REVOKE ALL ON FUNCTION public.empyrean_record_ai_invoice(date,numeric,numeric,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.empyrean_record_ai_invoice(date,numeric,numeric,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.ai_budget_state()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_catalog'
AS $function$
  WITH b AS (SELECT * FROM ai_budget WHERE id),
  u AS (SELECT coalesce(sum(c),0) AS used, coalesce(sum(n),0) AS calls, coalesce(sum(t),0) AS tokens FROM (
          SELECT estimated_cost_credits c, request_count n, token_count t FROM ai_usage_quota WHERE usage_date >= date_trunc('month', now())::date
          UNION ALL SELECT cost, calls, tokens FROM ai_usage_daily WHERE usage_date >= date_trunc('month', now())::date) x),
  inv AS (SELECT * FROM ai_invoices WHERE billing_month = date_trunc('month', now())::date)
  SELECT jsonb_build_object('used', round(u.used,4), 'calls', u.calls, 'tokens', u.tokens,
    'limit', b.monthly_limit_credits, 'warn_pct', b.warn_pct, 'block_at_limit', b.block_at_limit,
    'credit_price', b.credit_price, 'credit_currency', b.credit_currency,
    'invoice', (SELECT jsonb_build_object('credits', credits, 'amount', amount, 'currency', currency, 'ref', invoice_ref) FROM inv),
    'monthly_cost', CASE WHEN b.credit_price IS NOT NULL THEN round(u.used * b.credit_price, 2) END,
    'pct', CASE WHEN b.monthly_limit_credits > 0 THEN round(u.used / b.monthly_limit_credits * 100, 1) END,
    'state', CASE WHEN b.monthly_limit_credits > 0 AND u.used >= b.monthly_limit_credits THEN (CASE WHEN b.block_at_limit THEN 'blocked' ELSE 'over' END)
                  WHEN b.monthly_limit_credits > 0 AND u.used >= b.monthly_limit_credits * b.warn_pct / 100.0 THEN 'warn' ELSE 'ok' END)
  FROM b, u
$function$;

CREATE OR REPLACE FUNCTION public.empyrean_create_order(_product_id uuid, _qty integer, _customer_name text, _customer_email text, _shipping_huf integer, _payment_method text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p record; sub integer; tot integer; fee integer; num text; oid uuid; phys boolean;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  IF _qty IS NULL OR _qty < 1 OR _qty > 100 OR coalesce(_shipping_huf,-1) < 0 OR _shipping_huf > 1000000
     OR length(coalesce(_customer_name,'')) < 2 OR _customer_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     OR _payment_method NOT IN ('bank_transfer','cod','cash') THEN RAISE EXCEPTION 'invalid input' USING ERRCODE='22023'; END IF;
  SELECT * INTO p FROM partner_products WHERE id=_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'product not found'; END IF;
  phys := coalesce(to_jsonb(p)->>'product_type','physical') = 'physical';
  IF phys AND coalesce(p.stock_qty,0) < _qty THEN RAISE EXCEPTION 'not enough stock' USING ERRCODE='22023'; END IF;
  sub := round(coalesce((to_jsonb(p)->>'price_huf')::numeric,0))::int * _qty;
  tot := sub + _shipping_huf; fee := round(tot * 0.05);
  num := 'ADMIN-' || upper(to_hex(extract(epoch from now())::bigint)) || '-' || upper(substr(md5(random()::text),1,4));
  INSERT INTO partner_orders(partner_id, order_number, customer_email, customer_name, items, subtotal_huf, shipping_huf, total_huf,
    platform_fee_pct, platform_fee_huf, partner_payout_huf, status, payment_method, payment_status, notes)
  VALUES (p.partner_id, num, lower(_customer_email), _customer_name,
    jsonb_build_array(jsonb_build_object('product_id',p.id,'title',p.title,'qty',_qty,'unit_price_huf',sub/_qty,'line_total_huf',sub,'physical',phys)),
    sub, _shipping_huf, tot, 5, fee, tot - fee, 'pending', _payment_method, 'pending', 'Adminból rögzítve')
  RETURNING id INTO oid;
  IF phys THEN UPDATE partner_products SET stock_qty = stock_qty - _qty WHERE id=p.id; END IF;
  INSERT INTO empyrean_audit_log(actor_id, action, target, detail) VALUES (auth.uid(),'order.create','partner_orders', jsonb_build_object('order_id',oid,'product_id',p.id,'qty',_qty,'total',tot));
  RETURN jsonb_build_object('id',oid,'order_number',num,'total_huf',tot);
END $$;
REVOKE ALL ON FUNCTION public.empyrean_create_order(uuid,integer,text,text,integer,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.empyrean_create_order(uuid,integer,text,text,integer,text) TO authenticated;