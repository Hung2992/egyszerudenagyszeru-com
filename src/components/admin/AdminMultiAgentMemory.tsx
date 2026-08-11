import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Brain, RefreshCw, Database } from "lucide-react";

const AdminMultiAgentMemory = () => {
  const [signals, setSignals] = useState<any[]>([]);
  const [collecting, setCollecting] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("ai_agent_memory_signals").select("*").order("success_score", { ascending: false }).limit(200);
    setLoading(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    setSignals(data || []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const collect = async () => {
    setCollecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-memory-collect", { body: {} });
      if (error) throw new Error(error instanceof Error ? error.message : "Hálózati hiba");
      if (data?.error) throw new Error(data.error);
      toast({ title: "Memória frissítve", description: `${data.collected} jel feldolgozva.` });
      await load();
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message, variant: "destructive" });
    } finally {
      setCollecting(false);
    }
  };

  const grouped = signals.reduce<Record<string, any[]>>((acc, s) => {
    const t = s.signal_type || "egyéb";
    acc[t] = acc[t] || [];
    acc[t].push(s);
    return acc;
  }, {});

  const typeLabel: Record<string, string> = {
    design_color_primary: "Színek (primary)",
    design_color_accent: "Színek (accent)",
    design_font_heading: "Betűtípusok",
    cta_text: "CTA szövegek",
    cta_url_type: "CTA események",
    workflow_trigger: "Workflow triggerek",
    ab_winner: "A/B nyertesek",
    project_type_score: "Projekttípus eredmények",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold uppercase tracking-wider">Multi-Agent Memory</h2>
        </div>
        <Button onClick={collect} disabled={collecting} className="rounded-none">
          <RefreshCw className={`h-4 w-4 mr-2 ${collecting ? "animate-spin" : ""}`} />
          {collecting ? "Gyűjtés…" : "Jelek összegyűjtése most"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Anonimizált, összesített tanulási réteg: mely dizájnok, CTA-k, workflow-k és projekttípusok teljesítenek jól a platformon. A memória visszacsatol az AI Web Creator, Marketing AI és Workflow ügynökökbe.
      </p>

      {loading && <p className="text-xs text-muted-foreground">Betöltés…</p>}

      <div className="space-y-4">
        {Object.keys(grouped).length === 0 && !loading && (
          <Card className="rounded-none border-foreground/20 p-6 text-center">
            <Database className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Még nincsenek memória-jelek. Gyűjtsd össze az első adatokat a fenti gombbal.</p>
          </Card>
        )}
        {Object.entries(grouped).map(([type, list]) => (
          <Card key={type} className="rounded-none border-foreground/20 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3">{typeLabel[type] || type}</h3>
            <div className="space-y-2">
              {list.slice(0, 10).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs border-b border-border/50 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-none text-[10px]">{s.feature_key}{s.feature_value ? ` = ${s.feature_value}` : ""}</Badge>
                    <span className="text-muted-foreground">{s.sample_count} minta · {s.source_count} forrás</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">megbízhatóság: {s.confidence ?? "?"}%</span>
                    <span className="font-bold text-accent">{s.success_score ?? "?"}/100</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminMultiAgentMemory;
