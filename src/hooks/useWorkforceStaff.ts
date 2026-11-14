import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkforceLive } from "@/hooks/useWorkforceLive";
import type { Staff } from "@/lib/workforce-roles";

export function useWorkforceStaff() {
  const [staff, setStaff] = useState<Record<string, Staff>>({});
  const load = useCallback(async () => {
    const { data } = await supabase.from("workforce_staff").select("dept_id,full_name,title,area,tools,duties");
    setStaff(Object.fromEntries(((data ?? []) as Staff[]).map(s => [s.dept_id, s])));
  }, []);
  useEffect(() => { load(); }, [load]);
  useWorkforceLive(load);
  return { staff, reload: load };
}
