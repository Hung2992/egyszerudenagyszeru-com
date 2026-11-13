import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { simulate } from "@/lib/aegis-os";
import { toast } from "sonner";

type P = { id: string; goal: string; risk: string; status: string };
/** 42. HUMAN GATE — jóváhagyás egy helyen: szimuláció, indoklás, jóváhagyás / elutasítás / megújítás. */
export default function AegisApprovalQueue({ plans, onDone }: { plans: P[]; onDone: () => void }) {
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (p: P, kind: "approve" | "reject" | "renew") => {
    const n = note[p.id] ?? "";
    if (kind === "reject" && !window.confirm("Biztosan elutasítod ezt a tervet?")) return;
    setBusy(p.id);
    const { error } = kind === "renew"
      ? await supabase.rpc("workforce_reapprove", { _plan: p.id, _note: n })
      : await supabase.rpc("workforce_set_status", { _plan: p.id, _status: kind === "approve" ? "approved" : "cancelled", _note: n || undefined });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(kind === "reject" ? "Elutasítva, naplózva" : "Jóváhagyva 72 órára, naplózva");
    onDone();
  };
  if (!plans.length) return <p className="text-xs text-muted-foreground">Nincs jóváhagyásra váró terv.</p>;
  return (
    <ul className="space-y-2">
      {plans.map((p) => {
        const sim = simulate(p.goal);
        const red = p.risk === "red";
        const n = (note[p.id] ?? "").trim();
        const blocked = red && n.length < 10;
        return (
          <li key={p.id} className={`border p-3 space-y-2 ${red ? "border-destructive" : "border-border"}`}>
            <p className="text-sm">{red ? "🔴" : p.risk === "yellow" ? "🟡" : "🟢"} {p.goal}</p>
            <p className="text-xs text-muted-foreground">
              {p.status === "draft" ? "Jóváhagyásra vár" : "A jóváhagyás lejárt — megújítás kell"} · Hatás: {sim.effects.join(", ")} · Visszaállítható: <span className={sim.rollback === "nincs" ? "text-destructive" : ""}>{sim.rollback}</span>
            </p>
            <Textarea value={note[p.id] ?? ""} onChange={(e) => setNote((s) => ({ ...s, [p.id]: e.target.value }))} maxLength={500}
              placeholder={red ? "Indoklás — piros tervhez kötelező (min. 10 karakter)" : "Megjegyzés (nem kötelező)"} className="rounded-none text-xs min-h-[60px]" />
            <div className="flex flex-wrap gap-2">
              {p.status === "draft" ? (
                <>
                  <Button size="sm" className="rounded-none" disabled={busy === p.id || blocked} onClick={() => act(p, "approve")}>Jóváhagyom</Button>
                  <Button size="sm" variant="outline" className="rounded-none" disabled={busy === p.id} onClick={() => act(p, "reject")}>Elutasítom</Button>
                </>
              ) : (
                <Button size="sm" className="rounded-none" disabled={busy === p.id || n.length < 10} onClick={() => act(p, "renew")}>Jóváhagyás megújítása</Button>
              )}
              {blocked && <span className="text-xs text-muted-foreground self-center">Írj indoklást a jóváhagyáshoz.</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
