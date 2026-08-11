import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Bot, Check, X } from "lucide-react";

const AdminAiMarketplaceTab = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("ai_agent_marketplace").select("*").order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    setAgents(data || []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const api = async (action: string, agentId: string) => {
    const { data, error } = await supabase.functions.invoke("ai-agent-marketplace", { body: { action, agentId } });
    if (error) throw new Error(error instanceof Error ? error.message : "Hálózati hiba");
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const approve = async (id: string) => {
    try {
      await api("approve", id);
      toast({ title: "Jóváhagyva" });
      void load();
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message, variant: "destructive" });
    }
  };

  const reject = async (id: string) => {
    try {
      await api("reject", id);
      toast({ title: "Elutasítva" });
      void load();
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold uppercase tracking-wider">AI Marketplace admin</h2>
        </div>
        <Button variant="outline" onClick={() => void load()} className="rounded-none" disabled={loading}>
          Frissítés
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Itt jóváhagyhatod vagy elutasíthatod a partner által beküldött AI ügynököket. Csak a jóváhagyott ügynökök jelennek meg a partner piactéren.
      </p>

      {loading && <p className="text-xs text-muted-foreground">Betöltés…</p>}

      <div className="space-y-3">
        {agents.map((a) => (
          <Card key={a.id} className="rounded-none border-foreground/20 p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-sm flex items-center gap-2"><Bot className="h-3 w-3 text-accent" />{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.role} · {a.category}{a.industry ? ` · ${a.industry}` : ""} · {a.model}</div>
              </div>
              <Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "secondary"} className="rounded-none text-[10px]">
                {a.status === "approved" ? "Jóváhagyott" : a.status === "rejected" ? "Elutasítva" : "Jóváhagyásra vár"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{a.description}</p>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Rendszerprompt</summary>
              <div className="mt-2 p-2 bg-muted font-mono whitespace-pre-wrap">{a.system_prompt}</div>
            </details>
            {a.status === "pending_review" && (
              <div className="flex items-center gap-2">
                <Button size="sm" className="rounded-none" onClick={() => approve(a.id)}><Check className="h-3 w-3 mr-1" />Jóváhagyás</Button>
                <Button size="sm" variant="destructive" className="rounded-none" onClick={() => reject(a.id)}><X className="h-3 w-3 mr-1" />Elutasítás</Button>
              </div>
            )}
            <div className="text-[11px] text-muted-foreground">{a.install_count} telepítés · beküldve: {new Date(a.created_at).toLocaleDateString("hu-HU")}</div>
          </Card>
        ))}
        {agents.length === 0 && !loading && (
          <Card className="rounded-none border-foreground/20 p-6 text-center text-muted-foreground text-sm">
            Még nincs beküldött AI ügynök.
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminAiMarketplaceTab;
