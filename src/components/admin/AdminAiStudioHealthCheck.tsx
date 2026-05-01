import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Activity, RefreshCw } from "lucide-react";

interface Check {
  name: string;
  category: "secret" | "endpoint" | "storage" | "external";
  status: "ok" | "fail" | "warn";
  detail: string;
  duration_ms: number;
}

interface Result {
  summary: { total: number; ok: number; fail: number; warn: number };
  checks: Check[];
  ran_at: string;
}

const categoryLabel: Record<Check["category"], string> = {
  secret: "API Kulcsok",
  external: "Külső API hitelesítés",
  storage: "Adatbázis & Tárhely",
  endpoint: "Edge Function végpontok",
};

export default function AdminAiStudioHealthCheck() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-studio-health-check", {
        body: {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as Result);
      const s = (data as Result).summary;
      toast({
        title: s.fail === 0 ? "✓ Minden végpont működik" : `✗ ${s.fail} hiba`,
        description: `${s.ok}/${s.total} OK`,
        variant: s.fail === 0 ? "default" : "destructive",
      });
    } catch (e: any) {
      toast({
        title: "Health check hiba",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const grouped = result?.checks.reduce<Record<string, Check[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {}) ?? {};

  return (
    <Card className="p-4 space-y-4 bg-card border-border">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-black uppercase tracking-wider text-lg">
            AI Studio – Végpont Health Check
          </h3>
        </div>
        <Button
          onClick={run}
          disabled={loading}
          className="uppercase font-black"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Tesztelés...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" /> Teszt indítása
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Végigteszteli az összes AI Marketing Stúdió komponenst: API kulcsok érvényessége (élő ping
        ElevenLabs / Replicate / Lovable AI), adatbázis táblák, storage bucket, és edge function
        végpontok deploy állapota. Ha valami pirosan jön, azonnal látod a pontos hibát.
      </p>

      {result && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-border p-3 text-center">
              <div className="text-2xl font-black text-green-500">{result.summary.ok}</div>
              <div className="text-[10px] uppercase text-muted-foreground">OK</div>
            </div>
            <div className="border border-border p-3 text-center">
              <div className="text-2xl font-black text-destructive">{result.summary.fail}</div>
              <div className="text-[10px] uppercase text-muted-foreground">Hiba</div>
            </div>
            <div className="border border-border p-3 text-center">
              <div className="text-2xl font-black">{result.summary.total}</div>
              <div className="text-[10px] uppercase text-muted-foreground">Összesen</div>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="space-y-1">
                <div className="text-xs uppercase font-bold text-muted-foreground">
                  {categoryLabel[cat as Check["category"]]}
                </div>
                {items.map((c, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 border p-2 ${
                      c.status === "ok"
                        ? "border-green-500/30 bg-green-500/5"
                        : c.status === "warn"
                        ? "border-yellow-500/30 bg-yellow-500/5"
                        : "border-destructive/30 bg-destructive/5"
                    }`}
                  >
                    {c.status === "ok" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    ) : c.status === "warn" ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-sm truncate">{c.name}</div>
                        {c.duration_ms > 0 && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {c.duration_ms}ms
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground break-words">{c.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="text-[10px] text-muted-foreground text-right">
            Utolsó futás: {new Date(result.ran_at).toLocaleString("hu-HU")}
          </div>
        </>
      )}
    </Card>
  );
}
