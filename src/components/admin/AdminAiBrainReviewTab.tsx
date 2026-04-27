// AI Brain Review Queue - human approval for low-confidence learnings
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Brain, CheckCircle2, XCircle, Undo2, RefreshCw, Sparkles } from "lucide-react";

type PendingDoc = {
  id: string;
  title: string;
  summary: string | null;
  raw_text: string | null;
  source_type: string;
  domain: string;
  confidence: number;
  source_count: number;
  version: number;
  created_at: string;
};

const DOMAIN_COLORS: Record<string, string> = {
  product: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  marketing: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  customer: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30",
  operations: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
  general: "bg-muted text-muted-foreground border-border",
};

export const AdminAiBrainReviewTab = () => {
  const { toast } = useToast();
  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<{ learn_count: number; daily_limit: number; meta_count: number; meta_daily_limit: number } | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: pending }, { data: q }] = await Promise.all([
      supabase.rpc("get_pending_ai_reviews", { _limit: 100 }),
      supabase.from("ai_learn_quota").select("learn_count, daily_limit, meta_count, meta_daily_limit").eq("id", 1).maybeSingle(),
    ]);
    setDocs((pending as PendingDoc[]) || []);
    if (q) setQuota(q as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("approve_ai_knowledge", { _doc_id: id });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Jóváhagyva", description: "A tudás aktiválva." }); load(); }
  };

  const reject = async (id: string) => {
    const { error } = await supabase.rpc("reject_ai_knowledge", { _doc_id: id, _reason: "manual reject" });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "🗑️ Elutasítva", description: "A tudás archiválva." }); load(); }
  };

  const rollback = async (id: string) => {
    const { error } = await supabase.rpc("rollback_ai_knowledge", { _doc_id: id });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "↩️ Visszaállítva", description: "Korábbi verzió aktív." }); load(); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Agy – Review Queue
            </CardTitle>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Frissítés
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {quota && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <div className="text-xs text-muted-foreground">Mai tanulások</div>
                <div className="text-lg font-semibold">
                  {quota.learn_count} <span className="text-muted-foreground">/ {quota.daily_limit}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <div className="text-xs text-muted-foreground">Mai meta-szabályok</div>
                <div className="text-lg font-semibold">
                  {quota.meta_count} <span className="text-muted-foreground">/ {quota.meta_daily_limit}</span>
                </div>
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground p-3 rounded-md bg-accent/30 border border-border">
            <Sparkles className="w-4 h-4 inline mr-1.5" />
            Az alacsony megbízhatóságú vagy kevés forrásból szintetizált tudást itt hagyod jóvá vagy utasítod el. Ez akadályozza meg, hogy az AI rossz mintákat tanuljon meg.
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[600px] pr-3">
        <div className="space-y-3">
          {docs.length === 0 && !loading && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
                Nincs felülvizsgálatra váró tudás. Az AI tisztán dolgozik. ✨
              </CardContent>
            </Card>
          )}
          {docs.map((d) => (
            <Card key={d.id} className="border-l-4 border-l-amber-500/60">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-medium break-words">{d.title}</CardTitle>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="outline" className={DOMAIN_COLORS[d.domain] || DOMAIN_COLORS.general}>
                        {d.domain}
                      </Badge>
                      <Badge variant="outline">
                        {Math.round(d.confidence * 100)}% bizalom
                      </Badge>
                      <Badge variant="outline">
                        {d.source_count} forrás
                      </Badge>
                      <Badge variant="outline">v{d.version}</Badge>
                      <Badge variant="secondary" className="text-xs">{d.source_type}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {d.summary && <p className="text-sm font-medium">{d.summary}</p>}
                {d.raw_text && (
                  <pre className="text-xs whitespace-pre-wrap font-mono p-3 rounded-md bg-muted/40 border border-border max-h-60 overflow-auto">
                    {d.raw_text}
                  </pre>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={() => approve(d.id)} className="bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Jóváhagyás
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => reject(d.id)}>
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Elutasítás
                  </Button>
                  {d.version > 1 && (
                    <Button size="sm" variant="outline" onClick={() => rollback(d.id)}>
                      <Undo2 className="w-4 h-4 mr-1.5" />
                      Rollback v{d.version - 1}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AdminAiBrainReviewTab;
