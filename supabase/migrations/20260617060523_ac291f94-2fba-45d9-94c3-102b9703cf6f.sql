CREATE OR REPLACE FUNCTION public.update_contract_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.partner_signed_at IS NOT NULL AND OLD.partner_signed_at IS NULL THEN
    NEW.contract_hash := encode(extensions.digest(
      (coalesce(NEW.contract_body,'') || '|' ||
       coalesce(NEW.contract_number,'') || '|' ||
       coalesce(NEW.partner_signature_name,'') || '|' ||
       coalesce(to_char(NEW.partner_signed_at,'YYYY-MM-DD"T"HH24:MI:SS.MSOF'),''))::bytea,
      'sha256'::text), 'hex');
    NEW.locked_at := now();
  END IF;

  IF NEW.status = 'rejected' OR NEW.status = 'needs_correction' THEN
    NULL;
  ELSIF NEW.owner_signed_at IS NOT NULL AND NEW.partner_signed_at IS NOT NULL THEN
    NEW.status := 'signed';
    IF NEW.effective_from IS NULL THEN
      NEW.effective_from := CURRENT_DATE;
    END IF;
  ELSIF NEW.partner_signed_at IS NOT NULL THEN
    NEW.status := 'pending_admin_countersign';
  ELSE
    NEW.status := 'pending_partner_signature';
  END IF;

  RETURN NEW;
END;
$$;