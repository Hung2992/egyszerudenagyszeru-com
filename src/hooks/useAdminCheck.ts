import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";

const withTimeout = async <T,>(promiseLike: PromiseLike<T>, ms = 5000): Promise<T | null> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), ms);
  });
  const result = await Promise.race([Promise.resolve(promiseLike), timeout]);
  if (timeoutId) clearTimeout(timeoutId);
  return result;
};

export const useAdminCheck = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async (currentUserId: string) => {
      const result = await withTimeout(supabase.rpc("has_role", {
        _user_id: currentUserId,
        _role: "admin",
      }), 5000);

      if (!result) {
        console.error("Admin role check timed out");
        setIsAdmin(false);
        return;
      }

      const { data, error } = result;

      if (error) {
        console.error("Admin role check failed:", error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(!!data);
    };

    const applySession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      if (!session?.user) {
        setUserId(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setUserId(session.user.id);
      await checkAdmin(session.user.id);
      setLoading(false);
    };

    const syncSession = async () => {
      const result = await withTimeout(supabase.auth.getSession(), 5000);

      if (!result) {
        console.error("Auth session check timed out");
        setUserId(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = result;

      await applySession(session);
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        void applySession(session);
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isAdmin, loading, userId };
};
