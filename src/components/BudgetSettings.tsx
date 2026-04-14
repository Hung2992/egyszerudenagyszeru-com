import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Wallet, Save, AlertTriangle } from "lucide-react";

interface Props { userId: string; }

const BudgetSettings = ({ userId }: Props) => {
  const [budget, setBudget] = useState("");
  const [threshold, setThreshold] = useState("80");
  const [currentSpent, setCurrentSpent] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: row } = await (supabase.from("budget_settings" as any) as any)
        .select("*").eq("user_id", userId).maybeSingle();
      if (row) {
        setBudget(row.monthly_budget?.toString() || "");
        setThreshold(row.alert_threshold_percent?.toString() || "80");
        setCurrentSpent(row.current_spent || 0);
        setIsActive(row.is_active ?? true);
      }
      setLoaded(true);
    };
    fetch();
  }, [userId]);

  const save = async () => {
    setSaving(true);
    await (supabase.from("budget_settings" as any) as any).upsert({
      user_id: userId,
      monthly_budget: parseFloat(budget) || 0,
      alert_threshold_percent: parseInt(threshold) || 80,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    toast({ title: "Költségkeret beállítások mentve! ✓" });
    setSaving(false);
  };

  if (!loaded) return null;

  const budgetNum = parseFloat(budget) || 0;
  const pct = budgetNum > 0 ? Math.min((currentSpent / budgetNum) * 100, 100) : 0;
  const thresholdNum = parseInt(threshold) || 80;
  const isOverThreshold = pct >= thresholdNum;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Wallet className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Költségkeret figyelő</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-xs text-foreground">Költségkeret aktív</span>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Havi keret (Ft)</p>
          <Input value={budget} onChange={e => setBudget(e.target.value)}
            type="number" placeholder="50000" className="rounded-none h-9 text-xs" />
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Figyelmeztetés küszöb (%)</p>
          <Input value={threshold} onChange={e => setThreshold(e.target.value)}
            type="number" min="1" max="100" placeholder="80" className="rounded-none h-9 text-xs" />
        </div>

        {budgetNum > 0 && (
          <div className="border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Elköltve ebben a hónapban</span>
              <span className={`text-sm font-bold ${isOverThreshold ? "text-destructive" : "text-foreground"}`}>
                {currentSpent.toLocaleString()} Ft
              </span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${isOverThreshold ? "bg-destructive" : "bg-accent"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>{Math.round(pct)}% felhasználva</span>
              <span>{budgetNum.toLocaleString()} Ft keret</span>
            </div>
            {isOverThreshold && (
              <div className="flex items-center gap-1.5 text-[10px] text-destructive">
                <AlertTriangle className="h-3 w-3" />
                Elérted a költségkeret {thresholdNum}%-át!
              </div>
            )}
          </div>
        )}
      </div>

      <Button onClick={save} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
        <Save className="h-3 w-3 mr-1" />
        {saving ? "Mentés..." : "Keret mentése"}
      </Button>
    </div>
  );
};

export default BudgetSettings;
