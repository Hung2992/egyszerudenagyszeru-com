import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/** MAXIMUM AI OS 17. TEMPORARY PRIVILEGE — piros terv csak rövid, indokolt, lejáró időablakban hajtható végre. */
export default function AegisPrivilege({ planId, onChange }: { planId: string; onChange?: () => void }) {
  const [active, setActive] = useState<{ expires_at: string } | null>(null);
  const [mins, setMins] = useState(30);
  const [reason, setReason] = useState("");
  const [, tick] = useState(0);
  const load = () => supabase.from("aegis_privilege_grants").select("expires_at").eq("plan_id", planId).is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle().then(({ data }) => setActive(data));
  useEffect(() => { load(); const t = setInterval(() => tick((x) => x + 1), 15000); return () => clearInterval(t); }, [planId]);
  const live = active && new Date(active.expires_at) > new Date();
  const grant = async () => {
    const { error } = await supabase.rpc("aegis_grant_privilege", { _plan: planId, _minutes: mins, _reason: reason });
    if (error) return toast.error(error.message);
    toast.success(`Ideiglenes jogosultság ${mins} percre`); setReason(""); load(); onChange?.();
  };
  const revoke = async () => {
    const { error } = await supabase.rpc("aegis_revoke_privilege", { _plan: planId, _reason: "kézi visszavonás" });
    if (error) return toast.error(error.message);
    toast.success("Jogosultság visszavonva"); load(); onChange?.();
  };
  return (
    <div className="border border-destructive/60 p-2 space-y-1 text-xs" aria-label="Ideiglenes jogosultság">
      <p className="uppercase tracking-wide text-destructive">AEGIS · ideiglenes jogosultság (piros terv)</p>
      {live ? (
        <div className="flex flex-wrap items-center gap-2">
          <span>Érvényes eddig: <strong>{new Date(active!.expires_at).toLocaleTimeString("hu-HU")}</strong> — utána automatikusan megszűnik.</span>
          <Button size="sm" variant="outline" className="rounded-none h-7" onClick={revoke}>Visszavonás most</Button>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground">Lépést csak érvényes időablakban lehet végrehajtani. Terv végén, vészleállításkor vagy tartalomeltérésnél magától visszavonódik.</p>
          <div className="flex flex-wrap gap-2">
            <Input type="number" min={5} max={240} value={mins} onChange={(e) => setMins(Number(e.target.value))} className="rounded-none h-8 w-24" aria-label="Perc" />
            <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Indoklás (min. 20 karakter)" className="rounded-none h-8 flex-1 min-w-48" />
            <Button size="sm" className="rounded-none h-8" disabled={reason.trim().length < 20 || mins < 5 || mins > 240} onClick={grant}>Időablak kérése</Button>
          </div>
        </>
      )}
    </div>
  );
}
