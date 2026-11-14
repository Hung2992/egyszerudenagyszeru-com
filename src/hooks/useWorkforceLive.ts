import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Élő frissítés: a tervek/lépések bármely változásakor (HUMAN GATE jóváhagyás, rögzített lépés)
// újratölti a nézetet. Csak olvas — a napló egyszer, a szerveroldali RPC-ben készül.
export function useWorkforceLive(onChange: () => void) {
  const cb = useRef(onChange); cb.current = onChange;
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const fire = () => { clearTimeout(t); t = setTimeout(() => cb.current(), 400); };
    const ch = supabase.channel(`wf-live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workforce_plans" }, fire)
      .on("postgres_changes", { event: "*", schema: "public", table: "workforce_plan_steps" }, fire)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_agent_bus_events" }, fire)
      .on("postgres_changes", { event: "*", schema: "public", table: "workforce_staff" }, fire)
      .subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(ch); };
  }, []);
}
