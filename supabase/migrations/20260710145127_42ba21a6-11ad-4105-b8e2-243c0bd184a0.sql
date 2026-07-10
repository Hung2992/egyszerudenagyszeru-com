
-- Audit log for admin marketing_campaigns operations
CREATE TABLE public.marketing_campaign_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID,
  campaign_name TEXT,
  action TEXT NOT NULL, -- 'create' | 'update' | 'delete' | 'schedule' | 'send'
  actor_id UUID,
  actor_email TEXT,
  old_data JSONB,
  new_data JSONB,
  status_from TEXT,
  status_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.marketing_campaign_audit_log TO authenticated;
GRANT ALL ON public.marketing_campaign_audit_log TO service_role;

ALTER TABLE public.marketing_campaign_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view marketing audit log"
  ON public.marketing_campaign_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert marketing audit log"
  ON public.marketing_campaign_audit_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_mkt_audit_campaign ON public.marketing_campaign_audit_log(campaign_id, created_at DESC);
CREATE INDEX idx_mkt_audit_created ON public.marketing_campaign_audit_log(created_at DESC);

-- Automatic audit trigger
CREATE OR REPLACE FUNCTION public.log_marketing_campaign_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_email TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'sent' THEN v_action := 'send';
      ELSIF NEW.status = 'scheduled' THEN v_action := 'schedule';
      ELSE v_action := 'update';
      END IF;
    ELSE
      v_action := 'update';
    END IF;
  END IF;

  BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN v_email := NULL;
  END;

  INSERT INTO public.marketing_campaign_audit_log(
    campaign_id, campaign_name, action, actor_id, actor_email,
    old_data, new_data, status_from, status_to
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.name, OLD.name),
    v_action,
    auth.uid(),
    v_email,
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END,
    CASE WHEN TG_OP <> 'INSERT' THEN OLD.status END,
    CASE WHEN TG_OP <> 'DELETE' THEN NEW.status END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_campaign_audit ON public.marketing_campaigns;
CREATE TRIGGER trg_marketing_campaign_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.log_marketing_campaign_changes();
