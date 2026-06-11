import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";

/**
 * Megnézi, hogy a bejelentkezett felhasználó könyvelő vagy admin-e.
 * Admin is hozzáfér a könyvelői felülethez (felügyelet).
 */
export const useAccountantCheck = () => {
  const [allowed, setAllowed] = useState(false);
  const [role, setRole] = useState<"admin" | "accountant" | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const check = async (uid: string) => {
      const [adminRes, accRes] = await Promise.all([
        supabase.rpc("has_role", { _user_id: uid, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: uid, _role: "accountant" }),
      ]);
      if (adminRes.data) { setRole("admin"); setAllowed(true); }
      else if (accRes.data) { setRole("accountant"); setAllowed(true); }
      else { setRole(null); setAllowed(false); }
    };

    const apply = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      if (!session?.user) {
        setUserId(null); setEmail(null); setRole(null); setAllowed(false); setLoading(false);
        return;
      }
      setUserId(session.user.id);
      setEmail(session.user.email ?? null);
      await check(session.user.id);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => void apply(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => void apply(session), 0);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { allowed, role, loading, userId, email };
};
