import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";

/**
 * Global guard: ha a Supabase visszairányít egy jelszó-visszaállító linkről
 * (akár hash-ben akár query-ben jön a token), akkor automatikusan a
 * /reset-password oldalra navigáljuk, megőrizve a tokent.
 *
 * Ez megoldja azt az esetet, amikor a Supabase Auth redirect allow listán
 * nincs rajta a /reset-password és a felhasználó a főoldalra esik vissza.
 */
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
      navigate(`/reset-password${search}${hash}`, { replace: true });
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/reset-password") {
        navigate(
          `/reset-password${window.location.search}${window.location.hash}`,
          { replace: true }
        );
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);
};
