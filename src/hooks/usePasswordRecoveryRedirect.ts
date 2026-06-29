import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { logRecoveryEvent } from "@/lib/password-recovery-analytics";

export const usePasswordRecoveryRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const isRecoveryUrl =
      (hash.includes("type=recovery") || search.includes("type=recovery")) &&
      location.pathname !== "/reset-password";

    if (isRecoveryUrl) {
      logRecoveryEvent("link_opened", {
        via: hash.includes("type=recovery") ? "hash" : "query",
        from: location.pathname,
      });
      navigate(`/reset-password${search}${hash}`, { replace: true });
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/reset-password") {
        logRecoveryEvent("link_opened", { via: "auth_event" });
        navigate(
          `/reset-password${window.location.search}${window.location.hash}`,
          { replace: true }
        );
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);
};
