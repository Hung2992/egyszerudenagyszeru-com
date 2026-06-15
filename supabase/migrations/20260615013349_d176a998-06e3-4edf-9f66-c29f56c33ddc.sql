GRANT SELECT, INSERT, UPDATE ON public.tenant_kyc_submissions TO authenticated;
GRANT ALL ON public.tenant_kyc_submissions TO service_role;

GRANT SELECT, INSERT ON public.tenant_kyc_audit_log TO authenticated;
GRANT ALL ON public.tenant_kyc_audit_log TO service_role;