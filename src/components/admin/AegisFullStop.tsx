import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

/** MAXIMUM AI OS 43. KILL SWITCH — egy lépésben: minden ügynök leáll, végrehajtás tiltva, futó tervek leállítva, napló megőrizve. */
export default function AegisFullStop() {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const stop = async () => {
    if (!window.confirm("TELJES VÉSZLEÁLLÍTÁS: minden AI-segéd leáll, minden futó munkaterv megszakad. Biztos?")) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("aegis_full_stop", { _reason: reason });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Vészleállítás aktív · ${(data as { plans_stopped: number }).plans_stopped} terv leállítva`);
    setTimeout(() => window.location.reload(), 800);
  };
  return (
    <section className="border border-destructive p-4 space-y-2" aria-labelledby="full-stop">
      <h2 id="full-stop" className="text-lg font-medium text-destructive">KILL SWITCH · teljes vészleállítás</h2>
      <ul className="text-xs text-muted-foreground grid sm:grid-cols-2 gap-x-4">
        <li>1. Minden AI-segéd leáll</li><li>2. Munkatervlépés nem hajtható végre</li>
        <li>3. Jóváhagyott és futó tervek megszakadnak</li><li>4. Minden lépés a védett naplóba kerül</li>
      </ul>
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Indoklás (min. 20 karakter)" className="rounded-none text-xs" />
      <Button variant="destructive" className="rounded-none" disabled={busy || reason.trim().length < 20} onClick={stop}>TELJES LEÁLLÍTÁS</Button>
    </section>
  );
}
