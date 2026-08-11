// AI intézkedések: cél → elemzés → terv → jóváhagyás → végrehajtás → mérés → tanulás.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2, Rocket, CheckCircle2, XCircle, BarChart3, Target, Undo2, ScrollText } from "lucide-react";
import PartnerAutopilotCard from "./PartnerAutopilotCard";
import PartnerActionAuditTrail from "./PartnerActionAuditTrail";

interface Props { partnerId: string }

interface Step {
  idx: number; type: string; title: string; why: string; impact: string;
  state?: string; result?: string; risk?: string; params?: Record<string, unknown>;
}
interface Plan {
  id: string; goal: string; summary: string | null; status: string;
  expected_impact: string | null; risk_level: string | null;
  steps: Step[]; result: Record<string, number> | null; created_at: string;
  approved_by_email?: string | null; approved_at?: string | null;
  approval_mode?: string | null; source?: string | null;
  correlation_id?: string | null; rollback_data?: unknown[] | null;
}

const GOALS = [
  "Növeld a bevételemet.",
  "Készíts akciót a gyengén fogyó termékekre.",
  "Hozz vissza elhagyott kosaras vásárlókat.",
  "Javítsd a webshopom konverzióját.",
];

const TYPE_LABEL: Record<string, string> = {
  reprice: "Újraárazás", campaign: "Kampány", abtest: "A/B teszt",
  workflow: "Automatizmus", manual: "Kézi teendő",
};

const RISK_ICON: Record<string, string> = { alacsony: "🟢", "közepes": "🟡", magas: "🔴" };

const STATUS_LABEL: Record<string, string> = {
  proposed: "Jóváhagyásra vár", executed: "Végrehajtva", measured: "Lemérve",
  discarded: "Elvetve", rolled_back: "Visszavonva",
};


const PartnerActionPlansTab = ({ partnerId }: Props) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [goal, setGoal] = useState("Növeld a bevételemet.");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("partner_action_plans").select("*")
      .eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(20);
    setPlans((data as Plan[]) || []);
  }, [partnerId]);

  useEffect(() => { void load(); }, [load]);

  const call = async (action: string, extra: Record<string, unknown>, key: string) => {
    setBusy(key);
    try {
      const { data, error } = await supabase.functions.invoke("partner-action-engine", {
        body: { partner_id: partnerId, action, ...extra },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      await load();
      return data;
    } catch (e) {
      const msg = String((e as Error)?.message || "");
      toast({
        title: "AI hiba",
        description: msg.includes("rate_limit") ? "Túl sok kérés – próbáld később."
          : msg.includes("credits") ? "Elfogytak az AI kreditek." : msg || "Nem sikerült.",
        variant: "destructive",
      });
      return null;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-none p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">🎯 AI intézkedések</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Mondd meg a célt – az AI elemez, tervet készít, és jóváhagyás után végre is hajtja. Utána megméri az eredményt.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={goal} onChange={(e) => setGoal(e.target.value)} className="rounded-none" placeholder="Pl. Növeld a bevételemet." />
          <Button
            className="rounded-none"
            disabled={busy !== null || !goal.trim()}
            onClick={() => void call("propose", { goal }, "propose")}
          >
            {busy === "propose" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
            Terv készítése
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <Button key={g} size="sm" variant="outline" className="rounded-none text-xs" onClick={() => setGoal(g)}>{g}</Button>
          ))}
        </div>
      </Card>

      {plans.length === 0 && (
        <Card className="rounded-none p-6 text-center text-sm text-muted-foreground">
          Még nincs intézkedési terved. Írd be a célod és kérj tervet az AI-tól.
        </Card>
      )}

      {plans.map((plan) => (
        <Card key={plan.id} className="rounded-none p-4 space-y-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold">{plan.goal}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(plan.created_at).toLocaleString("hu-HU")}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="rounded-none">{STATUS_LABEL[plan.status] || plan.status}</Badge>
              {plan.risk_level && <Badge variant="outline" className="rounded-none">Kockázat: {plan.risk_level}</Badge>}
            </div>
          </div>

          {plan.summary && <p className="text-sm whitespace-pre-wrap">{plan.summary}</p>}
          {plan.expected_impact && (
            <p className="text-sm"><span className="text-muted-foreground">Várható hatás:</span> <strong>{plan.expected_impact}</strong></p>
          )}

          <div className="space-y-2">
            {(plan.steps || []).map((s) => (
              <div key={s.idx} className="border border-border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium">
                    {s.state === "done" && <CheckCircle2 className="h-4 w-4 inline mr-1 text-primary" />}
                    {s.state === "failed" && <XCircle className="h-4 w-4 inline mr-1 text-destructive" />}
                    {s.title}
                  </p>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="rounded-none text-[10px]">{TYPE_LABEL[s.type] || s.type}</Badge>
                    <Badge variant="secondary" className="rounded-none text-[10px]">Hatás: {s.impact}</Badge>
                  </div>
                </div>
                {s.why && <p className="text-xs text-muted-foreground">{s.why}</p>}
                {s.result && <p className="text-xs">{s.result}</p>}
              </div>
            ))}
          </div>

          {plan.result && plan.status === "measured" && (
            <div className="border border-border p-3 text-sm">
              <p className="font-medium mb-1">📊 Mérés</p>
              <p>Bevétel (30 nap): {Number(plan.result.revenue_30d || 0).toLocaleString("hu-HU")} Ft ({plan.result.revenue_change_pct > 0 ? "+" : ""}{plan.result.revenue_change_pct}%)</p>
              <p>Rendelések (30 nap): {plan.result.orders_30d} ({plan.result.orders_change_pct > 0 ? "+" : ""}{plan.result.orders_change_pct}%)</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {plan.status === "proposed" && (
              <>
                <Button size="sm" className="rounded-none" disabled={busy !== null}
                  onClick={() => void call("approve", { plan_id: plan.id }, `a-${plan.id}`)}>
                  {busy === `a-${plan.id}` ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Terv jóváhagyása
                </Button>
                <Button size="sm" variant="outline" className="rounded-none" disabled={busy !== null}
                  onClick={() => void call("discard", { plan_id: plan.id }, `d-${plan.id}`)}>
                  Elvetem
                </Button>
              </>
            )}
            {(plan.status === "executed" || plan.status === "measured") && (
              <Button size="sm" variant="outline" className="rounded-none" disabled={busy !== null}
                onClick={() => void call("measure", { plan_id: plan.id }, `m-${plan.id}`)}>
                {busy === `m-${plan.id}` ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
                Eredmény mérése
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default PartnerActionPlansTab;
