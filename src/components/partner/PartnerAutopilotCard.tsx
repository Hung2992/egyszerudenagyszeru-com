// AI Business Autopilot beállítások: mit végezhet el az AI önállóan.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, Bot, Save, Play } from "lucide-react";

interface Props { partnerId: string; onPlan?: () => void }

interface Settings {
  enabled: boolean;
  goals: string[];
  auto_allowed_types: string[];
  max_risk_level: string;
  max_price_change_pct: number;
  max_auto_actions_per_day: number;
  last_run_at: string | null;
}

const DEFAULTS: Settings = {
  enabled: false,
  goals: ["Növeld a bevételemet alacsony kockázatú lépésekkel."],
  auto_allowed_types: ["campaign", "abtest"],
  max_risk_level: "alacsony",
  max_price_change_pct: 10,
  max_auto_actions_per_day: 3,
  last_run_at: null,
};

const TYPES: { key: string; label: string; risk: string }[] = [
  { key: "campaign", label: "Kampány piszkozat", risk: "🟢 alacsony" },
  { key: "abtest", label: "A/B teszt indítása", risk: "🟢 alacsony" },
  { key: "workflow", label: "Automatizmus (inaktív)", risk: "🟢 alacsony" },
  { key: "reprice", label: "Termék újraárazás", risk: "🟡 jóváhagyás javasolt" },
];

const PartnerAutopilotCard = ({ partnerId, onPlan }: Props) => {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("partner_autopilot_settings").select("*").eq("partner_id", partnerId).maybeSingle();
    if (data) setS({ ...DEFAULTS, ...(data as unknown as Settings) });
  }, [partnerId]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setBusy("save");
    const { error } = await supabase.from("partner_autopilot_settings").upsert({
      partner_id: partnerId,
      enabled: s.enabled,
      goals: s.goals,
      auto_allowed_types: s.auto_allowed_types,
      max_risk_level: s.max_risk_level,
      max_price_change_pct: s.max_price_change_pct,
      max_auto_actions_per_day: s.max_auto_actions_per_day,
    }, { onConflict: "partner_id" });
    setBusy(null);
    toast(error
      ? { title: "Mentés sikertelen", description: error.message, variant: "destructive" }
      : { title: "Autopilot beállítások mentve" });
    if (!error) void load();
  };

  const run = async () => {
    setBusy("run");
    const { data, error } = await supabase.functions.invoke("partner-action-engine", {
      body: { partner_id: partnerId, action: "autopilot_run" },
    });
    setBusy(null);
    if (error || data?.error) {
      const msg = String(data?.error || error?.message || "");
      toast({
        title: "Autopilot hiba",
        description: msg.includes("disabled") ? "Előbb kapcsold be az autopilotot."
          : msg.includes("daily_limit") ? "Elérted a mai automatikus intézkedési limitet."
          : msg || "Nem sikerült.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Autopilot terv elkészült", description: "Nézd meg az intézkedési tervek listáját." });
    onPlan?.();
    void load();
  };

  const toggleType = (k: string) =>
    setS((v) => ({
      ...v,
      auto_allowed_types: v.auto_allowed_types.includes(k)
        ? v.auto_allowed_types.filter((t) => t !== k)
        : [...v.auto_allowed_types, k],
    }));

  return (
    <Card className="rounded-none p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">🚀 AI Business Autopilot</h3>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="ap-enabled" className="text-xs text-muted-foreground">Bekapcsolva</Label>
          <Switch id="ap-enabled" checked={s.enabled} onCheckedChange={(v) => setS((p) => ({ ...p, enabled: v }))} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        🟢 Olvasás, elemzés, javaslat: automatikus · 🟡 Kockázatos üzleti változtatás: jóváhagyás · 🔴 Jogi/pénzügyi művelet: mindig emberi kontroll.
      </p>

      <div className="space-y-2">
        <Label className="text-xs">Üzleti cél</Label>
        <Input
          className="rounded-none"
          value={s.goals[0] || ""}
          onChange={(e) => setS((p) => ({ ...p, goals: [e.target.value] }))}
          placeholder="Pl. Növeld a bevételemet alacsony kockázatú lépésekkel."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Jóváhagyás nélkül végrehajtható műveletek</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {TYPES.map((t) => (
            <label key={t.key} className="flex items-center gap-2 border border-border p-2 text-sm cursor-pointer">
              <Checkbox checked={s.auto_allowed_types.includes(t.key)} onCheckedChange={() => toggleType(t.key)} />
              <span className="flex-1">{t.label}</span>
              <Badge variant="outline" className="rounded-none text-[10px]">{t.risk}</Badge>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Max. árváltozás (%)</Label>
          <Input type="number" min={1} max={25} className="rounded-none"
            value={s.max_price_change_pct}
            onChange={(e) => setS((p) => ({ ...p, max_price_change_pct: Number(e.target.value) }))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max. automatikus intézkedés / nap</Label>
          <Input type="number" min={1} max={10} className="rounded-none"
            value={s.max_auto_actions_per_day}
            onChange={(e) => setS((p) => ({ ...p, max_auto_actions_per_day: Number(e.target.value) }))} />
        </div>
      </div>

      {s.last_run_at && (
        <p className="text-xs text-muted-foreground">
          Utolsó autopilot futás: {new Date(s.last_run_at).toLocaleString("hu-HU")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="rounded-none" disabled={busy !== null} onClick={() => void save()}>
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Mentés
        </Button>
        <Button size="sm" variant="outline" className="rounded-none" disabled={busy !== null || !s.enabled} onClick={() => void run()}>
          {busy === "run" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
          Autopilot futtatása most
        </Button>
      </div>
    </Card>
  );
};

export default PartnerAutopilotCard;
