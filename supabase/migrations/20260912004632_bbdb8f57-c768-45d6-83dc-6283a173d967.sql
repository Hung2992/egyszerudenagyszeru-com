CREATE OR REPLACE FUNCTION public.enforce_partner_contract_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF NEW.contract_body IS DISTINCT FROM OLD.contract_body
     OR NEW.owner_signed_at IS DISTINCT FROM OLD.owner_signed_at
     OR NEW.owner_signed_by IS DISTINCT FROM OLD.owner_signed_by
     OR NEW.owner_signature_name IS DISTINCT FROM OLD.owner_signature_name
     OR NEW.owner_signature_ip IS DISTINCT FROM OLD.owner_signature_ip
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.kyc_submission_id IS DISTINCT FROM OLD.kyc_submission_id
     OR NEW.contract_number IS DISTINCT FROM OLD.contract_number
     OR NEW.contract_version IS DISTINCT FROM OLD.contract_version
     OR NEW.partner_full_name IS DISTINCT FROM OLD.partner_full_name
     OR NEW.partner_birth_name IS DISTINCT FROM OLD.partner_birth_name
     OR NEW.partner_birth_place IS DISTINCT FROM OLD.partner_birth_place
     OR NEW.partner_birth_date IS DISTINCT FROM OLD.partner_birth_date
     OR NEW.partner_mother_name IS DISTINCT FROM OLD.partner_mother_name
     OR NEW.partner_address IS DISTINCT FROM OLD.partner_address
     OR NEW.partner_id_card_number IS DISTINCT FROM OLD.partner_id_card_number
     OR NEW.partner_tax_id IS DISTINCT FROM OLD.partner_tax_id
     OR NEW.partner_email IS DISTINCT FROM OLD.partner_email
     OR NEW.partner_phone IS DISTINCT FROM OLD.partner_phone
     OR NEW.owner_name IS DISTINCT FROM OLD.owner_name
     OR NEW.owner_representative IS DISTINCT FROM OLD.owner_representative
     OR NEW.owner_tax_number IS DISTINCT FROM OLD.owner_tax_number
     OR NEW.owner_address IS DISTINCT FROM OLD.owner_address
     OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
     OR NEW.terminated_at IS DISTINCT FROM OLD.terminated_at
     OR NEW.termination_reason IS DISTINCT FROM OLD.termination_reason
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.correction_notes IS DISTINCT FROM OLD.correction_notes
     OR NEW.owner_profile_version IS DISTINCT FROM OLD.owner_profile_version
     OR NEW.contract_pdf_path IS DISTINCT FROM OLD.contract_pdf_path
  THEN
    RAISE EXCEPTION 'Partners may only update signature fields';
  END IF;

  RETURN NEW;
END;
$$;