import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Activity, Loader2, Sparkles, ShieldCheck } from "lucide-react";

export type HealthArea = { key: string; label: string; value: number };
export type Health = {
  score: number;
  areas: HealthArea[];
  expiring_soon: number;
  open_issues: number;
  audit_ok: boolean;
};

type PlanStep = {
  action_id: string;
  plan_id: string;
  action: string;
  label: string;
  why: string;
  severity: string;
  domain: string;
  target_type: string;
  target_id: string;
  customer_email?: string | null;
  days?: number;
};

interface Props {
  partnerId: string;
  health: Health | null;
  issues: any[];
  onExecuted: () => void | Promise<void>;
}

const tone = (v: number) => (v >= 95 ? "🟢" : v >= 85 ? "🟡" : "🔴");

export default function FulfillmentHealthPanel({ partnerId, health, issues, onExecuted }: Props) {
  const [planning, setPlanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState<string>("");
  const [steps, setSteps] = useState<PlanStep[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const buildPlan = async () => {
    setPlanning(true);
    const { data, error } = await supabase.functions.invoke("partner-fulfillment-center", {
      body: { partner_id: partnerId, action: "plan", issues },
    });
    setPlanning(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "A terv készítése nem sikerült");
      return;
    }
    const s = ((data as any).steps || []) as PlanStep[];
    if (!s.length) { toast.success("✅ Nincs végrehajtandó javítás — minden rendben."); return; }
    setPlanId((data as any).plan_id);
    setSteps(s);
    setSelected(Object.fromEntries(s.map((x) => [x.action_id, true])));
    setOpen(true);
  };

  const execute = async () => {
    const chosen = steps.filter((s) => selected[s.action_id]);
    if (!chosen.length) { toast.info("Nincs kiválasztott művelet."); return; }
    setExecuting(true);
    const { data, error } = await supabase.functions.invoke("partner-fulfillment-center", {
      body: { partner_id: partnerId, action: "execute_plan", plan_id: planId, steps: chosen },
    });
    setExecuting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "A terv végrehajtása nem sikerült");
      return;
    }
    const d = data as any;
    toast.success(`✅ ${d.succeeded} művelet végrehajtva${d.failed ? `, ${d.failed} sikertelen` : ""} — minden naplózva`);
    setOpen(false);
    await onExecuted();
  };

  if (!health) return null;

  return (
    <>
      <Card className="rounded-none border-primary/40">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-semibold">
                  {tone(health.score)} Fulfillment Health: {health.score}/100
                </div>
                <p className="text-xs text-muted-foreground">
                  Az AI felismer és javasol — végrehajtani csak a te jóváhagyásoddal, szerveroldalon tud.
                </p>
              </div>
            </div>
            <Button size="sm" className="rounded-none" onClick={buildPlan} disabled={planning}>
              {planning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              🤖 Optimalizáld
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {health.areas.map((a) => (
              <div key={a.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{a.label}</span>
                  <span className="font-mono">{tone(a.value)} {a.value}%</span>
                </div>
                <Progress value={a.value} className="h-1.5 rounded-none" />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="rounded-none">⏰ Lejáró hozzáférések: {health.expiring_soon}</Badge>
            <Badge variant="outline" className="rounded-none">⚠️ Nyitott problémák: {health.open_issues}</Badge>
            <Badge variant="outline" className="rounded-none">📋 Audit: {health.audit_ok ? "🟢 Rendben" : "🔴 Hiba"}</Badge>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-none max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">AI ACTION PLAN</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Terv azonosító: <span className="font-mono">{planId.slice(0, 8)}</span> — minden végrehajtott lépés saját művelet-azonosítót és before/after naplóbejegyzést kap.
          </p>

          <div className="space-y-2">
            {steps.map((s, idx) => (
              <div key={s.action_id} className="border p-3 flex flex-wrap items-start justify-between gap-2 text-sm">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={!!selected[s.action_id]}
                    onCheckedChange={(v) => setSelected((p) => ({ ...p, [s.action_id]: !!v }))}
                    className="rounded-none mt-1"
                  />
                  <div>
                    <div className="font-medium">{idx + 1}. {s.label}</div>
                    <div className="text-xs text-muted-foreground">
                      → {s.why} · {s.customer_email || s.target_id.slice(0, 8)} · {s.target_type}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">action_id: {s.action_id.slice(0, 8)}</div>
                  </div>
                </div>
                {s.action === "extend_access" && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground">nap:</span>
                    <Input
                      type="number" min={1} max={365} value={s.days ?? 30}
                      onChange={(e) =>
                        setSteps((p) => p.map((x) => (x.action_id === s.action_id ? { ...x, days: Number(e.target.value) } : x)))
                      }
                      className="rounded-none h-8 w-20"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" className="rounded-none" onClick={() => setOpen(false)}>Elutasítás</Button>
            <Button variant="outline" className="rounded-none"
              onClick={() => setSelected(Object.fromEntries(steps.map((s) => [s.action_id, false])))}>
              Kijelölés törlése
            </Button>
            <Button className="rounded-none" onClick={execute} disabled={executing}>
              {executing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Összes jóváhagyása ({steps.filter((s) => selected[s.action_id]).length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
