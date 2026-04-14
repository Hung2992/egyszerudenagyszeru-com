import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";

export const useAdminCheck = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async (currentUserId: string) => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: currentUserId,
        _role: "admin",
      });

      if (error) {
        console.error("Admin role check failed:", error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(!!data);
    };

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

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

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setUserId(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setUserId(session.user.id);
      await checkAdmin(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isAdmin, loading, userId };
};
