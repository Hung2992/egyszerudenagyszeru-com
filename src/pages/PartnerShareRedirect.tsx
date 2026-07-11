import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const PartnerShareRedirect = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!code) {
      navigate("/", { replace: true });
      return;
    }

    const functionsBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
    window.location.replace(`${functionsBase}/partner-share-redirect?c=${encodeURIComponent(code)}`);
  }, [code, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="h-6 w-6 animate-spin rounded-none border-2 border-foreground border-t-transparent" />
    </div>
  );
};

export default PartnerShareRedirect;